//go:build linux

package main

import (
	"context"
	"errors"
	"io"
	"kafka-tool/backend/server"
	"net/http"
	"testing"
	"time"
)

func TestAPIBridgePreservesRequestAndErrorResponse(t *testing.T) {
	api := newLinuxAPIBridge(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if r.Method != "POST" || r.URL.Path != "/api/v1/connections/test" || string(body) != `{"brokers":["broker:9092"]}` || r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("unexpected request: %s %s %s", r.Method, r.URL, body)
		}
		w.WriteHeader(502)
		_, _ = w.Write([]byte(`{"message":"broker unavailable"}`))
	}))
	result, err := api.Request(api.BeginRequest(), "POST", "/api/v1/connections/test", `{"brokers":["broker:9092"]}`)
	if err != nil || result.Status != 502 || result.Body != `{"message":"broker unavailable"}` {
		t.Fatalf("response = %+v, error = %v", result, err)
	}
}

func TestAPIBridgeRejectsNonAPIRequests(t *testing.T) {
	api := newLinuxAPIBridge(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Fatal("unexpected handler call") }))
	for _, path := range []string{"https://example.com/api/v1/test", "/index.html", "//example.com/api/v1/test"} {
		if _, err := api.Request(api.BeginRequest(), "GET", path, ""); err == nil {
			t.Errorf("accepted %q", path)
		}
	}
	if _, err := api.Request(api.BeginRequest(), "DELETE", "/api/v1/test", ""); err == nil {
		t.Fatal("accepted DELETE")
	}
}

func TestLinuxBridgeRealRoutes(t *testing.T) {
	api := newLinuxAPIBridge(server.NewHandler())
	health, err := api.Request(api.BeginRequest(), "GET", "/api/v1/health", "")
	if err != nil || health.Status != 200 {
		t.Fatalf("health = %+v, %v", health, err)
	}
	invalid, err := api.Request(api.BeginRequest(), "POST", "/api/v1/connections/test", "{}")
	if err != nil || invalid.Status != 400 {
		t.Fatalf("validation = %+v, %v", invalid, err)
	}
	missing, err := api.Request(api.BeginRequest(), "POST", "/api/v1/missing", "{}")
	if err != nil || missing.Status != 404 {
		t.Fatalf("missing = %+v, %v", missing, err)
	}
	if len(api.requests) != 0 {
		t.Fatal("completed requests not released")
	}
}

func TestLinuxBridgeCancellation(t *testing.T) {
	entered := make(chan struct{})
	canceled := make(chan struct{})
	api := newLinuxAPIBridge(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(entered)
		<-r.Context().Done()
		close(canceled)
	}))
	id := api.BeginRequest()
	done := make(chan struct{})
	go func() { defer close(done); _, _ = api.Request(id, "POST", "/api/v1/topics/list", "{}") }()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("handler did not start")
	}
	api.CancelRequest(id)
	select {
	case <-canceled:
	case <-time.After(time.Second):
		t.Fatal("handler context not canceled")
	}
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("request did not finish")
	}
	if len(api.requests) != 0 {
		t.Fatal("canceled request not released")
	}
	// Cancel arriving before dispatch must prevent work, rather than being lost.
	id = api.BeginRequest()
	api.CancelRequest(id)
	if _, err := api.Request(id, "POST", "/api/v1/topics/list", "{}"); !errors.Is(err, context.Canceled) {
		t.Fatalf("error = %v", err)
	}
	if len(api.requests) != 0 {
		t.Fatal("pre-canceled request not released")
	}
}

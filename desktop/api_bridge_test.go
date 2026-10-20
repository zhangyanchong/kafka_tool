package main

import (
	"io"
	"net/http"
	"testing"
)

func TestAPIBridgePreservesRequestAndErrorResponse(t *testing.T) {
	api := NewAPIBridge(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if r.Method != "POST" || r.URL.Path != "/api/v1/connections/test" || string(body) != `{"brokers":["broker:9092"]}` || r.Header.Get("Content-Type") != "application/json" {
			t.Fatalf("unexpected request: %s %s %s", r.Method, r.URL, body)
		}
		w.WriteHeader(502)
		_, _ = w.Write([]byte(`{"message":"broker unavailable"}`))
	}))
	result, err := api.Request("POST", "/api/v1/connections/test", `{"brokers":["broker:9092"]}`)
	if err != nil || result.Status != 502 || result.Body != `{"message":"broker unavailable"}` {
		t.Fatalf("response = %+v, error = %v", result, err)
	}
}

func TestAPIBridgeRejectsNonAPIRequests(t *testing.T) {
	api := NewAPIBridge(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { t.Fatal("unexpected handler call") }))
	for _, path := range []string{"https://example.com/api/v1/test", "/index.html", "//example.com/api/v1/test"} {
		if _, err := api.Request("GET", path, ""); err == nil {
			t.Errorf("accepted %q", path)
		}
	}
	if _, err := api.Request("DELETE", "/api/v1/test", ""); err == nil {
		t.Fatal("accepted DELETE")
	}
}

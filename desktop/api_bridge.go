package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
)

// APIBridge bypasses the Linux WebKit custom scheme, which cannot carry POST
// bodies or error status codes in Wails' legacy compatibility mode.
type APIBridge struct{ handler http.Handler }

type APIResponse struct {
	Status int    `json:"status"`
	Body   string `json:"body"`
}

func NewAPIBridge(handler http.Handler) *APIBridge { return &APIBridge{handler: handler} }

func (a *APIBridge) Request(method, path, body string) (APIResponse, error) {
	u, err := url.ParseRequestURI(path)
	if err != nil || u.IsAbs() || u.Host != "" || !strings.HasPrefix(u.Path, "/api/v1/") {
		return APIResponse{}, fmt.Errorf("invalid API path")
	}
	if method != http.MethodGet && method != http.MethodPost {
		return APIResponse{}, fmt.Errorf("unsupported API method")
	}
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	a.handler.ServeHTTP(recorder, req)
	return APIResponse{Status: recorder.Code, Body: recorder.Body.String()}, nil
}

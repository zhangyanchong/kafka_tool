package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthRouteContract(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	response := httptest.NewRecorder()

	NewHandler().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if got, want := response.Body.String(), "{\"success\":true,\"message\":\"ok\"}\n"; got != want {
		t.Fatalf("body = %q, want %q", got, want)
	}
}

func TestTopicsRouteKeepsConnectionValidationContract(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/topics/list", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	NewHandler().ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
	if got, want := response.Body.String(), "{\"success\":false,\"message\":\"请至少填写一个 Broker 地址\"}\n"; got != want {
		t.Fatalf("body = %q, want %q", got, want)
	}
}

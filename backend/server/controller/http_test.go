package controller

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeJSONAcceptsTwentyMiBMessage(t *testing.T) {
	value := strings.Repeat("x", 20<<20)
	request := httptest.NewRequest("POST", "/", strings.NewReader(`{"value":"`+value+`"}`))
	var result struct {
		Value string `json:"value"`
	}
	if err := decodeJSON(httptest.NewRecorder(), request, &result); err != nil {
		t.Fatal(err)
	}
	if result.Value != value {
		t.Fatal("message was truncated")
	}
}

func TestDecodeJSONReportsSizeLimit(t *testing.T) {
	request := httptest.NewRequest("POST", "/", strings.NewReader(`{"value":"`+strings.Repeat("x", maxRequestBodyBytes)+`"}`))
	var result any
	err := decodeJSON(httptest.NewRecorder(), request, &result)
	if err == nil || !strings.Contains(err.Error(), "64 MiB") {
		t.Fatalf("expected size error, got %v", err)
	}
}

func TestDecodeJSONReportsMalformedJSON(t *testing.T) {
	request := httptest.NewRequest("POST", "/", strings.NewReader(`{"value":`))
	var result any
	err := decodeJSON(httptest.NewRecorder(), request, &result)
	if err == nil || err.Error() != "请求参数格式不正确" {
		t.Fatalf("expected syntax error, got %v", err)
	}
}

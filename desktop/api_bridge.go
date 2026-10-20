//go:build linux

package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"sync"
)

// LinuxAPIBridge avoids WebKit's custom-scheme POST limitations on older UOS
// installations. Windows and macOS do not compile or bind this type.
type LinuxAPIBridge struct {
	handler  http.Handler
	mu       sync.Mutex
	nextID   uint64
	requests map[string]*apiRequest
}

type apiRequest struct {
	ctx     context.Context
	cancel  context.CancelFunc
	started bool
}

type APIResponse struct {
	Status int    `json:"status"`
	Body   string `json:"body"`
}

func newLinuxAPIBridge(handler http.Handler) *LinuxAPIBridge {
	return &LinuxAPIBridge{handler: handler, requests: make(map[string]*apiRequest)}
}

// Register cancellation before dispatch, so an abort cannot race ahead of Request.
func (a *LinuxAPIBridge) BeginRequest() string {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.nextID++
	id := strconv.FormatUint(a.nextID, 10)
	ctx, cancel := context.WithCancel(context.Background())
	a.requests[id] = &apiRequest{ctx: ctx, cancel: cancel}
	return id
}

func (a *LinuxAPIBridge) CancelRequest(id string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if request := a.requests[id]; request != nil {
		request.cancel()
	}
}

func (a *LinuxAPIBridge) Request(id, method, path, body string) (APIResponse, error) {
	a.mu.Lock()
	request := a.requests[id]
	if request == nil || request.started {
		a.mu.Unlock()
		return APIResponse{}, fmt.Errorf("unknown or already started API request")
	}
	request.started = true
	a.mu.Unlock()
	defer func() {
		request.cancel()
		a.mu.Lock()
		delete(a.requests, id)
		a.mu.Unlock()
	}()
	if err := request.ctx.Err(); err != nil {
		return APIResponse{}, err
	}
	u, err := url.ParseRequestURI(path)
	if err != nil || u.IsAbs() || u.Host != "" || !strings.HasPrefix(path, "/api/v1/") || !strings.HasPrefix(u.Path, "/api/v1/") {
		return APIResponse{}, fmt.Errorf("invalid API path")
	}
	if method != http.MethodGet && method != http.MethodPost {
		return APIResponse{}, fmt.Errorf("unsupported API method")
	}
	req := httptest.NewRequest(method, path, strings.NewReader(body)).WithContext(request.ctx)
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	a.handler.ServeHTTP(recorder, req)
	return APIResponse{Status: recorder.Code, Body: recorder.Body.String()}, nil
}

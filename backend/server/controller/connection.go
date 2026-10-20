package controller

import (
	"log"
	"net/http"
	"strings"
	"time"

	"kafka-tool/backend/server/logic"
	"kafka-tool/backend/server/model"
)

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, model.APIResponse{Success: true, Message: "ok"})
}

func (h *Handler) TestConnection(w http.ResponseWriter, r *http.Request) {
	var req model.ConnectionRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	if err := model.ValidateConnection(req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	started := time.Now()
	log.Printf("connection_test started brokers=%q protocol=%s ssh=%t", req.Brokers, req.SecurityProtocol, req.SSHEnabled)
	response, operationErr := logic.TestConnection(r.Context(), req)
	if operationErr != nil {
		message := operationErr.Error()
		for _, secret := range []string{req.Password, req.SSHPassword} {
			if secret != "" {
				message = strings.ReplaceAll(message, secret, "[已隐藏]")
			}
		}
		log.Printf("connection_test failed duration=%s status=%d error=%s", time.Since(started), operationErr.StatusCode, message)
		writeJSON(w, operationErr.StatusCode, model.APIResponse{Message: message, DurationMS: time.Since(started).Milliseconds()})
		return
	}
	log.Printf("connection_test succeeded duration=%s", time.Since(started))
	writeJSON(w, http.StatusOK, response)
}

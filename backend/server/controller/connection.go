package controller

import (
	"net/http"

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
	response, operationErr := logic.TestConnection(r.Context(), req)
	if operationErr != nil {
		writeJSON(w, operationErr.StatusCode, model.APIResponse{Message: operationErr.Error(), DurationMS: response.DurationMS})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

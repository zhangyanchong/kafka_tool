package controller

import (
	"context"
	"net/http"

	"kafka-tool/backend/server/logic"
	"kafka-tool/backend/server/model"
)

func (h *Handler) MetricSnapshot(w http.ResponseWriter, r *http.Request) {
	var req model.MetricSnapshotRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	if err := model.NormalizeMetricSnapshot(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	client, timeout, err := logic.OpenClient(req.ConnectionRequest)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	defer client.Close()
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	defer cancel()
	response, err := logic.ReadMetricSnapshot(ctx, client, req)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

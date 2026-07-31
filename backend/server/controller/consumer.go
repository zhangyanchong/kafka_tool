package controller

import (
	"net/http"
	"strings"

	"kafka-tool/backend/server/logic"
	"kafka-tool/backend/server/model"
)

func (h *Handler) ListConsumers(w http.ResponseWriter, r *http.Request) {
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.FindConsumers(ctx, client)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) ListConsumerPartitions(w http.ResponseWriter, r *http.Request) {
	groupID := strings.TrimSpace(r.PathValue("groupID"))
	if groupID == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Consumer Group 不能为空"})
		return
	}
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.FindConsumerPartitions(ctx, client, groupID)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

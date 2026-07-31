package controller

import (
	"context"
	"net/http"

	"kafka-tool/backend/server/logic"
	"kafka-tool/backend/server/model"

	"github.com/twmb/franz-go/pkg/kgo"
)

func openClientFromRequest(w http.ResponseWriter, r *http.Request) (model.ConnectionRequest, *kgo.Client, context.Context, context.CancelFunc, error) {
	var req model.ConnectionRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return req, nil, nil, nil, err
	}
	if err := model.ValidateConnection(req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return req, nil, nil, nil, err
	}
	client, timeout, err := logic.OpenClient(req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return req, nil, nil, nil, err
	}
	ctx, cancel := context.WithTimeout(r.Context(), timeout)
	return req, client, ctx, cancel, nil
}

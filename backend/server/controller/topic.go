package controller

import (
	"context"
	"net/http"
	"strings"
	"time"

	"kafka-tool/backend/server/logic"
	"kafka-tool/backend/server/model"
)

func (h *Handler) ListTopics(w http.ResponseWriter, r *http.Request) {
	req, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	_ = req
	defer cancel()
	defer client.Close()
	response, err := logic.FindTopics(ctx, client)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) TopicDeletionPlan(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.FindTopicDeletionPlan(ctx, client, topic)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) DeleteTopic(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.DeleteTopicAndConsumerGroups(ctx, client, topic)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) ProduceTopicMessage(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	var req model.ProduceMessageRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	if err := model.NormalizeProduceMessage(&req); err != nil {
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
	response, err := logic.ProduceTopicMessage(ctx, client, topic, req.Key, req.Value)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) RecreateTopic(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.RecreateTopicAndConsumerGroups(ctx, client, topic)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) CreateTopic(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	var req model.CreateTopicRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	if err := model.NormalizeCreateTopic(&req); err != nil {
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
	response, err := logic.CreateTopic(ctx, client, topic, req.Partitions, req.ReplicationFactor)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: logic.FriendlyKafkaError(err)})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) TopicHealth(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	_, client, ctx, cancel, err := openClientFromRequest(w, r)
	if err != nil {
		return
	}
	defer cancel()
	defer client.Close()
	response, err := logic.FindTopicHealth(ctx, client, topic)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) SearchTopicMessages(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	var req model.MessageSearchRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	fromTime, toTime, err := model.NormalizeMessageSearch(&req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	client, timeout, err := logic.OpenClient(req.ConnectionRequest)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	defer client.Close()
	// 内容检索可能需要顺序读取多个分区。即使旧连接保存的是较短的
	// 建连超时，也给予检索至少一分钟，避免返回不完整的结果。
	searchTimeout := timeout
	if searchTimeout < time.Minute {
		searchTimeout = time.Minute
	}
	ctx, cancel := context.WithTimeout(r.Context(), searchTimeout)
	defer cancel()
	response, err := logic.FindMessages(ctx, client, topic, req, fromTime, toTime)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

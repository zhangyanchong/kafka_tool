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

func (h *Handler) EstimateTopicMessages(w http.ResponseWriter, r *http.Request) {
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
	response, err := logic.EstimateTopicMessages(ctx, client, topic)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) ReadTopicMessage(w http.ResponseWriter, r *http.Request) {
	topic := strings.TrimSpace(r.PathValue("topic"))
	if topic == "" {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: "Topic 不能为空"})
		return
	}
	var req model.MessageReadRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: err.Error()})
		return
	}
	if err := model.ValidateConnection(req.ConnectionRequest); err != nil || req.Partition < 0 || req.Offset < 0 {
		message := "分区和 Offset 必须为非负数"
		if err != nil {
			message = err.Error()
		}
		writeJSON(w, http.StatusBadRequest, model.APIResponse{Message: message})
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
	item, err := logic.ReadMessage(ctx, client, topic, req.Partition, req.Offset)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, item)
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
	searchTimeout := messageSearchTimeout(timeout, req.ScanLimit)
	ctx, cancel := context.WithTimeout(r.Context(), searchTimeout)
	defer cancel()
	response, err := logic.FindMessages(ctx, client, topic, req, fromTime, toTime)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, model.APIResponse{Message: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, response)
}

type messageSearchTaskStartResponse struct {
	TaskID string `json:"taskId"`
}

type messageSearchTaskStatusResponse struct {
	Scanned   int                          `json:"scanned"`
	ElapsedMS int64                        `json:"elapsedMs"`
	Done      bool                         `json:"done"`
	Canceled  bool                         `json:"canceled"`
	Error     string                       `json:"error,omitempty"`
	Response  *model.MessageSearchResponse `json:"response,omitempty"`
}

func (h *Handler) StartTopicMessageSearch(w http.ResponseWriter, r *http.Request) {
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
	taskID, err := newMessageSearchTaskID()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, model.APIResponse{Message: "创建搜索任务失败"})
		return
	}
	searchTimeout := messageSearchTimeout(time.Duration(req.ConnectionTimeoutS)*time.Second, req.ScanLimit)
	ctx, cancel := context.WithTimeout(context.Background(), searchTimeout)
	task := &messageSearchTask{cancel: cancel, startedAt: time.Now()}
	h.searchTasks.Store(taskID, task)
	go h.runTopicMessageSearch(taskID, task, ctx, topic, req, fromTime, toTime)
	writeJSON(w, http.StatusAccepted, messageSearchTaskStartResponse{TaskID: taskID})
}

func (h *Handler) runTopicMessageSearch(taskID string, task *messageSearchTask, ctx context.Context, topic string, req model.MessageSearchRequest, fromTime, toTime time.Time) {
	defer task.cancel()
	defer h.deleteSearchTaskLater(taskID)
	client, timeout, err := logic.OpenClient(req.ConnectionRequest)
	if err == nil {
		defer client.Close()
		if timeout > 0 {
			var cancel context.CancelFunc
			ctx, cancel = context.WithTimeout(ctx, messageSearchTimeout(timeout, req.ScanLimit))
			defer cancel()
		}
	}
	var response model.MessageSearchResponse
	if err == nil {
		response, err = logic.FindMessagesWithProgress(ctx, client, topic, req, fromTime, toTime, func(scanned int) {
			task.mu.Lock()
			task.scanned = scanned
			task.mu.Unlock()
		})
	}
	task.mu.Lock()
	task.done = true
	task.finishedAt = time.Now()
	task.canceled = ctx.Err() == context.Canceled
	if err != nil && !task.canceled {
		task.err = err.Error()
	} else if err == nil {
		task.scanned = response.Scanned
		task.response = &response
	}
	task.mu.Unlock()
}

func (h *Handler) TopicMessageSearchStatus(w http.ResponseWriter, r *http.Request) {
	taskID := strings.TrimSpace(r.PathValue("taskID"))
	value, ok := h.searchTasks.Load(taskID)
	if !ok {
		writeJSON(w, http.StatusNotFound, model.APIResponse{Message: "搜索任务不存在或已过期"})
		return
	}
	task := value.(*messageSearchTask)
	task.mu.RLock()
	endedAt := time.Now()
	if !task.finishedAt.IsZero() {
		endedAt = task.finishedAt
	}
	response := messageSearchTaskStatusResponse{
		Scanned: task.scanned, ElapsedMS: endedAt.Sub(task.startedAt).Milliseconds(),
		Done: task.done, Canceled: task.canceled, Error: task.err, Response: task.response,
	}
	task.mu.RUnlock()
	writeJSON(w, http.StatusOK, response)
}

func (h *Handler) CancelTopicMessageSearch(w http.ResponseWriter, r *http.Request) {
	taskID := strings.TrimSpace(r.PathValue("taskID"))
	value, ok := h.searchTasks.Load(taskID)
	if !ok {
		writeJSON(w, http.StatusNotFound, model.APIResponse{Message: "搜索任务不存在或已过期"})
		return
	}
	task := value.(*messageSearchTask)
	task.cancel()
	writeJSON(w, http.StatusOK, model.APIResponse{Success: true, Message: "已请求取消搜索"})
}

// messageSearchTimeout gives larger scans enough time to finish all assigned
// partitions before returning a timeout. A configured connection timeout can
// still extend this value.
func messageSearchTimeout(connectionTimeout time.Duration, scanLimit int) time.Duration {
	minutes := (scanLimit + 99999) / 100000
	minimum := time.Duration(minutes) * time.Minute
	if minimum < 10*time.Minute {
		minimum = 10 * time.Minute
	}
	if connectionTimeout > minimum {
		return connectionTimeout
	}
	return minimum
}

// Package controller adapts HTTP requests to Kafka use cases.
package controller

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"

	"kafka-tool/backend/server/model"
)

type messageSearchTask struct {
	mu         sync.RWMutex
	cancel     context.CancelFunc
	scanned    int
	done       bool
	canceled   bool
	startedAt  time.Time
	finishedAt time.Time
	response   *model.MessageSearchResponse
	err        string
}

type Handler struct {
	searchTasks sync.Map // map[string]*messageSearchTask
}

func New() *Handler { return &Handler{} }

func newMessageSearchTaskID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func (h *Handler) deleteSearchTaskLater(id string) {
	time.AfterFunc(2*time.Minute, func() { h.searchTasks.Delete(id) })
}

// Package controller adapts HTTP requests to read-only Kafka use cases.
package controller

type Handler struct{}

func New() *Handler { return &Handler{} }

// Package controller adapts HTTP requests to Kafka use cases.
package controller

type Handler struct{}

func New() *Handler { return &Handler{} }

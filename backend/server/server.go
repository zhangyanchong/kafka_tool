// Package server assembles the HTTP API. Route, controller, logic, and model
// concerns live in their respective subdirectories.
package server

import (
	"net/http"

	"kafka-tool/backend/server/controller"
	"kafka-tool/backend/server/route"
)

// NewHandler creates the complete versioned API router.
func NewHandler() http.Handler {
	return route.New(controller.New())
}

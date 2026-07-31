// Package route defines the HTTP route table and transport middleware.
package route

import (
	"net/http"

	"kafka-tool/backend/server/controller"
)

func New(handler *controller.Handler) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", handler.Health)
	mux.HandleFunc("POST /api/v1/connections/test", handler.TestConnection)
	mux.HandleFunc("POST /api/v1/topics/list", handler.ListTopics)
	mux.HandleFunc("POST /api/v1/topics/{topic}/health", handler.TopicHealth)
	mux.HandleFunc("POST /api/v1/topics/{topic}/messages/search", handler.SearchTopicMessages)
	mux.HandleFunc("POST /api/v1/consumers/list", handler.ListConsumers)
	mux.HandleFunc("POST /api/v1/consumers/{groupID}/partitions", handler.ListConsumerPartitions)
	mux.HandleFunc("POST /api/v1/metrics/snapshot", handler.MetricSnapshot)
	return withCORS(mux)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

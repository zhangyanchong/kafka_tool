package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

// Allow JSON escaping and request metadata around messages of at least 20 MiB.
const maxRequestBodyBytes = 64 << 20

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) error {
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)).Decode(target); err != nil {
		var sizeError *http.MaxBytesError
		if errors.As(err, &sizeError) {
			return fmt.Errorf("请求内容过大，最大支持 %d MiB（包含消息和请求参数）", maxRequestBodyBytes>>20)
		}
		return errors.New("请求参数格式不正确")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

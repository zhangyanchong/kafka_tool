//go:build !linux

package main

import "net/http"

func desktopBindings(app *App, _ http.Handler) []interface{} {
	return []interface{}{app}
}

package main

import "net/http"

func desktopBindings(app *App, handler http.Handler) []interface{} {
	return []interface{}{app, newLinuxAPIBridge(handler)}
}

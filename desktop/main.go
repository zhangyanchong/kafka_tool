package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"kafka-tool/backend/server"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title:     "Kafka Tool",
		Width:     1440,
		Height:    900,
		MinWidth:  980,
		MinHeight: 680,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: server.NewHandler(),
		},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		BackgroundColour: &options.RGBA{R: 13, G: 16, B: 21, A: 1},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

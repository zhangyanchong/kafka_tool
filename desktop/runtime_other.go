//go:build !windows

package main

import "github.com/wailsapp/wails/v2/pkg/options/windows"

func desktopWindowsOptions() (*windows.Options, error) { return nil, nil }
func reportRuntimeError(err error)                     { println("Error:", err.Error()) }

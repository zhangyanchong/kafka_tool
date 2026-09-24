package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	exportMu     sync.Mutex
	exportFiles  map[string]*os.File
	nextExportID uint64
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{exportFiles: make(map[string]*os.File)}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ExportFile opens the native save dialog and writes the selected message export.
func (a *App) ExportFile(defaultFilename, content string) (bool, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:                "导出 Kafka 消息",
		DefaultFilename:      defaultFilename,
		CanCreateDirectories: true,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Lines 文件 (*.jsonl)", Pattern: "*.jsonl"},
			{DisplayName: "文本文件 (*.txt)", Pattern: "*.txt"},
		},
	})
	if err != nil || path == "" {
		return false, err
	}
	if filepath.Ext(path) == "" {
		path += ".jsonl"
	}
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		return false, err
	}
	return true, nil
}

// BeginMessageExport opens the save dialog and keeps the selected file open so
// the frontend can append large exports without building one huge string.
func (a *App) BeginMessageExport(defaultFilename string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:                "导出 Kafka 消息",
		DefaultFilename:      defaultFilename,
		CanCreateDirectories: true,
		Filters: []runtime.FileFilter{
			{DisplayName: "JSON Lines 文件 (*.jsonl)", Pattern: "*.jsonl"},
			{DisplayName: "文本文件 (*.txt)", Pattern: "*.txt"},
		},
	})
	if err != nil || path == "" {
		return "", err
	}
	if filepath.Ext(path) == "" {
		path += ".jsonl"
	}
	file, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return "", err
	}
	a.exportMu.Lock()
	a.nextExportID++
	id := fmt.Sprintf("message-export-%d", a.nextExportID)
	a.exportFiles[id] = file
	a.exportMu.Unlock()
	return id, nil
}

// AppendMessageExport writes one message at a time, keeping memory use bounded
// even when the resulting JSONL file is multiple gigabytes.
func (a *App) AppendMessageExport(id, content string) error {
	a.exportMu.Lock()
	defer a.exportMu.Unlock()
	file, ok := a.exportFiles[id]
	if !ok {
		return fmt.Errorf("导出任务不存在或已经结束")
	}
	if _, err := file.WriteString(content); err != nil {
		return err
	}
	_, err := file.WriteString("\n")
	return err
}

// FinishMessageExport closes a successfully completed export.
func (a *App) FinishMessageExport(id string) error {
	a.exportMu.Lock()
	file, ok := a.exportFiles[id]
	if ok {
		delete(a.exportFiles, id)
	}
	a.exportMu.Unlock()
	if !ok {
		return fmt.Errorf("导出任务不存在或已经结束")
	}
	return file.Close()
}

// CancelMessageExport removes a partial file after an export error.
func (a *App) CancelMessageExport(id string) error {
	a.exportMu.Lock()
	file, ok := a.exportFiles[id]
	if ok {
		delete(a.exportFiles, id)
	}
	a.exportMu.Unlock()
	if !ok {
		return nil
	}
	path := file.Name()
	closeErr := file.Close()
	removeErr := os.Remove(path)
	if closeErr != nil {
		return closeErr
	}
	return removeErr
}

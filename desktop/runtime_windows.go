package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"unsafe"

	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

func desktopWindowsOptions() (*windows.Options, error) {
	executable, err := os.Executable()
	if err != nil {
		return nil, err
	}
	runtimePath := filepath.Join(filepath.Dir(executable), "WebView2")
	// Development and legacy standalone builds can still use the system runtime.
	if _, err := os.Stat(runtimePath); os.IsNotExist(err) {
		return nil, nil
	} else if err != nil {
		return nil, err
	}
	if info, err := os.Stat(filepath.Join(runtimePath, "msedgewebview2.exe")); err != nil || info.IsDir() {
		return nil, fmt.Errorf("自带的 WebView2 不完整，请重新解压整个 KafkaTool 压缩包。")
	}
	// Fixed Version 120+ requires AppContainer read/execute access on Windows 10.
	// Apply after extraction, since ZIP files do not preserve Windows ACLs.
	command := exec.Command("icacls.exe", runtimePath, "/grant", "*S-1-15-2-1:(OI)(CI)(RX)", "*S-1-15-2-2:(OI)(CI)(RX)", "/T", "/Q")
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if output, err := command.CombinedOutput(); err != nil {
		return nil, fmt.Errorf("无法设置 WebView2 运行目录权限，请将完整文件夹解压到本地可写目录后重试。%v\n%s", err, output)
	}
	return &windows.Options{WebviewBrowserPath: runtimePath}, nil
}

func reportRuntimeError(err error) {
	title, _ := syscall.UTF16PtrFromString("Kafka Tool 启动失败")
	message, _ := syscall.UTF16PtrFromString(err.Error())
	syscall.NewLazyDLL("user32.dll").NewProc("MessageBoxW").Call(0, uintptr(unsafe.Pointer(message)), uintptr(unsafe.Pointer(title)), 0x10)
}

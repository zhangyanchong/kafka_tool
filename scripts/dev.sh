#!/bin/sh

set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
STATE_DIR="$PROJECT_DIR/.dev"
BACKEND_PID_FILE="$STATE_DIR/backend.pid"
FRONTEND_PID_FILE="$STATE_DIR/frontend.pid"
BACKEND_LOG="$STATE_DIR/backend.log"
FRONTEND_LOG="$STATE_DIR/frontend.log"
BACKEND_BIN="$STATE_DIR/kafka-tool-server"

mkdir -p "$STATE_DIR"

listener_pids() {
  lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | sort -u || true
}

listener_pid() {
  listener_pids "$1" | head -n 1
}

is_project_process() {
  pid=$1
  process_cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1 || true)
  case "$process_cwd" in
    "$PROJECT_DIR"|"$PROJECT_DIR"/*) return 0 ;;
    *) return 1 ;;
  esac
}

stop_pid() {
  name=$1
  pid=$2

  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi
  if ! is_project_process "$pid"; then
    echo "拒绝停止 ${name}：PID ${pid} 不属于当前项目。"
    return 1
  fi

  echo "正在停止 ${name}（PID ${pid}）……"
  kill "$pid" 2>/dev/null || true
  count=0
  while kill -0 "$pid" 2>/dev/null && [ "$count" -lt 30 ]; do
    sleep 0.1
    count=$((count + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "${name} 未及时退出，强制停止 PID ${pid}。"
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

stop_service() {
  name=$1
  pid_file=$2
  port=$3

  if [ -f "$pid_file" ]; then
    saved_pid=$(sed -n '1p' "$pid_file")
    if [ -n "$saved_pid" ]; then
      stop_pid "$name" "$saved_pid" || true
    fi
    rm -f "$pid_file"
  fi

  # 兼容以前手动启动、没有 PID 文件的本项目进程。
  for port_pid in $(listener_pids "$port"); do
    stop_pid "$name" "$port_pid"
  done
}

ensure_port_free() {
  name=$1
  port=$2
  pid=$(listener_pid "$port")
  if [ -n "$pid" ]; then
    echo "错误：$name 端口 $port 已被 PID $pid 占用。"
    echo "该进程不属于当前项目，脚本不会自动停止它。"
    exit 1
  fi
}

wait_for_url() {
  name=$1
  url=$2
  pid=$3
  attempts=0

  while [ "$attempts" -lt 80 ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "错误：$name 启动失败，请查看日志。"
      return 1
    fi
    sleep 0.25
    attempts=$((attempts + 1))
  done

  echo "错误：等待 $name 启动超时，请查看日志。"
  return 1
}

start_all() {
  ensure_port_free "后端" 18080
  ensure_port_free "前端" 5173

  if ! command -v go >/dev/null 2>&1; then
    echo "错误：找不到 go 命令。"
    exit 1
  fi
  if [ ! -x "$FRONTEND_DIR/node_modules/.bin/vite" ]; then
    echo "错误：前端依赖未安装，请先执行：cd frontend && npm install"
    exit 1
  fi

  echo "正在编译 Go 后端……"
  (cd "$BACKEND_DIR" && go build -o "$BACKEND_BIN" ./cmd/server)

  : > "$BACKEND_LOG"
  : > "$FRONTEND_LOG"

  (
    cd "$BACKEND_DIR"
    nohup "$BACKEND_BIN" >> "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"
  )
  backend_pid=$(sed -n '1p' "$BACKEND_PID_FILE")

  (
    cd "$FRONTEND_DIR"
    nohup "$FRONTEND_DIR/node_modules/.bin/vite" \
      --host 127.0.0.1 \
      --port 5173 \
      --strictPort >> "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"
  )
  frontend_pid=$(sed -n '1p' "$FRONTEND_PID_FILE")

  if ! wait_for_url "后端" "http://127.0.0.1:18080/api/v1/health" "$backend_pid"; then
    tail -n 30 "$BACKEND_LOG"
    exit 1
  fi
  if ! wait_for_url "前端" "http://127.0.0.1:5173/" "$frontend_pid"; then
    tail -n 30 "$FRONTEND_LOG"
    exit 1
  fi

  echo "启动完成："
  echo "  前端：http://127.0.0.1:5173"
  echo "  后端：http://127.0.0.1:18080"
  echo "  前端 PID：$frontend_pid"
  echo "  后端 PID：$backend_pid"
}

stop_all() {
  stop_service "前端" "$FRONTEND_PID_FILE" 5173
  stop_service "后端" "$BACKEND_PID_FILE" 18080
  echo "前后端已经停止。"
}

show_status() {
  frontend_pid=$(listener_pid 5173)
  backend_pid=$(listener_pid 18080)

  if [ -n "$frontend_pid" ]; then
    echo "前端：运行中，PID ${frontend_pid}，http://127.0.0.1:5173"
  else
    echo "前端：未运行"
  fi
  if [ -n "$backend_pid" ]; then
    echo "后端：运行中，PID ${backend_pid}，http://127.0.0.1:18080"
  else
    echo "后端：未运行"
  fi
}

show_logs() {
  touch "$BACKEND_LOG" "$FRONTEND_LOG"
  echo "按 Ctrl+C 退出日志查看，不会停止服务。"
  tail -n 60 -f "$BACKEND_LOG" "$FRONTEND_LOG"
}

case "${1:-restart}" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    start_all
    ;;
  status)
    show_status
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "用法：$0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac

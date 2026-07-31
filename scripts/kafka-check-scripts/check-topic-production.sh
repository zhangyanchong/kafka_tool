#!/bin/sh

# 只需要修改下面三个配置
KAFKA="11.121.249.187:29092,11.121.249.187:39092,11.121.249.187:49092"
TOPIC="mid_dev"
CHECK_SECONDS=30

set -eu

# Kafka 4.x 需要 Java 17；仅对当前脚本生效，不修改系统默认 Java。
if [ -x /usr/libexec/java_home ]; then
  JAVA_17_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || true)
  if [ -n "$JAVA_17_HOME" ]; then
    JAVA_HOME=$JAVA_17_HOME
    PATH="$JAVA_HOME/bin:$PATH"
    export JAVA_HOME PATH
  fi
fi

JAVA_MAJOR=$(java -version 2>&1 | awk -F '[".]' '/version/ { if ($2 == 1) print $3; else print $2; exit }')
if [ -z "$JAVA_MAJOR" ] || [ "$JAVA_MAJOR" -lt 17 ]; then
  echo "错误：Kafka CLI 需要 Java 17 或更高版本，当前脚本没有找到可用的 Java 17。"
  exit 1
fi

if ! command -v kafka-get-offsets >/dev/null 2>&1; then
  echo "错误：找不到 kafka-get-offsets 命令。"
  echo '请先安装 Kafka CLI，或把 /opt/homebrew/opt/kafka/bin 加入 PATH。'
  exit 1
fi

if [ -z "$KAFKA" ] || [ -z "$TOPIC" ]; then
  echo "错误：请填写脚本最前面的 KAFKA 和 TOPIC。"
  exit 1
fi

case "$CHECK_SECONDS" in
  ''|*[!0-9]*)
    echo "错误：CHECK_SECONDS 必须是正整数。"
    exit 1
    ;;
esac

if [ "$CHECK_SECONDS" -le 0 ]; then
  echo "错误：CHECK_SECONDS 必须大于 0。"
  exit 1
fi

get_end_offset_total() {
  kafka-get-offsets \
    --bootstrap-server "$KAFKA" \
    --topic "$TOPIC" \
    --time -1 |
    awk -F: -v topic="$TOPIC" '
      $1 == topic && $3 ~ /^[0-9]+$/ {
        total += $3
        partitions++
      }
      END {
        if (partitions == 0) exit 2
        printf "%.0f\n", total
      }
    '
}

echo "Kafka：$KAFKA"
echo "Topic：$TOPIC"
echo "检测时间：${CHECK_SECONDS} 秒"
echo "正在读取第一次 End Offset 快照……"

START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
START_OFFSET=$(get_end_offset_total) || {
  echo "错误：没有读取到 Topic 分区 Offset，请检查 KAFKA 和 TOPIC。"
  exit 1
}

echo "[$START_TIME] 开始 End Offset 合计：$START_OFFSET"
echo "等待 ${CHECK_SECONDS} 秒……"
sleep "$CHECK_SECONDS"

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
END_OFFSET=$(get_end_offset_total) || {
  echo "错误：第二次 End Offset 快照读取失败。"
  exit 1
}

PRODUCED=$((END_OFFSET - START_OFFSET))

echo "[$END_TIME] 结束 End Offset 合计：$END_OFFSET"
echo "----------------------------------------"
echo "${CHECK_SECONDS} 秒内 Topic Offset 实际增长：$PRODUCED"
echo "请将该数值与应用图表同一采样周期的“Topic 本周期实际生成”对比。"

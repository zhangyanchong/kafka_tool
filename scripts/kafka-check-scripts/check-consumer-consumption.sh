#!/bin/sh

# 只需要修改下面四个配置
KAFKA="11.121.249.187:29092,11.121.249.187:39092,11.121.249.187:49092"
TOPIC="mid_dev"
CONSUMER_GROUP="mid_dev"
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

if ! command -v kafka-consumer-groups >/dev/null 2>&1; then
  echo "错误：找不到 kafka-consumer-groups 命令。"
  echo '请先安装 Kafka CLI，或把 /opt/homebrew/opt/kafka/bin 加入 PATH。'
  exit 1
fi

if [ -z "$KAFKA" ] || [ -z "$TOPIC" ] || [ -z "$CONSUMER_GROUP" ]; then
  echo "错误：请填写脚本最前面的 KAFKA、TOPIC 和 CONSUMER_GROUP。"
  exit 1
fi

if [ "$CONSUMER_GROUP" = "请填写消费组名称" ]; then
  echo "错误：请先填写 CONSUMER_GROUP。"
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

echo "正在检查消费组是否存在……"
if ! GROUP_LIST=$(kafka-consumer-groups \
  --bootstrap-server "$KAFKA" \
  --list); then
  echo "错误：无法读取消费组列表，请检查 Kafka 地址和网络。"
  exit 1
fi

if ! printf '%s\n' "$GROUP_LIST" | awk -v group="$CONSUMER_GROUP" '
  {
    value = $0
    sub(/^[[:space:]]+/, "", value)
    sub(/[[:space:]]+$/, "", value)
    if (value == group) found = 1
  }
  END { exit(found ? 0 : 1) }
'; then
  echo "错误：消费组不存在：$CONSUMER_GROUP"
  exit 1
fi

get_committed_offset_total() {
  if ! DESCRIBE_OUTPUT=$(kafka-consumer-groups \
    --bootstrap-server "$KAFKA" \
    --group "$CONSUMER_GROUP" \
    --describe); then
    echo "错误：无法读取消费组 Offset。" >&2
    return 1
  fi

  printf '%s\n' "$DESCRIBE_OUTPUT" |
    awk -v group="$CONSUMER_GROUP" -v topic="$TOPIC" '
      $1 == group && $2 == topic && $3 ~ /^[0-9]+$/ {
        topicPartitions++
        if ($4 ~ /^[0-9]+$/) {
          total += $4
          committedPartitions++
        }
      }
      END {
        if (topicPartitions == 0) exit 2
        if (committedPartitions == 0) exit 3
        printf "%.0f\n", total
      }
    '
}

echo "Kafka：$KAFKA"
echo "Topic：$TOPIC"
echo "消费组：$CONSUMER_GROUP"
echo "检测时间：${CHECK_SECONDS} 秒"
echo "正在读取第一次 Committed Offset 快照……"

START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
START_OFFSET=$(get_committed_offset_total) || {
  echo "错误：消费组存在，但在 Topic '$TOPIC' 上没有可用的 Committed Offset。"
  exit 1
}

echo "[$START_TIME] 开始 Committed Offset 合计：$START_OFFSET"
echo "等待 ${CHECK_SECONDS} 秒……"
sleep "$CHECK_SECONDS"

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
END_OFFSET=$(get_committed_offset_total) || {
  echo "错误：第二次 Committed Offset 快照读取失败。"
  exit 1
}

CONSUMED=$((END_OFFSET - START_OFFSET))

echo "[$END_TIME] 结束 Committed Offset 合计：$END_OFFSET"
echo "----------------------------------------"
if [ "$CONSUMED" -lt 0 ]; then
  echo "警告：Committed Offset 变小，消费组可能在检测期间被重置了 Offset。"
  echo "原始 Offset 变化量：$CONSUMED"
  echo "按照应用图表口径，本周期消费量显示为：0"
else
  echo "${CHECK_SECONDS} 秒内消费组提交消费量：$CONSUMED"
fi
echo "该数值是 Committed Offset 增量，不是脚本主动消费的消息数。"

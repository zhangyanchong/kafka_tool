package main

import (
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestKafkaAccessRemainsReadOnly prevents accidental Kafka mutation features
// from being added to this application. The UI is intentionally a viewer.
func TestKafkaAccessRemainsReadOnly(t *testing.T) {
	forbidden := []string{
		"kgo.ConsumerGroup(",
		".Produce(",
		".ProduceSync(",
		".CommitOffsets(",
		".CommitRecords(",
		".CommitUncommittedOffsets(",
		".MarkCommitRecords(",
		".SetOffsets(",
		".CreateTopics(",
		".DeleteTopics(",
		".CreatePartitions(",
		".DeleteGroups(",
		".AlterConfigs(",
		".IncrementalAlterConfigs(",
		".DeleteRecords(",
		"OffsetCommitRequest",
		"CreateTopicsRequest",
		"DeleteTopicsRequest",
	}

	backendRoot := filepath.Clean(filepath.Join("..", ".."))
	err := filepath.WalkDir(backendRoot, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		content, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		source := string(content)
		for _, token := range forbidden {
			if strings.Contains(source, token) {
				t.Errorf("read-only policy violation: %s contains forbidden Kafka operation %q", path, token)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}


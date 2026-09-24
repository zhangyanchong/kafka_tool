package controller

import (
	"testing"
	"time"
)

func TestMessageSearchTimeoutScalesWithScanLimit(t *testing.T) {
	tests := []struct {
		name       string
		configured time.Duration
		scanLimit  int
		want       time.Duration
	}{
		{name: "small scan", configured: time.Minute, scanLimit: 10000, want: 5 * time.Minute},
		{name: "one hundred thousand", configured: time.Minute, scanLimit: 100000, want: 5 * time.Minute},
		{name: "one million", configured: time.Minute, scanLimit: 1000000, want: 10 * time.Minute},
		{name: "longer configured timeout", configured: 15 * time.Minute, scanLimit: 100000, want: 15 * time.Minute},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := messageSearchTimeout(test.configured, test.scanLimit); got != test.want {
				t.Fatalf("timeout = %s, want %s", got, test.want)
			}
		})
	}
}

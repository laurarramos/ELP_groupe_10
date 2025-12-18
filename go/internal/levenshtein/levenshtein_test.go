package levenshtein

import "testing"

func TestDistance(t *testing.T) {
	tests := []struct {
		a, b string
		want int
	}{
		{"", "", 0},
		{"a", "", 1},
		{"", "a", 1},
		{"kitten", "sitting", 3},
		{"flaw", "lawn", 2},
		{"Laura", "Lara", 1},
		{"café", "cafe", 1}, // accent handling (runes)
	}

	for _, tt := range tests {
		if got := Distance(tt.a, tt.b); got != tt.want {
			t.Fatalf("Distance(%q,%q)=%d, want %d", tt.a, tt.b, got, tt.want)
		}
	}
}

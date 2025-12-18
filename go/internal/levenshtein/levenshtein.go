package levenshtein

// Distance returns the Levenshtein edit distance between a and b.
// Cost(insert)=cost(delete)=cost(substitute)=1.
func Distance(a, b string) int {
	// Convert to rune slices to handle accents/UTF-8 properly.
	ar := []rune(a)
	br := []rune(b)

	// Ensure br is the shorter one to reduce memory, optional.
	if len(ar) < len(br) {
		ar, br = br, ar
	}

	prev := make([]int, len(br)+1)
	curr := make([]int, len(br)+1)

	for j := 0; j <= len(br); j++ {
		prev[j] = j
	}

	for i := 1; i <= len(ar); i++ {
		curr[0] = i
		for j := 1; j <= len(br); j++ {
			cost := 0
			if ar[i-1] != br[j-1] {
				cost = 1
			}
			del := prev[j] + 1
			ins := curr[j-1] + 1
			sub := prev[j-1] + cost

			curr[j] = min3(del, ins, sub)
		}
		prev, curr = curr, prev // swap buffers
	}

	return prev[len(br)]
}

func min3(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

#testpackage levenshtein

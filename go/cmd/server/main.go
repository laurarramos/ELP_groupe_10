package main

import (
	"fmt"
	"os"

	"elp_groupe_10/internal/levenshtein"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Println("usage: server <a> <b>")
		return
	}
	fmt.Println(levenshtein.Distance(os.Args[1], os.Args[2]))
}

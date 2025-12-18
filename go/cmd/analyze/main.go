package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
	"sync"

	"elp_groupe_10/internal/data"
	"elp_groupe_10/internal/levenshtein"
)

type Pair struct {
	i, j int
	a, b string
}

type Match struct {
	i, j int
	dist int
	a, b string
}

func main() {
	if len(os.Args) != 3 {
		fmt.Println("usage: go run ./cmd/analyze <path-to-csv> <nb-workers>")
		os.Exit(1)
	}

	csvPath := os.Args[1]

	// nb workers en paramètre
	w, err := strconv.Atoi(os.Args[2])
	if err != nil || w <= 0 {
		fmt.Println("nb-workers must be a positive integer")
		os.Exit(1)
	}

	max := runtime.NumCPU()
	if w > max {
		fmt.Printf("nb-workers capped to NumCPU (%d)\n", max)
		w = max
	}
	fmt.Println("Workers:", w, "| NumCPU:", max)

	// Lecture CSV
	personnes, err := data.LireCSV(csvPath)
	if err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}

	// On prend les noms/prénoms ensemble (déjà dans Personne.NomComplet)
	n := len(personnes)
	fmt.Println("Lignes chargées:", n)
	if n < 2 {
		fmt.Println("Not enough rows to build pairs.")
		return
	}

	// Channels
	jobs := make(chan Pair, 10_000)
	results := make(chan Match, 10_000)

	// Workers
	var wg sync.WaitGroup
	wg.Add(w)

	threshold := 3

	for k := 0; k < w; k++ {
		go worker(k, jobs, results, &wg, threshold)
	}

	// Producer: génère tous les couples i<j et push dans jobs
	go func() {
		totalPairs := 0
		for i := 0; i < n; i++ {
			a := personnes[i].NomComplet
			for j := i + 1; j < n; j++ {
				b := personnes[j].NomComplet
				jobs <- Pair{i: i, j: j, a: a, b: b}
				totalPairs++
			}
		}
		close(jobs)
		fmt.Println("Total pairs generated:", totalPairs)
	}()

	// Fermer results quand tous les workers ont fini
	go func() {
		wg.Wait()
		close(results)
	}()

	// Consommer résultats
	matchCount := 0
	printLimit := 30

	for m := range results {
		matchCount++
		if matchCount <= printLimit {
			fmt.Printf("d=%d | (%d,%d) %q <-> %q\n", m.dist, m.i, m.j, m.a, m.b)
		}
	}

	fmt.Printf("Total matches with Levenshtein <= %d: %d\n", threshold, matchCount)
}

func worker(id int, jobs <-chan Pair, results chan<- Match, wg *sync.WaitGroup, threshold int) {
	defer wg.Done()

	for p := range jobs {
		// calcul distance
		d := levenshtein.Distance(p.a, p.b)

		// filtre
		if d <= threshold {
			results <- Match{
				i: p.i, j: p.j,
				dist: d,
				a:    p.a, b: p.b,
			}
		}
	}
}

package main

import (
	"fmt"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"elp_groupe_10/internal/data"
	"elp_groupe_10/internal/levenshtein"
)

type Pair struct {
	i, j         int
	a, b         string
	yearA, yearB int
}

type Match struct {
	i, j         int
	dist         int
	a, b         string
	yearA, yearB int
}

func extractYear(dateStr string) int {
	// Parse la date selon le format "JJ/MM/AAAA"
	date, err := time.Parse("02/01/2006", dateStr)
	if err != nil {
		fmt.Printf("Erreur de parsing pour la date %s : %v\n", dateStr, err)
		return 0 // Retourne 0 en cas d'erreur
	}
	return date.Year() // Retourne l'année extraite
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func main() {
	if len(os.Args) != 3 {
		fmt.Println("usage: go run ./cmd/analyze <path-to-csv> <nb-workers>")
		os.Exit(1)
	}

	csvPath := os.Args[1]

	// nb workers en paramètre (sans capper pour pouvoir faire des tests)
	w, err := strconv.Atoi(os.Args[2])
	if err != nil || w <= 0 {
		fmt.Println("nb-workers must be a positive integer")
		os.Exit(1)
	}

	fmt.Println("Workers:", w, "| NumCPU:", runtime.NumCPU(), "| GOMAXPROCS:", runtime.GOMAXPROCS(0))

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

	threshold := 3

	// Channels
	jobs := make(chan Pair, 10_000)
	results := make(chan Match, 10_000)

	// WaitGroups
	var wgWorkers sync.WaitGroup
	var wgConsumer sync.WaitGroup

	// 1) Consommateur des résultats
	wgConsumer.Add(1)
	go func() {
		defer wgConsumer.Done()
		matchCount := 0
		printLimit := -1 //pour tout afficher

		printed := 0
		for m := range results {
			matchCount++
			if printLimit < 0 || printed < printLimit {
				fmt.Printf("d=%d | %q (%d) <-> %q (%d)\n", m.dist, m.a, m.yearA, m.b, m.yearB)
				printed++
			}
		}
		fmt.Printf("Total matches with Levenshtein <= %d and year diff <=1: %d\n", threshold, matchCount)
	}()

	// 2) Workers
	wgWorkers.Add(w)

	for k := 0; k < w; k++ {
		go worker(jobs, results, &wgWorkers, threshold)
	}

	// 3) Producer: génère tous les couples i<j et push dans jobs
	go func() {
		totalPairs := 0
		for i := 0; i < n; i++ {
			a := personnes[i].NomComplet
			yearA := extractYear(personnes[i].DateDeces)
			for j := i + 1; j < n; j++ {
				b := personnes[j].NomComplet
				yearB := extractYear(personnes[j].DateDeces)
				jobs <- Pair{i: i, j: j, a: a, b: b, yearA: yearA, yearB: yearB}
				totalPairs++
			}
		}
		close(jobs)
		fmt.Println("Total pairs generated:", totalPairs)
	}()

	// 4) Fermer results quand tous les workers ont fini
	wgWorkers.Wait()
	close(results)

	// 5) Attendre le consommateur
	wgConsumer.Wait()

}

func worker(jobs <-chan Pair, results chan<- Match, wg *sync.WaitGroup, threshold int) {
	defer wg.Done()

	for p := range jobs {
		// calcul distance
		d := levenshtein.Distance(p.a, p.b)

		//calcul de l'écart de l'année de décès
		yearDiff := abs(p.yearA - p.yearB)
		// filtre
		if d <= threshold && yearDiff <= 1 {
			results <- Match{
				i:     p.i,
				j:     p.j,
				dist:  d,
				a:     p.a,
				b:     p.b,
				yearA: p.yearA,
				yearB: p.yearB,
			}
		}
	}
}

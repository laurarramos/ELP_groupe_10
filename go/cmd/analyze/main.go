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
	dateDecesA   string
	dateDecesB   string
}

type Match struct {
	i, j         int
	dist         int
	a, b         string
	yearA, yearB int
	dateDecesA   string
	dateDecesB   string
}

func extractYear(dateStr string) int {
	// la date selon le format "JJ/MM/AAAA"
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
	if len(os.Args) != 3 && len(os.Args) != 4 {
		fmt.Println("usage:")
		fmt.Println("  go run ./cmd/analyze <csv1> <workers>")
		fmt.Println("  go run ./cmd/analyze <csv1> <csv2> <workers>")
		os.Exit(1)
	}

	threshold := 3
	printLimit := -1 //pour tout afficher

	var csv1, csv2 string
	var workersStr string
	deuxCSV := false

	if len(os.Args) == 3 {
		csv1 = os.Args[1]
		workersStr = os.Args[2]
	} else {
		deuxCSV = true
		csv1 = os.Args[1]
		csv2 = os.Args[2]
		workersStr = os.Args[3]
	}

	// nb workers en paramètre (sans capper pour pouvoir faire des tests)
	w, err := strconv.Atoi(workersStr)
	if err != nil || w <= 0 {
		fmt.Println("nb-workers must be a positive integer")
		os.Exit(1)
	}

	fmt.Println("Workers:", w, "| NumCPU:", runtime.NumCPU(), "| GOMAXPROCS:", runtime.GOMAXPROCS(0))
	fmt.Println("Threshold:", threshold, "| PrintLimit:", printLimit)

	// Lecture CSV
	p1, err := data.LireCSV(csv1)
	if err != nil {
		fmt.Println("erreur de lecture du csv1:", err)
		os.Exit(1)
	}
	fmt.Println("CSV1 lignes :", len(p1))

	var p2 []data.Personne
	if deuxCSV {
		p2, err := data.LireCSV(csv2)
		if err != nil {
			fmt.Println("erreur de lecture du csv2:", err)
			os.Exit(1)
		}
		fmt.Println("CSV2 lignes:", len(p2))
	}

	// Channels
	jobs := make(chan Pair, 50)
	results := make(chan Match, 50)

	// WaitGroups
	var wgWorkers sync.WaitGroup
	var wgConsumer sync.WaitGroup

	// 1) Consommateur des résultats
	wgConsumer.Add(1)
	go consumeResults(results, &wgConsumer, threshold, printLimit)

	// 2) Workers
	wgWorkers.Add(w)

	for k := 0; k < w; k++ {
		go worker(jobs, results, &wgWorkers, threshold)
	}

	// 3) Producer: génère tous les couples i<j et push dans jobs
	if deuxCSV {
		producePairsTwoCSV(p1, p2, jobs)
	} else {
		producePairsOneCSV(p1, jobs)
	}
	// 4) Fermer results quand tous les workers ont fini
	wgWorkers.Wait()
	close(results)

	// 5) Attendre le consommateur
	wgConsumer.Wait()

}

func producePairsOneCSV(p []data.Personne, jobs chan<- Pair) {
	n := len(p)
	total := 0

	for i := 0; i < n; i++ {
		a := p[i].NomComplet
		yearA := extractYear(p[i].DateDeces)
		dateDecesA := p[i].DateDeces

		for j := i + 1; j < n; j++ {
			b := p[j].NomComplet
			yearB := extractYear(p[j].DateDeces)
			dateDecesB := p[j].DateDeces

			jobs <- Pair{i: i, j: j, a: a, b: b, yearA: yearA, yearB: yearB, dateDecesA: dateDecesA, dateDecesB: dateDecesB}
			total++
		}
	}

	close(jobs)
	fmt.Println("Total pairs generated (1 CSV):", total)
}

func producePairsTwoCSV(p1, p2 []data.Personne, jobs chan<- Pair) {
	fmt.Println("DEBUG n1,n2:", len(p1), len(p2))

	n1 := len(p1)
	n2 := len(p2)
	total := 0

	for i := 0; i < n1; i++ {
		a := p1[i].NomComplet
		yearA := extractYear(p1[i].DateDeces)
		dateDecesA := p1[i].DateDeces

		for j := 0; j < n2; j++ {
			b := p2[j].NomComplet
			yearB := extractYear(p2[j].DateDeces)
			dateDecesB := p2[j].DateDeces
			jobs <- Pair{i: i, j: j, a: a, b: b, yearA: yearA, yearB: yearB, dateDecesA: dateDecesA, dateDecesB: dateDecesB}
			total++
		}
	}

	close(jobs)
	fmt.Println("Total pairs generated (2 CSV):", total)
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
				i:          p.i,
				j:          p.j,
				dist:       d,
				a:          p.a,
				b:          p.b,
				yearA:      p.yearA,
				yearB:      p.yearB,
				dateDecesA: p.dateDecesA,
				dateDecesB: p.dateDecesB,
			}
		}
	}
}

func consumeResults(results <-chan Match, wg *sync.WaitGroup, threshold int, printLimit int) {
	defer wg.Done()

	matchCount := 0
	printed := 0

	for m := range results {
		matchCount++
		if printLimit < 0 || printed < printLimit {
			fmt.Printf("d=%d | %q (%s) <-> %q (%s)\n", m.dist, m.a, m.dateDecesA, m.b, m.dateDecesB)
			printed++
		}
	}

	fmt.Printf("Total matches with Levenshtein <= %d and year diff <= 1: %d\n", threshold, matchCount)
}

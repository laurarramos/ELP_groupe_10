package data

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

type Personne struct {
	NomComplet string
	Sexo       string
	DateDeces  string // ou FechaHechos si tu préfères rester proche du CSV
}

func normalizeNom(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.Join(strings.Fields(s), " ")
	return s
}

func LireCSV(cheminFichier string) ([]Personne, error) {
	fichier, err := os.Open(cheminFichier)
	if err != nil {
		return nil, fmt.Errorf("ouverture CSV: %w", err)
	}
	defer fichier.Close()

	reader := csv.NewReader(fichier) // pas de séparateur défini
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("lecture CSV: %w", err)
	}

	var personnes []Personne
	for i, record := range records {
		if i == 0 { // header
			continue
		}
		if len(record) < 3 {
			continue
		}

		personnes = append(personnes, Personne{
			NomComplet: normalizeNom(record[0]),
			Sexo:       strings.TrimSpace(record[1]),
			DateDeces:  strings.TrimSpace(record[2]),
		})
	}
	return personnes, nil
}

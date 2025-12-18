package levenshtein

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
)

type Personne struct {
	Prenom_Nom string
	Date_deces string
}

func supprimerEspaces(s string) string {
	return strings.ReplaceAll(s, " ", "")
}

func LireCSVLevenshtein(cheminFichier string) ([]Personne, error) {
	fichier, err := os.Open(cheminFichier)
	if err != nil {
		return nil, fmt.Errorf("erreur lors de l'ouverture du fichier CSV: %v", err)
	}
	defer fichier.Close()

	reader := csv.NewReader(fichier)
	reader.Comma = ','

	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("erreur lors de la lecture du fichier CSV: %v", err)
	}

	var personnes []Personne

	// On saute le header (ligne 0)
	for i, record := range records {
		if i == 0 {
			continue
		}
		if len(record) < 3 {
			continue
		}

		// Tout ce qu'il y a avant la virgule = record[0]
		nomComplet := strings.TrimSpace(record[0])

		personne := Personne{
			Prenom_Nom: supprimerEspaces(nomComplet),
			Date_deces: strings.TrimSpace(record[2]),
		}
		personnes = append(personnes, personne)
	}

	return personnes, nil
}

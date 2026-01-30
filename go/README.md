# CSV Name Matching - Projet Go - Groupe 10

## Description

Ce projet est un programme écrit en **Go** permettant de comparer des noms et les dates issus d'un ou de deux fichiers **CSV** représentant des bases de données humaines, afin d'identifier les doublons.  
La similarité entre les noms est évaluée via la **distance de Levenshtein**, et les comparaisons sont parallélisées grâce à un système de **workers** basé sur les **goroutines** et les **channels** de Go.

Le but est d'explorer la lecture de CSV, le *name matching* et la concurrence en Go, en observant l'impact du nombre de workers (et donc du nombre de goroutines de calcul) sur les performances.  
En pratique, le nombre de goroutines réellement “utiles” est généralement borné par le **nombre de cœurs** de la machine : au-delà, la surcharge liée à la concurrence peut dépasser les gains.



## Exécution du programme

### Cas 1 : Un seul fichier CSV

    go run . <chemin_vers_fichier_csv> <nombre_de_workers>

Exemple :

    go run . data/names.csv 8

---

### Cas 2 : Deux fichiers CSV

    go run . <chemin_vers_csv1> <chemin_vers_csv2> <nombre_de_workers>

Exemple :

    go run . data/names1.csv data/names2.csv 8

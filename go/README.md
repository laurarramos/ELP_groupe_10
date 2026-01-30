# CSV Name Matching – Projet Go

## 📌 Description

Ce projet est un programme écrit en **Go** permettant de comparer des noms issus d’un ou de deux fichiers **CSV**.  
La similarité entre les noms est évaluée via la **distance de Levenshtein**, et les comparaisons sont parallélisées grâce à un système de **workers** basé sur les **goroutines** et les **channels** de Go.

Le but est d’explorer la lecture de CSV, le *name matching* et la concurrence en Go, en observant l’impact du nombre de workers (et donc du nombre de goroutines de calcul) sur les performances.  
En pratique, le nombre de goroutines réellement “utiles” est généralement borné par le **nombre de cœurs** de la machine : au-delà, la surcharge liée à la concurrence peut dépasser les gains.

---

## 🧠 Fonctionnalités

- 📄 Lecture d’un ou de deux fichiers CSV
- 🔍 Comparaison de chaînes de caractères (noms)
- 📏 Mesure de similarité via la distance de Levenshtein
- ⚙️ Exécution concurrente via un pool de workers (goroutines)
- 🧵 Génération de tâches via un channel (pipeline producteur → workers → résultats)
- 🔁 Normalisation simple des noms : réordonnancement par ordre croissant des items si nécessaire  
  (ex : “juan pablo” vs “pablo juan” pour éviter un faux négatif)

---

## 🏗️ Architecture (goroutines & channels)

Le programme suit un schéma **producteur / workers / consommateur** :

- **Producteur (goroutine)** : parcourt les données, génère les couples à comparer et les envoie dans un **channel**
- **Workers (N goroutines)** : récupèrent les tâches depuis le channel et exécutent le calcul de Levenshtein
- **Consommateur (goroutine)** : récupère les résultats et gère l’affichage, le tri et la limitation d’affichage

Schéma global :

    main
     ├── lance workers
     ├── lance producteur
     ├── lance consommateur (goroutine)
     ├── attend la fin des workers
     ├── ferme results
     └── attend la fin du consommateur

Le paramètre `workers` correspond au nombre de goroutines de traitement lancées (`go worker(...)`).  
La synchronisation et la concurrence sur le flux d’opérations sont gérées nativement par Go via les **channels**.

---

## 📁 Structure du projet

    .
    ├── main.go           # Point d’entrée du programme (arguments, orchestration)
    ├── csv_read.go       # Lecture et parsing des fichiers CSV
    ├── levenshtein.go    # Calcul de la distance de Levenshtein
    └── README.md

---

## ▶️ Exécution du programme

### 🔹 Cas 1 : Un seul fichier CSV

    go run . <chemin_vers_fichier_csv> <nombre_de_workers>

Exemple :

    go run . data/names.csv 8

---

### 🔹 Cas 2 : Deux fichiers CSV

    go run . <chemin_vers_csv1> <chemin_vers_csv2> <nombre_de_workers>

Exemple :

    go run . data/names1.csv data/names2.csv 8

---

## 🧪 Commande utilisée en analyse (exemple)

    go run ./cmd/analyze /mnt/c/INSA/TC/3A/ELP/golang/datasheets/UniversoGITT_Medellin.csv 8

---

## 🧾 Paramètres (version avancée)

Selon la version du programme, les arguments peuvent inclure :

    <csv> <workers> <threshold> <printLimit> <bufferSize>

- **workers** : nombre de goroutines de traitement  
- **threshold** : seuil de similarité / filtrage des résultats (si implémenté)  
- **printLimit** : limite du nombre de résultats affichés  
- **bufferSize** : taille du buffer des channels (impact sur le débit du pipeline)

---

## 🎯 Objectifs pédagogiques

- Lire et parser des fichiers CSV en Go
- Mettre en œuvre un algorithme de comparaison de chaînes (Levenshtein)
- Construire un pipeline concurrent avec goroutines et channels
- Comprendre l’effet du nombre de workers (souvent lié au nombre de cœurs CPU)
- Identifier des limites : surcharge de concurrence, organisation du pipeline, gestion du flux

---

## 🔧 Pistes d’amélioration

- Identity matching plus robuste que Levenshtein (règles, dictionnaires, heuristiques)
- Normalisation plus avancée (accents, casse, espaces, particules, prénoms composés)
- Export des résultats dans un fichier CSV
- Ajout de métriques (temps total, débit tâches/s) pour comparer les configurations
- Exploiter davantage les APIs standard Go (ex : gestion de dates si nécessaire)

---

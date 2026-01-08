package main

import (
	"log"
	"net/http"

	"warehouse-backend/internal/config"
	"warehouse-backend/internal/db"
	"warehouse-backend/internal/httpapi"
)

func main() {
	cfg := config.Load()

	pg, err := db.New(db.Config{
		Host:     cfg.DBHost,
		Port:     cfg.DBPort,
		User:     cfg.DBUser,
		Password: cfg.DBPassword,
		DBName:   cfg.DBName,
	})
	if err != nil {
		log.Fatal("DB connection failed:", err)
	}

	router := httpapi.NewRouter(pg)

	addr := ":" + cfg.Port
	log.Println("API started on", addr)

	log.Fatal(http.ListenAndServe(addr, router))
}

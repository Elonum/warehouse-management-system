package main

import (
	"log"
	"net/http"

	"warehouse-backend/internal/httpapi"
)

func main() {
	router := httpapi.NewRouter()

	log.Println("API started on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}

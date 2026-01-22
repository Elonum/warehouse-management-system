package main

import (
	"fmt"
	"os"
	"warehouse-backend/internal/auth"
)

func main() {
	password := "password123"
	if len(os.Args) > 1 {
		password = os.Args[1]
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating hash: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Password: %s\n", password)
	fmt.Printf("Bcrypt Hash: %s\n", hash)

	// Проверяем, что хеш работает
	if auth.CheckPassword(password, hash) {
		fmt.Println("Hash verification: SUCCESS")
	} else {
		fmt.Println("Hash verification: FAILED")
		os.Exit(1)
	}
}


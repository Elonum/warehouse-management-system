package auth

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword хеширует пароль с использованием bcrypt
// bcrypt - криптографическая хеш-функция, специально разработанная для паролей
// Она медленная по дизайну, что защищает от brute-force атак
func HashPassword(password string) (string, error) {
	// cost = 10 означает 2^10 = 1024 итераций (баланс между безопасностью и производительностью)
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword проверяет, соответствует ли пароль хешу
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}


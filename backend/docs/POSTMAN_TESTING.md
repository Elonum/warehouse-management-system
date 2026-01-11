# Postman Testing Guide

## Настройка окружения в Postman

### 1. Создание Environment

1. В Postman нажмите на иконку "Environments" (слева)
2. Нажмите "+" для создания нового environment
3. Назовите его "Warehouse API Local"
4. Добавьте следующие переменные:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:8080` | `http://localhost:8080` |
| `token` | (оставьте пустым) | (будет заполнено автоматически) |

### 2. Настройка Environment

- Выберите созданный environment в правом верхнем углу
- Теперь все запросы будут использовать переменные из этого environment

---

## Тестирование Endpoints

### 1. Health Check (Проверка работоспособности)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/health`
- Headers: не требуются

**Ожидаемый ответ:**
```json
{
  "db": "ok"
}
```

**Статус:** `200 OK`

---

### 2. Регистрация пользователя

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/register`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "roleId": 1,
  "name": "Иван",
  "surname": "Иванов",
  "patronymic": "Иванович"
}
```

**Ожидаемый ответ:**
```json
{
  "data": {
    "userId": 1,
    "email": "test@example.com",
    "name": "Иван",
    "surname": "Иванов",
    "patronymic": "Иванович",
    "roleId": 1
  }
}
```

**Статус:** `201 Created`

**Важно:** Сохраните `userId` для дальнейших тестов

---

### 3. Вход (Login)

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/login`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**Ожидаемый ответ:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 1,
      "email": "test@example.com",
      "name": "Иван",
      "surname": "Иванов",
      "patronymic": "Иванович",
      "roleId": 1
    }
  }
}
```

**Статус:** `200 OK`

**Важно:** 
1. Скопируйте значение `token` из ответа
2. В Postman перейдите в Environment
3. Вставьте токен в переменную `token`
4. Сохраните environment

---

### 4. Получение информации о текущем пользователе (Get Me)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/auth/me`
- Headers:
  - `Authorization: Bearer {{token}}`

**Ожидаемый ответ:**
```json
{
  "data": {
    "userId": 1,
    "email": "test@example.com",
    "name": "Иван",
    "surname": "Иванов",
    "patronymic": "Иванович",
    "roleId": 1
  }
}
```

**Статус:** `200 OK`

**Тест без токена:**
- Уберите заголовок `Authorization`
- Ожидаемый статус: `401 Unauthorized`
- Ожидаемый ответ:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "missing authorization header"
  }
}
```

---

### 5. Получение текущих остатков (Stock)

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/stock/current`
- Headers:
  - `Authorization: Bearer {{token}}`
- Query Parameters (опционально):
  - `warehouseId`: ID склада (например: `1`)
  - `limit`: количество записей (по умолчанию: `50`, максимум: `1000`)
  - `offset`: смещение для пагинации (по умолчанию: `0`)

**Примеры URL:**
- `{{base_url}}/api/v1/stock/current` - все остатки
- `{{base_url}}/api/v1/stock/current?warehouseId=1` - остатки на складе 1
- `{{base_url}}/api/v1/stock/current?limit=10&offset=0` - первые 10 записей

**Ожидаемый ответ:**
```json
{
  "data": [
    {
      "productId": 1,
      "warehouseId": 1,
      "currentQuantity": 100
    }
  ],
  "meta": {
    "limit": 50,
    "offset": 0
  }
}
```

**Статус:** `200 OK`

---

## Автоматизация в Postman

### Настройка автоматического сохранения токена

1. Создайте запрос "Login"
2. Перейдите на вкладку "Tests"
3. Добавьте следующий код:

```javascript
// Проверяем успешный ответ
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    
    // Сохраняем токен в переменную окружения
    if (jsonData.data && jsonData.data.token) {
        pm.environment.set("token", jsonData.data.token);
        console.log("Token saved:", jsonData.data.token);
    }
}
```

Теперь после каждого успешного логина токен будет автоматически сохраняться в переменную `token`.

---

## Тестирование ошибок

### 1. Неверные учетные данные

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/login`
- Body:
```json
{
  "email": "wrong@example.com",
  "password": "wrongpassword"
}
```

**Ожидаемый ответ:**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "invalid email or password"
  }
}
```

**Статус:** `401 Unauthorized`

---

### 2. Дубликат email при регистрации

**Request:**
- Method: `POST`
- URL: `{{base_url}}/api/v1/auth/register`
- Body (используйте email, который уже существует):
```json
{
  "email": "test@example.com",
  "password": "password123",
  "roleId": 1
}
```

**Ожидаемый ответ:**
```json
{
  "error": {
    "code": "USER_EXISTS",
    "message": "user with this email already exists"
  }
}
```

**Статус:** `409 Conflict`

---

### 3. Невалидные параметры пагинации

**Request:**
- Method: `GET`
- URL: `{{base_url}}/api/v1/stock/current?limit=-1`
- Headers:
  - `Authorization: Bearer {{token}}`

**Ожидаемый ответ:**
```json
{
  "error": {
    "code": "INVALID_LIMIT",
    "message": "limit must be between 1 and 1000"
  }
}
```

**Статус:** `400 Bad Request`

---

### 4. Истекший токен

1. Подождите 24 часа (время жизни токена)
2. Или создайте токен с неверным секретом
3. Попробуйте использовать токен в запросе

**Ожидаемый ответ:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "invalid or expired token"
  }
}
```

**Статус:** `401 Unauthorized`

---

## Создание Collection в Postman

### Рекомендуемая структура:

```
Warehouse Management API
├── Auth
│   ├── Register
│   ├── Login
│   └── Get Me
├── Stock
│   └── Get Current Stock
└── Health
    └── Health Check
```

### Настройка Pre-request Script для Collection

Если вы хотите, чтобы все запросы автоматически использовали токен:

1. Откройте Collection
2. Перейдите на вкладку "Pre-request Script"
3. Добавьте:

```javascript
// Автоматически добавляем токен, если он есть
var token = pm.environment.get("token");
if (token) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + token
    });
}
```

---

## Полезные советы

1. **Используйте переменные окружения** - это упростит переключение между dev/staging/production
2. **Сохраняйте примеры ответов** - создавайте примеры (Examples) для каждого endpoint
3. **Используйте Tests** - автоматизируйте проверки ответов
4. **Экспортируйте Collection** - сохраните коллекцию в файл для версионирования
5. **Используйте Pre-request Scripts** - для автоматической настройки заголовков

---

## Troubleshooting

### Проблема: "connection refused"

**Решение:** Убедитесь, что сервер запущен на порту 8080:
```bash
go run cmd/api/main.go
```

### Проблема: "database unavailable"

**Решение:** 
1. Проверьте, что PostgreSQL запущен
2. Проверьте настройки подключения в `.env` файле
3. Убедитесь, что база данных создана

### Проблема: "invalid token"

**Решение:**
1. Выполните запрос Login заново
2. Обновите переменную `token` в environment
3. Проверьте, что используете правильный формат: `Bearer <token>`

---

## Примеры полных запросов

### Полный пример запроса Login (cURL):

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Полный пример запроса Get Me (cURL):

```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```


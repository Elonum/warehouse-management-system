# Troubleshooting Guide

## Важно: Именование колонок в PostgreSQL

PostgreSQL **без кавычек** автоматически приводит имена колонок к **нижнему регистру**.

В вашей схеме БД колонки созданы без кавычек:
```sql
CREATE TABLE Users (
    userId SERIAL PRIMARY KEY,        -- становится userid
    passwordHash VARCHAR(255),         -- становится passwordhash
    roleId INTEGER,                   -- становится roleid
    "name" VARCHAR(100)               -- остается name (с кавычками)
);
```

**Все SQL запросы в коде используют lowercase имена колонок** для соответствия реальной структуре БД.

---

## Проблема: Ошибка при регистрации пользователя

### Симптомы
```json
{
    "error": {
        "code": "REGISTER_FAILED",
        "message": "failed to register user"
    }
}
```

### Возможные причины и решения

#### 1. Таблица Users не существует в БД

**Проверка:**
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'Users'
);
```

**Решение:**
- Убедитесь, что вы выполнили SQL скрипт создания схемы БД
- Проверьте, что таблица создана с правильными именами полей (с учетом регистра)

#### 2. Таблица UserRoles пуста или роль не существует

**Проверка:**
```sql
-- Проверьте существующие роли
SELECT * FROM UserRoles;

-- Если таблица пуста, создайте базовые роли
INSERT INTO UserRoles ("name") VALUES 
    ('Admin'),
    ('Manager'),
    ('Operator');
```

**Решение:**
- Убедитесь, что в таблице `UserRoles` есть записи
- При регистрации используйте существующий `roleId` (обычно 1, 2, 3 и т.д.)

#### 3. Foreign Key Constraint на roleId

**Проверка:**
```sql
-- Проверьте, что роль с указанным ID существует
SELECT * FROM UserRoles WHERE "roleId" = 1; -- замените 1 на ваш roleId
```

**Решение:**
- Используйте существующий `roleId` при регистрации
- Или создайте новую роль в таблице `UserRoles`

#### 4. Проблема с подключением к БД

**Проверка:**
- Проверьте логи сервера при запуске
- Убедитесь, что PostgreSQL запущен
- Проверьте настройки в `.env` файле:
  ```
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=your_password
  DB_NAME=warehouse
  ```

**Решение:**
- Убедитесь, что PostgreSQL запущен
- Проверьте правильность учетных данных
- Проверьте, что база данных создана

#### 5. Проблема с хешированием пароля

**Проверка:**
- Проверьте логи сервера - там должна быть детальная информация об ошибке

**Решение:**
- Обычно это не должно происходить, но если проблема повторяется, проверьте версию Go и библиотеки

---

## Диагностика через логи

После улучшений в коде, все ошибки теперь логируются. Проверьте логи сервера:

```bash
# Запустите сервер и смотрите логи
go run cmd/api/main.go
```

При ошибке регистрации вы увидите в логах:
```
ERROR Failed to register user email=test@example.com roleId=1 error=...
```

Это поможет точно определить причину проблемы.

---

## Быстрая проверка БД

Выполните следующие SQL запросы для проверки состояния БД:

```sql
-- 1. Проверка существования таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('Users', 'UserRoles');

-- 2. Проверка структуры таблицы Users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Users';

-- 3. Проверка существующих ролей
SELECT * FROM UserRoles;

-- 4. Проверка существующих пользователей
SELECT "userId", email, "roleId" FROM Users;
```

---

## Правильный запрос для регистрации

Убедитесь, что вы отправляете правильный запрос:

**POST** `http://localhost:8080/api/v1/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "test@example.com",
  "password": "password123",
  "roleId": 1,
  "name": "Иван",
  "surname": "Иванов"
}
```

**Важно:**
- `email` - обязательное поле, должно быть уникальным
- `password` - обязательное поле, минимум 6 символов
- `roleId` - должен существовать в таблице `UserRoles`
- `name`, `surname`, `patronymic` - опциональные поля

---

## Создание тестовых данных

Если у вас пустая БД, создайте тестовые данные:

```sql
-- Создайте роли
INSERT INTO UserRoles ("name") VALUES 
    ('Admin'),
    ('Manager'),
    ('Operator')
ON CONFLICT DO NOTHING;

-- Теперь можно регистрировать пользователей с roleId = 1, 2 или 3
```

---

## Проверка через Postman

1. Сначала проверьте Health endpoint:
   ```
   GET http://localhost:8080/api/v1/health
   ```
   Должен вернуть `{"db":"ok"}`

2. Если Health не работает, проблема в подключении к БД

3. Если Health работает, попробуйте регистрацию с правильными данными

---

## Контакты для помощи

Если проблема не решена:
1. Проверьте логи сервера (теперь они содержат детальную информацию)
2. Проверьте структуру БД (выполните SQL запросы выше)
3. Убедитесь, что все зависимости установлены


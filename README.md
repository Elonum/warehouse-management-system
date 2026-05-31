# Warehouse Management System

Система складского учёта: остатки на своих складах, журнал движений, заказы поставщикам, отгрузки на маркетплейсы, инвентаризации. Остатки WB и Ozon — только через API маркетплейсов, без хранения в БД.

**Стек:** Go · PostgreSQL · React · Vite · Tailwind

---

## Возможности

| Модуль | Описание |
|--------|----------|
| **Остатки** | Актуальные остатки по снапшотам + движения; фильтры, точка перезаказа |
| **Движения** | Журнал приходов, отгрузок и инвентаризаций |
| **Заказы поставщикам** | Приёмка, документы, статусы |
| **Отгрузки на МП** | WB / Ozon, импорт из кабинетов |
| **Инвентаризация** | Корректировки остатков |
| **Себестоимость** | История и оценка запасов |
| **Дашборд** | Сводка, низкие остатки, последние движения |

---

## Быстрый старт

### 1. База данных

```bash
createdb warehouse
psql -d warehouse -f database/schema.sql
psql -d warehouse -f database/vw_stock_movements.sql
psql -d warehouse -f database/vw_current_stock.sql
# опционально — тестовые данные (логин admin@warehouse.ru / password123):
psql -d warehouse -f database/test_values.sql
```

Подробнее о SQL-файлах: [`database/README.md`](database/README.md)

### 2. Backend

```bash
cp .env.example backend/.env
# заполните backend/.env

cd backend
go run ./cmd/api
```

API: `http://localhost:8080/api/v1` · Health: `GET /api/v1/health`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173`

---

## Конфигурация

Шаблон переменных: [`.env.example`](.env.example)

| Переменная | Назначение |
|------------|------------|
| `DB_*` | Подключение к PostgreSQL |
| `JWT_SECRET` | Подпись JWT (**обязательна** при `ENV=production`) |
| `FRONTEND_URL` | Ссылки сброса пароля, CORS |
| `WB_STATISTICS_TOKEN` | Остатки Wildberries |
| `WB_SUPPLIES_TOKEN` | Импорт поставок WB |
| `OZON_CLIENT_ID`, `OZON_API_KEY` | Ozon Seller API |

Интеграции МП опциональны — без токенов работают свои склады и документооборот.

---

## Структура проекта

```
backend/          Go API (Chi, pgx, JWT)
frontend/         React SPA (Vite, TanStack Query)
database/         schema.sql, views, seed-данные
backend/uploads/  Загруженные файлы (не в git)
```

---

## Безопасность

- `.env` и загрузки пользователей **не попадают в git** — см. `.gitignore`
- Документы отдаются только с JWT; изображения товаров — публичные
- В production задайте сильный `JWT_SECRET` (`ENV=production`)
- `database/test_values.sql` содержит **только dev-пароль** `password123` — не используйте в prod

---

## Разработка

```bash
# backend
cd backend && go test ./...

# frontend
cd frontend && npm run build
```

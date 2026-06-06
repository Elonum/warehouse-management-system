База данных для складского учёта с поддержкой:
- остатков товаров
- истории движений
- себестоимости
- нескольких складов
- маркетплейсов

## Описание SQL файлов

### `schema.sql`
Основная схема базы данных.

Содержит:
- товары (Products)
- склады (Warehouses)
- поставки от поставщиков
- отгрузки на маркетплейсы
- инвентаризации
- снапшоты остатков
- историю себестоимости

Используется для первоначального развёртывания БД.

---

### `migrations/002_product_costs_period_end_nullable.sql`
Делает `product_costs.period_end` nullable (открытый период без даты окончания).

**После обновления схемы выполните:** `psql ... -f database/migrations/002_product_costs_period_end_nullable.sql`

---

### `vw_stock_movements.sql`
Представление всех движений товара.

Объединяет в единый журнал:
- приход от поставщиков (только финальные заказы)
- отгрузки на маркетплейсы (списание / приём, финальные отгрузки)
- корректировки инвентаризации (только завершённые)

Используется API `GET /api/v1/stock/movements` и страницей «Движения товаров».

**После обновления схемы выполните:** `psql ... -f database/vw_stock_movements.sql`

---

### Снимки остатков (`stock_snapshots`)

Таблица базовых точек остатка по паре «товар + склад + дата». От последнего снимка на пару считается `vw_current_stock` и движения после `snapshot_date`.

- API: `GET /api/v1/stock-snapshots` (фильтры, пагинация, режим `view=journal|latest`)
- UI: страница «Снимки остатков» (`/stock-snapshots`)

Индекс `idx_stock_snapshots_date` ускоряет сортировку и фильтрацию по дате (см. `schema.sql`).

---

### `vw_stock_movements_since_snapshot.sql`
Представление движений **после последнего снапшота**.

Используется для:
- быстрого расчёта актуальных остатков
- минимизации объёма данных при расчётах

Работает совместно с `StockSnapshots`.

---

### `vw_current_stock.sql`
Основное представление актуальных остатков.

Логика:
- берёт последний снапшот
- прибавляет движения после него

Используется:
- в API
- в админке
- для аналитики

---

### `vw_stock_with_cost.sql`
Остатки с учётом себестоимости.

Добавляет:
- актуальную себестоимость товара
- общую стоимость остатков

Используется для:
- финансовой аналитики
- оценки складских запасов

---

### `vw_warehouse_stock_value.sql`
Суммарная стоимость остатков по складам.

Используется для:
- дашбордов
- отчётов
- оценки капитала в запасах

---

## Принцип работы остатков

1. Остатки фиксируются раз в месяц в `StockSnapshots`
2. Все движения хранятся отдельно
3. Актуальные остатки считаются как:
Snapshot + Movements

---

### `test_values.sql`
Демо-набор данных для разработки и интеграционных тестов.

Содержит связанные данные по всем сущностям:
- 6 ролей и пользователей (пароль `password123`, админ `admin@warehouse.ru`)
- 10 товаров с `reorder_point`, изображениями и себестоимостью (закрытый + открытый период)
- 6 складов (3 своих + 3 МП)
- заказы поставщикам (в т.ч. подзаказ), отгрузки на WB/Ozon/ЯМ, инвентаризации
- снапшоты на `2026-05-31` и движения после них (приёмки, отгрузки, корректировки)
- финальные статусы (`is_final`) для корректной работы `vw_stock_movements`

**Загрузка на пустую БД:**
```bash
psql -d warehouse -f database/schema.sql
psql -d warehouse -f database/vw_stock_movements.sql
psql -d warehouse -f database/vw_current_stock.sql
psql -d warehouse -f database/vw_stock_movements_since_snapshot.sql
psql -d warehouse -f database/vw_stock_with_cost.sql
psql -d warehouse -f database/vw_warehouse_stock_value.sql
psql -d warehouse -f database/test_values.sql
```

**Перезагрузка демо-данных:**
```bash
psql -d warehouse -f database/clear_all_data.sql
psql -d warehouse -f database/test_values.sql
```

---

### `clear_all_data.sql`
Удаляет все строки из бизнес-таблиц (включая `product_images`, `password_reset_tokens`), сохраняя схему.
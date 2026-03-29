# Руководство: импорт принятых количеств из Wildberries (FBW Supplies)

Документ для разработчика: как устроена интеграция end-to-end, где лежит код и как его развивать.

---

## 1. Зачем это нужно

Отгрузки на маркетплейсы в системе хранятся в таблицах `mp_shipments` и `mp_shipment_items`. Поле **`accepted_qty`** у позиции — сколько единиц маркетплейс **принял** на своём складе. Раньше это могли заносить вручную или из Excel; теперь источником правды может быть **официальный API Wildberries** в разделе **FBW Supplies** (поставки на склады WB).

Документация WB: [FBW Supplies](https://dev.wildberries.ru/en/openapi/orders-fbw) и [авторизация](https://dev.wildberries.ru/en/openapi/api-information#tag/Authorization).

---

## 2. Общая схема

```
┌─────────────┐     HTTPS (токен Supplies)      ┌──────────────────────────────┐
│   Backend   │ ──────────────────────────────►│ supplies-api.wildberries.ru  │
│  (наш API)  │ ◄──────────────────────────────│ GET supplies/{id}, .../goods   │
└──────┬──────┘                                └──────────────────────────────┘
       │
       │  читает/обновляет PostgreSQL
       ▼
┌──────────────────┐
│ mp_shipments     │  агрегаты: sent_qty, accepted_qty (пересчёт из строк)
│ mp_shipment_items│ accepted_qty по позиции
│ products         │ article, barcode для сопоставления с WB
└──────────────────┘

┌─────────────┐  JWT   ┌─────────────┐
│  Frontend   │ ◄────► │ Backend API │
│  (React)    │        │ /mp-shipments/.../import/wildberries/...
└─────────────┘        └─────────────┘
```

**Важно:** токен WB хранится **только на сервере** (`WB_SUPPLIES_TOKEN`), в браузер не передаётся.

---

## 3. Backend — структура файлов

| Путь | Назначение |
|------|------------|
| `internal/config/config.go` | Поля `WbSuppliesToken`, `WbSuppliesBaseURL` из переменных окружения |
| `internal/integration/wildberries/client.go` | HTTP-клиент: детали поставки и товары с пагинацией |
| `internal/integration/wildberries/list_supplies.go` | `POST /api/v1/supplies` WB — список поставок |
| `internal/service/wildberries_client.go` | Фабрика клиента по `config` (проверка токена) |
| `internal/dto/wildberries_import.go` | JSON превью/применения импорта |
| `internal/dto/wildberries_supplies_list.go` | JSON списка поставок (наш контракт → UI) |
| `internal/service/wildberries_import_service.go` | Импорт: сопоставление, распределение количеств, `SetAcceptedQty` |
| `internal/service/wildberries_supply_list_service.go` | Список поставок WB без записи в PostgreSQL |
| `internal/service/mp_shipment_item_service.go` | `SetAcceptedQty` — только «принято», пересчёт агрегатов отгрузки |
| `internal/httpapi/handlers/wildberries_import.go` | `Preview` / `Apply` |
| `internal/httpapi/handlers/wildberries_supply_list.go` | `List` — прокси списка поставок |
| `internal/httpapi/router.go` | Маршруты, в т.ч. `/integrations/wildberries/supplies/list` |

---

## 4. Backend — переменные окружения

| Переменная | Обязательность | Описание |
|------------|----------------|----------|
| `WB_SUPPLIES_TOKEN` | Да, для работы импорта | Токен из кабинета WB с доступом к категории **Supplies** (Поставки) |
| `WB_SUPPLIES_BASE_URL` | Нет | По умолчанию `https://supplies-api.wildberries.ru` |

Без токена сервис возвращает ошибку `ErrWbSuppliesTokenNotConfigured`, API отвечает кодом вроде `WB_SUPPLIES_TOKEN_MISSING`.

---

## 5. Backend — API Wildberries, что вызываем

Базовый хост документирован в разделе connection check: для Supplies это `https://supplies-api.wildberries.ru`.

Заголовок запросов:

```http
Authorization: <значение токена>
```

(как в официальной документации WB, без префикса `Bearer` для этого сервиса.)

Используемые методы:

1. **`GET /api/v1/supplies/{ID}`** — сводка по поставке (статус, склад, принято всего в шапке и т.д.). Параметр `isPreorderID=true`, если вместо ID поставки передан ID предзаказа.
2. **`GET /api/v1/supplies/{ID}/goods?limit=1000&offset=...`** — строки товаров. В ответе для каждой строки важны поля вроде `barcode`, `vendorCode`, `nmID`, **`acceptedQuantity`**. Клиент в `FetchAllSupplyGoods` крутит `offset`, пока страница не станет короче лимита.
3. **`POST /api/v1/supplies?limit=&offset=`** — список поставок. Тело JSON: `dates` (массив диапазонов с полем `type`: `factDate` / `supplyDate` / …), `statusIDs` (фильтр по статусам WB).

---

## 6. Backend — эндпоинты нашего API

Все под защитой JWT (как остальной `/api/v1` после логина).

### Превью (ничего не пишет в БД)

```http
POST /api/v1/mp-shipments/{shipmentId}/import/wildberries/preview
Content-Type: application/json

{
  "supplyId": 38047690,
  "matchBy": "barcode",
  "isPreorderID": false
}
```

- `matchBy`: `"barcode"` — сопоставлять строки WB с товарами по полю `products.barcode` и `barcode` из WB; `"vendor_code"` — по `products.article` и `vendorCode` из WB.
- `isPreorderID`: передать `true`, если в `supplyId` у вас ID заказа (preorder), а не поставки — это пробрасывается в query WB как у них в доке.

Ответ обёрнут в стандартный `{ "data": { ... } }` (см. `dto.APIResponse`).

### Применение (обновляет `accepted_qty` в БД)

```http
POST /api/v1/mp-shipments/{shipmentId}/import/wildberries/apply
Content-Type: application/json

{
  "supplyId": 38047690,
  "matchBy": "barcode",
  "isPreorderID": false
}
```

Логика расчёта та же, что в превью; затем для каждой позиции отгрузки, у которой новое «принято» отличается от текущего, вызывается `SetAcceptedQty`.

### Список поставок с WB (прокси для UI)

```http
POST /api/v1/integrations/wildberries/supplies/list
Content-Type: application/json

{
  "limit": 100,
  "offset": 0,
  "statusIds": [4, 5],
  "dates": [{ "from": "2026-01-01", "till": "2026-12-31", "type": "factDate" }]
}
```

Ответ: `{ "data": { "items": [ { "importId", "importAsPreorder", "statusId", "supplyDate", ... } ] } }`. Поля **`importId`** и **`importAsPreorder`** нормализованы под уже существующий импорт: если в ответе WB есть `supplyID`, используется он и флаг предзаказа `false`; иначе — `preorderID` и `true`.

**Нужна ли таблица в БД для списка?** Для текущей задачи — **нет**: данные каждый раз запрашиваются у WB, остаются актуальными, не дублируют хранилище маркетплейса. Отдельную таблицу имеет смысл вводить только если понадобятся офлайн-история, аудит снимков, уменьшение числа вызовов WB или связь с внутренними сущностями без повторного опроса API.

---

## 7. Backend — логика сопоставления и распределения (ядро)

### 7.1 Загрузка данных

1. Загружаются все позиции отгрузки (`mp_shipment_items` для данного `shipment_id`).
2. Для каждого уникального `product_id` подгружается товар (`products`) — нужны `article` и `barcode`.
3. Загружаются **все** строки товаров поставки из WB (с пагинацией).

### 7.2 Сопоставление строк WB с товарами отгрузки

Для каждой строки из WB:

- Перебираются товары, которые участвуют в этой отгрузке (не весь справочник — только те `product_id`, что есть в строках отгрузки).
- Режим **barcode**: совпадение `trim(WB.barcode)` с `trim(product.barcode)` (оба непустые).
- Режим **vendor_code**: совпадение `trim(WB.vendorCode)` с `trim(product.article)`.

Если ни один товар отгрузки не подошёл — строка попадает в **`unmatchedGoods`** (для прозрачности в UI).

Если подошёл товар с `product_id = P`:

- В `wbSeen[P] = true` фиксируется, что по этому товару была хотя бы одна строка WB (даже с нулевым принятым).
- В `wbTotals[P]` суммируется `acceptedQuantity` (только положительные вклады в сумму; нули не увеличивают сумму, но уже учтены в `wbSeen`).

### 7.3 Распределение по строкам отгрузки (несколько позиций с одним товаром)

Сумма **`wbTotals[product_id]`** — сколько WB принял по этому товару в целом. Её нужно разложить по **нескольким строкам** отгрузки с тем же `product_id`, не превышая у каждой строки **`sent_qty`**.

Алгоритм: порядок строк как в репозитории (`ORDER BY shipment_item_id`). Для каждой строки:

- `take = min(remaining[product_id], sent_qty строки)`
- `remaining[product_id] -= take`
- В превью/импорте в строку попадает `take` как новое **import accepted**.

Если после разнесения по строкам у `remaining[product_id]` осталось **> 0**, добавляется **warning** (избыток принятого по WB относительно суммы «отправлено» по строкам).

### 7.4 Ограничения при записи

`SetAcceptedQty`:

- не даёт менять отгрузку в **финальном** статусе (`ErrMpShipmentCompleted`);
- не даёт `accepted_qty > sent_qty` и `< 0`;
- обновляет строку через существующий `Update` репозитория и вызывает **`recalcAndUpdateShipmentAggregates`** — пересчитываются `positions_qty`, `sent_qty`, `accepted_qty` в `mp_shipments`.

---

## 8. Backend — обработка ошибок (кратко)

| Ситуация | Поведение |
|----------|-----------|
| Нет `WB_SUPPLIES_TOKEN` | 400, код `WB_SUPPLIES_TOKEN_MISSING` |
| Отгрузка не найдена | 404 / `SHIPMENT_NOT_FOUND` |
| Завершённая отгрузка при apply | 400, `SHIPMENT_COMPLETED` |
| Неверные количества | 400, `INVALID_QUANTITY` |
| Сбой HTTP к WB | текст ошибки в сообщении (часто 400/502 в зависимости от хендлера) |

При развитии можно централизованно мапить сетевые/429 от WB на retry и понятные коды.

---

## 9. Frontend — структура

| Путь | Назначение |
|------|------------|
| `frontend/api/apiClient.js` | `wildberriesPreview` / `wildberriesApply`; `integrations.wildberries.listSupplies` |
| `frontend/pages/ShipmentImportWildberries.jsx` | Страница: picker, форма, превью, применение |
| `frontend/features/mpShipments/import/WildberriesSuppliesPicker.jsx` | Список поставок WB и кнопка «Выбрать» |
| `frontend/lib/i18n.jsx` | Ключи `shipments.import.wb*` (RU/EN) |
| `frontend/src/App.jsx` | Маршрут на страницу импорта (уже был) |

Query-параметр **`?shipmentId=`** при открытии страницы подставляет выбранную отгрузку в селектор.

---

## 10. Frontend — поток UX

1. Пользователь выбирает **отгрузку** в системе (список из `api.mpShipments.list`).
2. По желанию загружает **список поставок WB** и нажимает «Выбрать» у строки — подставляется ID и флаг предзаказа; либо вводит **supply / preorder ID** вручную.
3. Выбирает **способ сопоставления**: штрихкод или артикул продавца.
4. При необходимости включает **«preorder»** — если ID относится к заказу, а не к поставке (соответствует флагу WB).
5. **«Загрузить превью»** — POST preview, показ сводки поставки, таблицы строк, несопоставленных строк WB, предупреждений.
6. **«Применить к отгрузке»** — POST apply; после успеха инвалидируются кеши React Query для отгрузок и позиций, снова запрашивается превью для актуальных чисел.

Ошибки API приходят как `ApiError` с `message` и показываются в алерте на странице.

---

## 11. Как развивать дальше (идеи)

1. **Список поставок WB в UI** — вызов `POST /api/v1/supplies` на бэкенде (прокси), чтобы не копировать ID вручную. Понадобится отдельный метод в клиенте WB и эндпоинт с фильтрами по датам/статусам (например только статусы 4–5 «приёмка / принято»).
2. **Сопоставление по nmID** — если в `products` появится поле под WB `nmID`, можно добавить третий режим `matchBy`.
3. **Песочница WB** — отдельный base URL для тестового токена (см. документацию WB по sandbox).
4. **Аудит** — логировать кто и когда применил импорт (user id из JWT).
5. **Частичный импорт** — применять только выбранные строки превью (потребует изменения контракта apply).

---

## 12. Связь со старой Excel-логикой

Историческая таблица из скриншота (дата поставки, номер поставки, артикул, склад, статус, баркод, количество, nmID и т.д.) соответствует тому, что даёт API:

- номер поставки → ваш `supplyId`;
- баркод / артикул / принятое количество → поля в `/goods` и сопоставление с вашими товарами;
- статус и склад → `GET /supplies/{id}` для сводки на экране превью.

Так вы можете проверять цифры «как раньше в таблице», но источник — API.

---

*Файл можно дополнять по мере доработок (Ozon, список поставок, аудит).*

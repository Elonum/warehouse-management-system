CREATE OR REPLACE VIEW vw_warehouse_stock_value AS
SELECT
    warehouseId,
    SUM(stockTotalCost) AS warehouseTotalCost
FROM vw_stock_with_cost
GROUP BY warehouseId;

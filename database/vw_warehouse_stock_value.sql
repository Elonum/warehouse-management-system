CREATE OR REPLACE VIEW vw_warehouse_stock_value AS
SELECT
    warehouse_id,
    SUM(stock_total_cost) AS warehouse_total_cost
FROM vw_stock_with_cost
GROUP BY warehouse_id;

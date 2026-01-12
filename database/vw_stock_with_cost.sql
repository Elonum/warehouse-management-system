CREATE OR REPLACE VIEW vw_stock_with_cost AS
SELECT
    cs.product_id,
    cs.warehouse_id,
    cs.current_quantity,

    pc.unit_cost_to_warehouse,

    cs.current_quantity * pc.unit_cost_to_warehouse
        AS stock_total_cost
FROM vw_current_stock cs
JOIN product_costs pc
    ON pc.product_id = cs.product_id
   AND CURRENT_DATE BETWEEN pc.period_start AND pc.period_end;

CREATE OR REPLACE VIEW vw_stock_with_cost AS
SELECT
    cs.productId,
    cs.warehouseId,
    cs.currentQuantity,

    pc.unitCostToWarehouse,

    cs.currentQuantity * pc.unitCostToWarehouse
        AS stockTotalCost

FROM vw_current_stock cs

JOIN ProductCosts pc
    ON pc.productId = cs.productId
   AND CURRENT_DATE BETWEEN pc.periodStart AND pc.periodEnd;

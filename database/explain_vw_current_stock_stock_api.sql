-- Validate plans for GetCurrentStock: vw_current_stock + JOIN products + optional filters.
-- Replace UUIDs/literals with real values from your environment. Run after: ANALYZE products; on large data.

EXPLAIN (ANALYZE, BUFFERS)
SELECT cs.product_id, cs.warehouse_id, cs.current_quantity, p.reorder_point
FROM vw_current_stock cs
JOIN products p ON p.product_id = cs.product_id
WHERE 1 = 1
  -- AND cs.warehouse_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND (p.article ILIKE '%demo%' OR p.barcode ILIKE '%demo%')
  -- AND cs.current_quantity > 0
  -- AND cs.current_quantity <= p.reorder_point
ORDER BY p.article ASC, cs.product_id ASC
LIMIT 50 OFFSET 0;

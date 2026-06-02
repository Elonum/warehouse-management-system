package repository

// Shared SQL for resolving the active product cost period (open-ended periods supported).
const activeProductCostLateral = `
LEFT JOIN LATERAL (
	SELECT pc.unit_cost_to_warehouse
	FROM product_costs pc
	WHERE pc.product_id = cs.product_id
	  AND CURRENT_DATE >= pc.period_start
	  AND (pc.period_end IS NULL OR CURRENT_DATE <= pc.period_end)
	ORDER BY pc.period_start DESC
	LIMIT 1
) ac ON true`

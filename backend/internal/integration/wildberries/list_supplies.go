package wildberries

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// ListSuppliesFilter is the JSON body for POST /api/v1/supplies (Wildberries FBW).
type ListSuppliesFilter struct {
	Dates     []DateFilter `json:"dates,omitempty"`
	StatusIDs []int        `json:"statusIDs,omitempty"`
}

// DateFilter mirrors WB date range items (type: supplyDate | factDate | createDate, etc.).
type DateFilter struct {
	From string `json:"from"`
	Till string `json:"till"`
	Type string `json:"type"`
}

// SupplyListRow matches WB list item shape; optional numeric IDs are pointers for null JSON.
type SupplyListRow struct {
	SupplyID      *int64 `json:"supplyID"`
	PreorderID    *int64 `json:"preorderID"`
	CreateDate    string `json:"createDate"`
	SupplyDate    string `json:"supplyDate"`
	FactDate      string `json:"factDate"`
	UpdatedDate   string `json:"updatedDate"`
	StatusID      int    `json:"statusID"`
	BoxTypeID     int    `json:"boxTypeID"`
	Phone         string `json:"phone"`
	IsBoxOnPallet *bool  `json:"isBoxOnPallet"`
}

// ListSupplies calls POST /api/v1/supplies with query limit/offset and JSON body.
func (c *Client) ListSupplies(ctx context.Context, limit, offset int, filter ListSuppliesFilter) ([]SupplyListRow, error) {
	if limit < 1 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}
	u := fmt.Sprintf("%s/api/v1/supplies?limit=%d&offset=%d", c.baseURL, limit, offset)

	bodyBytes, err := json.Marshal(filter)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 8<<20))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wildberries supplies POST /supplies: status %d: %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var rows []SupplyListRow
	if err := json.Unmarshal(respBody, &rows); err != nil {
		return nil, fmt.Errorf("wildberries supplies: decode supplies list: %w", err)
	}
	return rows, nil
}

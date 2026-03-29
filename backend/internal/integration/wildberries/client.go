package wildberries

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Client calls Wildberries FBW Supplies HTTP API (supplies-api.wildberries.ru).
// Token: personal/base token with «Supplies» category; send as Authorization header value.
type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
}

func NewClient(baseURL, token string) *Client {
	return &Client{
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		token:   strings.TrimSpace(token),
		httpClient: &http.Client{
			Timeout: 90 * time.Second,
		},
	}
}

type SupplyDetail struct {
	StatusID           int    `json:"statusID"`
	WarehouseName      string `json:"warehouseName"`
	AcceptedQuantity   int    `json:"acceptedQuantity"`
	SupplyDate         string `json:"supplyDate"`
	FactDate           string `json:"factDate"`
	UpdatedDate        string `json:"updatedDate"`
	SupplierAssignName string `json:"supplierAssignName"`
}

type SupplyGood struct {
	Barcode          string `json:"barcode"`
	VendorCode       string `json:"vendorCode"`
	NmID             int64  `json:"nmID"`
	TechSize         string `json:"techSize"`
	AcceptedQuantity int    `json:"acceptedQuantity"`
	Quantity         int    `json:"quantity"`
}

func (c *Client) GetSupply(ctx context.Context, supplyID int64, isPreorderID bool) (*SupplyDetail, error) {
	u := fmt.Sprintf("%s/api/v1/supplies/%d", c.baseURL, supplyID)
	if isPreorderID {
		u += "?isPreorderID=true"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", c.token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("wildberries supplies GET /supplies/{id}: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var detail SupplyDetail
	if err := json.Unmarshal(body, &detail); err != nil {
		return nil, fmt.Errorf("wildberries supplies: decode detail: %w", err)
	}
	return &detail, nil
}

// FetchAllSupplyGoods loads all pages (limit 1000) for GET /api/v1/supplies/{id}/goods.
func (c *Client) FetchAllSupplyGoods(ctx context.Context, supplyID int64, isPreorderID bool) ([]SupplyGood, error) {
	const pageSize = 1000
	var all []SupplyGood
	for offset := 0; ; offset += pageSize {
		u := fmt.Sprintf("%s/api/v1/supplies/%d/goods?limit=%d&offset=%d", c.baseURL, supplyID, pageSize, offset)
		if isPreorderID {
			u += "&isPreorderID=true"
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", c.token)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, err
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, readErr
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("wildberries supplies GET /supplies/{id}/goods: status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
		}

		var chunk []SupplyGood
		if err := json.Unmarshal(body, &chunk); err != nil {
			return nil, fmt.Errorf("wildberries supplies: decode goods: %w", err)
		}
		all = append(all, chunk...)
		if len(chunk) < pageSize {
			break
		}
	}
	return all, nil
}

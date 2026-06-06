package ozon

import (
	"fmt"
	"strings"

	"warehouse-backend/internal/integration/integrationlog"
)

type stageStat struct {
	apiItems   int
	parsedRows int
	detail     string
}

// FetchMeta describes which Ozon endpoints were tried.
type FetchMeta struct {
	Source string
	Stages []string
}

func (m FetchMeta) Summary() string {
	return joinStages(m.Stages)
}

func (m *FetchMeta) record(baseURL, path string, stat stageStat, err error) {
	call := integrationlog.OzonPOST(baseURL, path)
	line := fmt.Sprintf("%s %s: api_items=%d parsed_rows=%d", call.Method, call.FullURL(), stat.apiItems, stat.parsedRows)
	if stat.detail != "" {
		line += " " + stat.detail
	}
	if err != nil {
		line += fmt.Sprintf(" err=%v", err)
	} else if stat.parsedRows == 0 {
		line += " empty"
	}
	m.Stages = append(m.Stages, line)
}

func joinStages(stages []string) string {
	if len(stages) == 0 {
		return "no stages"
	}
	out := stages[0]
	for i := 1; i < len(stages); i++ {
		out += "; " + stages[i]
	}
	return out
}

// SourceExternalCall maps a successful fetch source label to the upstream Ozon endpoint.
func SourceExternalCall(baseURL, source string) integrationlog.ExternalCall {
	path := strings.TrimSpace(source)
	if path != "" && !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	return integrationlog.OzonPOST(baseURL, path)
}

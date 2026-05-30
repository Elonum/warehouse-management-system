package ozon

import "fmt"

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

func (m *FetchMeta) record(endpoint string, stat stageStat, err error) {
	line := fmt.Sprintf("%s: api_items=%d parsed_rows=%d", endpoint, stat.apiItems, stat.parsedRows)
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

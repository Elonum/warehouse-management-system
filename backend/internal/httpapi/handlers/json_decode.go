package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

const defaultJSONBodyLimitBytes int64 = 1 << 20 // 1 MiB

var errEmptyJSONBody = errors.New("empty JSON body")

func decodeJSONBody(w http.ResponseWriter, r *http.Request, dst any) error {
	return decodeJSONBodyWithLimit(w, r, dst, defaultJSONBodyLimitBytes, false)
}

func decodeJSONBodyAllowEmpty(w http.ResponseWriter, r *http.Request, dst any) error {
	return decodeJSONBodyWithLimit(w, r, dst, defaultJSONBodyLimitBytes, true)
}

func decodeJSONBodyWithLimit(w http.ResponseWriter, r *http.Request, dst any, maxBytes int64, allowEmpty bool) error {
	if ct := r.Header.Get("Content-Type"); ct != "" && !strings.Contains(strings.ToLower(ct), "application/json") {
		return errors.New("content type must be application/json")
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		if errors.Is(err, io.EOF) && allowEmpty {
			return nil
		}
		if errors.Is(err, io.EOF) {
			return errEmptyJSONBody
		}
		return err
	}

	var extra any
	if err := dec.Decode(&extra); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain a single JSON object")
	}
	return nil
}

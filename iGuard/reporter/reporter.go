package reporter

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Kferreira69/iguard/checks"
	"github.com/Kferreira69/iguard/config"
)

// Submit POSTs the compliance report to the iComply API.
// It returns an error if the request fails or the server responds with a non-2xx status.
func Submit(cfg *config.Config, report checks.ComplianceReport) error {
	if cfg.DeviceToken == "" {
		return fmt.Errorf("device_token is not set; run 'iguard setup' first")
	}
	if cfg.APIURL == "" {
		return fmt.Errorf("api_url is not set; run 'iguard setup' first")
	}

	body, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("marshalling report: %w", err)
	}

	url := cfg.APIURL + "/iguard/report"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+cfg.DeviceToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "iGuard/"+report.AgentVersion)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sending report to %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return fmt.Errorf("API returned HTTP %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

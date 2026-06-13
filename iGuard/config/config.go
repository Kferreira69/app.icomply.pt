package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

const defaultReportEvery = 24

// Config holds agent configuration persisted to ~/.iguard/config.json.
type Config struct {
	DeviceToken string `json:"device_token"`
	APIURL      string `json:"api_url"`
	DeviceName  string `json:"device_name"`
	Hostname    string `json:"hostname"`
	// ReportEvery is the interval in hours between automatic reports (default 24).
	ReportEvery int `json:"report_every_hours"`
}

// DefaultPath returns the canonical path to the config file.
func DefaultPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		// Fallback – should never happen on a healthy system.
		switch runtime.GOOS {
		case "windows":
			home = os.Getenv("USERPROFILE")
		default:
			home = "/tmp"
		}
	}
	return filepath.Join(home, ".iguard", "config.json")
}

// Load reads the config from DefaultPath.
func Load() (*Config, error) {
	path := DefaultPath()
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config %s: %w", path, err)
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}
	if cfg.ReportEvery <= 0 {
		cfg.ReportEvery = defaultReportEvery
	}
	return &cfg, nil
}

// Save writes cfg to DefaultPath with mode 0600.
func Save(c *Config) error {
	path := DefaultPath()
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("creating config dir %s: %w", dir, err)
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("marshalling config: %w", err)
	}
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("writing config %s: %w", path, err)
	}
	return nil
}

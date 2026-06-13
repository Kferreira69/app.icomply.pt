//go:build linux

package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"text/template"
)

var unitTemplate = template.Must(template.New("unit").Parse(`[Unit]
Description=iGuard Endpoint Compliance Agent
After=network.target

[Service]
Type=oneshot
ExecStart={{.BinaryPath}} run
StandardOutput=append:{{.LogPath}}
StandardError=append:{{.LogPath}}

[Install]
WantedBy=default.target
`))

var timerTemplate = template.Must(template.New("timer").Parse(`[Unit]
Description=iGuard Compliance Check Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec={{.IntervalHours}}h

[Install]
WantedBy=timers.target
`))

const unitName = "iguard"

func unitDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".config", "systemd", "user")
	return dir, os.MkdirAll(dir, 0700)
}

func logPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".iguard", "logs")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}
	return filepath.Join(dir, "iguard.log"), nil
}

// Install creates systemd user unit + timer files and enables them.
func Install(intervalHours int) error {
	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolving binary: %w", err)
	}
	lp, err := logPath()
	if err != nil {
		return err
	}
	dir, err := unitDir()
	if err != nil {
		return err
	}

	// Write service unit.
	sf, err := os.OpenFile(filepath.Join(dir, unitName+".service"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer sf.Close()
	if err := unitTemplate.Execute(sf, struct {
		BinaryPath string
		LogPath    string
	}{self, lp}); err != nil {
		return err
	}

	// Write timer unit.
	tf, err := os.OpenFile(filepath.Join(dir, unitName+".timer"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer tf.Close()
	if err := timerTemplate.Execute(tf, struct{ IntervalHours int }{intervalHours}); err != nil {
		return err
	}

	if err := systemctlUser("daemon-reload"); err != nil {
		return err
	}
	return systemctlUser("enable", "--now", unitName+".timer")
}

// Uninstall disables and removes the systemd units.
func Uninstall() error {
	_ = systemctlUser("disable", "--now", unitName+".timer")
	dir, err := unitDir()
	if err != nil {
		return err
	}
	for _, f := range []string{unitName + ".service", unitName + ".timer"} {
		p := filepath.Join(dir, f)
		if err := os.Remove(p); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return systemctlUser("daemon-reload")
}

// Start starts the service timer immediately.
func Start() error {
	return systemctlUser("start", unitName+".timer")
}

// Stop stops the service timer.
func Stop() error {
	return systemctlUser("stop", unitName+".timer")
}

func systemctlUser(args ...string) error {
	args = append([]string{"--user"}, args...)
	out, err := exec.Command("systemctl", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("systemctl %v: %s: %w", args, string(out), err)
	}
	return nil
}

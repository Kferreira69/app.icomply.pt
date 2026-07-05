//go:build windows

package service

import (
	"fmt"
	"os"
	"os/exec"
)

const taskName = "iComply_iGuard"

// Install registers iGuard as a Windows Task Scheduler task.
func Install(intervalHours int) error {
	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolving binary path: %w", err)
	}
	// Use schtasks to create a task that runs every N hours.
	// /SC HOURLY /MO N runs the task every N hours.
	// We use the current user's account (/RU "") so no password is needed.
	cmd := exec.Command("schtasks", "/Create", "/F",
		"/TN", taskName,
		"/TR", fmt.Sprintf(`"%s" run`, self),
		"/SC", "HOURLY",
		"/MO", fmt.Sprintf("%d", intervalHours),
		"/RL", "HIGHEST",
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks /Create: %s: %w", string(out), err)
	}
	return nil
}

// Uninstall removes the scheduled task.
func Uninstall() error {
	out, err := exec.Command("schtasks", "/Delete", "/F", "/TN", taskName).CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks /Delete: %s: %w", string(out), err)
	}
	return nil
}

// Start runs the scheduled task immediately.
func Start() error {
	out, err := exec.Command("schtasks", "/Run", "/TN", taskName).CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks /Run: %s: %w", string(out), err)
	}
	return nil
}

// Stop ends the running scheduled task.
func Stop() error {
	out, err := exec.Command("schtasks", "/End", "/TN", taskName).CombinedOutput()
	if err != nil {
		return fmt.Errorf("schtasks /End: %s: %w", string(out), err)
	}
	return nil
}

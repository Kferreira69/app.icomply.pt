//go:build darwin

package checks

import (
	"os/exec"
	"strconv"
	"strings"
)

// checkScreenLock returns (enabled, timeoutMinutes).
func checkScreenLock() (bool, int) {
	// askForPassword == 1 means the screensaver requires a password.
	askOut, err := exec.Command("defaults", "read",
		"com.apple.screensaver", "askForPassword").Output()
	if err != nil {
		return false, 0
	}
	enabled := strings.TrimSpace(string(askOut)) == "1"

	// idleTime is in seconds.
	idleOut, err := exec.Command("defaults", "read",
		"com.apple.screensaver", "idleTime").Output()
	if err != nil {
		return enabled, 0
	}
	secs, err := strconv.Atoi(strings.TrimSpace(string(idleOut)))
	if err != nil || secs <= 0 {
		return enabled, 0
	}
	minutes := secs / 60
	if minutes == 0 {
		minutes = 1 // round sub-minute values up
	}
	return enabled, minutes
}

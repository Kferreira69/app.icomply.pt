//go:build darwin

package checks

import (
	"os/exec"
	"strconv"
	"strings"
)

func getOSVersion() string {
	out, err := exec.Command("sw_vers", "-productVersion").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

func checkOSPatch() bool {
	verStr := getOSVersion()
	parts := strings.Split(verStr, ".")
	if len(parts) == 0 {
		return false
	}
	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return false
	}
	// macOS 13 (Ventura) or newer is considered current enough.
	// Adjust the threshold as new releases ship.
	if major >= 13 {
		// Also check for pending software updates.
		out, err := exec.Command("softwareupdate", "-l").Output()
		if err != nil {
			// If we cannot query, assume up-to-date on a recent major version.
			return true
		}
		// "No new software available" means up-to-date.
		return strings.Contains(string(out), "No new software available")
	}
	return false
}

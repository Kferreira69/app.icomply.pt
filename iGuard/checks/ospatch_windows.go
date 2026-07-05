//go:build windows

package checks

import (
	"os/exec"
	"strings"
	"time"
)

func getOSVersion() string {
	out, err := exec.Command("powershell", "-NonInteractive", "-Command",
		"[System.Environment]::OSVersion.Version.ToString()").Output()
	if err != nil {
		return "unknown"
	}
	return strings.TrimSpace(string(out))
}

func checkOSPatch() bool {
	// Get the InstalledOn date of the most recent hotfix.
	out, err := exec.Command("powershell", "-NonInteractive", "-Command",
		`(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn`).Output()
	if err != nil || len(strings.TrimSpace(string(out))) == 0 {
		return false
	}
	raw := strings.TrimSpace(string(out))
	// PowerShell returns dates in locale-specific format; parse what we can.
	for _, layout := range []string{
		"1/2/2006 3:04:05 PM",
		"01/02/2006 15:04:05",
		"2006-01-02 15:04:05",
		"2/1/2006 3:04:05 PM",
	} {
		t, err := time.Parse(layout, raw)
		if err == nil {
			return time.Since(t) < 30*24*time.Hour
		}
	}
	return false
}

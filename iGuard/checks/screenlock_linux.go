//go:build linux

package checks

import (
	"os/exec"
	"strconv"
	"strings"
)

func checkScreenLock() (bool, int) {
	// GNOME: check org.gnome.desktop.screensaver lock-enabled
	lockOut, err := exec.Command("gsettings", "get",
		"org.gnome.desktop.screensaver", "lock-enabled").Output()
	if err == nil {
		enabled := strings.TrimSpace(string(lockOut)) == "true"
		// idle-delay is in seconds (uint32 XX)
		delayOut, err2 := exec.Command("gsettings", "get",
			"org.gnome.desktop.session", "idle-delay").Output()
		if err2 == nil {
			raw := strings.TrimSpace(string(delayOut))
			// gsettings returns "uint32 300" format
			parts := strings.Fields(raw)
			val := parts[len(parts)-1]
			secs, err3 := strconv.Atoi(val)
			if err3 == nil && secs > 0 {
				minutes := secs / 60
				if minutes == 0 {
					minutes = 1
				}
				return enabled, minutes
			}
		}
		return enabled, 0
	}

	// KDE fallback: check kscreenlocker via xset
	out, err := exec.Command("xset", "q").Output()
	if err != nil {
		return false, 0
	}
	// xset q output contains "Screen Saver: ... timeout: NNN ..."
	for _, line := range strings.Split(string(out), "\n") {
		if strings.Contains(line, "timeout:") {
			fields := strings.Fields(line)
			for i, f := range fields {
				if f == "timeout:" && i+1 < len(fields) {
					secs, err := strconv.Atoi(fields[i+1])
					if err == nil && secs > 0 {
						minutes := secs / 60
						if minutes == 0 {
							minutes = 1
						}
						return true, minutes
					}
				}
			}
		}
	}
	return false, 0
}

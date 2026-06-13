//go:build windows

package checks

import (
	"os/exec"
	"strconv"
	"strings"
)

func checkScreenLock() (bool, int) {
	// ScreenSaverIsSecure == "1" means screen saver requires password on resume.
	secureOut, err := exec.Command("powershell", "-NonInteractive", "-Command",
		`(Get-ItemProperty 'HKCU:\Control Panel\Desktop').ScreenSaverIsSecure`).Output()
	if err != nil {
		return false, 0
	}
	enabled := strings.TrimSpace(string(secureOut)) == "1"

	// ScreenSaveTimeOut is in seconds.
	timeoutOut, err := exec.Command("powershell", "-NonInteractive", "-Command",
		`(Get-ItemProperty 'HKCU:\Control Panel\Desktop').ScreenSaveTimeOut`).Output()
	if err != nil {
		return enabled, 0
	}
	secs, err := strconv.Atoi(strings.TrimSpace(string(timeoutOut)))
	if err != nil || secs <= 0 {
		return enabled, 0
	}
	minutes := secs / 60
	if minutes == 0 {
		minutes = 1
	}
	return enabled, minutes
}

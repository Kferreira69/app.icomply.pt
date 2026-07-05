//go:build windows

package checks

import (
	"os/exec"
	"strings"
)

func checkDiskEncryption() bool {
	out, err := exec.Command("powershell", "-NonInteractive", "-Command",
		"(Get-BitLockerVolume -MountPoint 'C:').ProtectionStatus").Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "On"
}

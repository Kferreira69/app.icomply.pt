//go:build darwin

package checks

import (
	"os/exec"
	"strings"
)

func checkDiskEncryption() bool {
	out, err := exec.Command("fdesetup", "status").Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(out), "FileVault is On")
}

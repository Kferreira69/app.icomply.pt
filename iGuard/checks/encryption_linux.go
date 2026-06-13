//go:build linux

package checks

import (
	"os/exec"
	"strings"
)

func checkDiskEncryption() bool {
	// lsblk lists block devices; a "crypt" type indicates LUKS/dm-crypt.
	out, err := exec.Command("lsblk", "-o", "TYPE").Output()
	if err != nil {
		return false
	}
	return strings.Contains(string(out), "crypt")
}

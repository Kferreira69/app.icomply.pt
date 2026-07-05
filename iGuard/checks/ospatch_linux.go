//go:build linux

package checks

import (
	"os"
	"os/exec"
	"strings"
)

func getOSVersion() string {
	data, err := os.ReadFile("/etc/os-release")
	if err != nil {
		return "unknown"
	}
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "VERSION_ID=") {
			return strings.Trim(strings.TrimPrefix(line, "VERSION_ID="), `"`)
		}
	}
	return "unknown"
}

func checkOSPatch() bool {
	// Debian/Ubuntu: check for pending security updates via apt.
	if _, err := exec.LookPath("apt-get"); err == nil {
		out, err := exec.Command("apt-get", "--just-print", "upgrade").Output()
		if err != nil {
			return false
		}
		// If there are no upgradable packages the output mentions 0 upgraded.
		return strings.Contains(string(out), "0 upgraded") ||
			strings.Contains(string(out), "0 to upgrade")
	}

	// RHEL/CentOS/Fedora: check yum/dnf.
	if _, err := exec.LookPath("dnf"); err == nil {
		out, err := exec.Command("dnf", "check-update", "--security", "-q").Output()
		if err != nil {
			// dnf check-update exits 100 when updates are available, 0 when not.
			return false
		}
		return len(strings.TrimSpace(string(out))) == 0
	}
	if _, err := exec.LookPath("yum"); err == nil {
		out, err := exec.Command("yum", "check-update", "--security", "-q").Output()
		if err != nil {
			return false
		}
		return len(strings.TrimSpace(string(out))) == 0
	}

	return false
}

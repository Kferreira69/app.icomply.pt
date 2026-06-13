//go:build linux

package checks

import (
	"os"
	"os/exec"
	"strings"
)

var knownPMPackages = []string{
	"1password",
	"bitwarden",
	"dashlane",
	"lastpass",
	"keepassxc",
	"keepass",
	"enpass",
	"nordpass",
}

func checkPasswordManager() bool {
	// Check common binary names in PATH.
	binaryNames := []string{
		"1password", "bwcli", "bw", "keepassxc", "keepass2",
		"enpass", "nordpass",
	}
	for _, bin := range binaryNames {
		if _, err := exec.LookPath(bin); err == nil {
			return true
		}
	}

	// Check dpkg (Debian/Ubuntu).
	if out, err := exec.Command("dpkg", "-l").Output(); err == nil {
		lower := strings.ToLower(string(out))
		for _, pm := range knownPMPackages {
			if strings.Contains(lower, pm) {
				return true
			}
		}
	}

	// Check rpm (RHEL/Fedora).
	if out, err := exec.Command("rpm", "-qa").Output(); err == nil {
		lower := strings.ToLower(string(out))
		for _, pm := range knownPMPackages {
			if strings.Contains(lower, pm) {
				return true
			}
		}
	}

	// Check ~/.local/share/applications for .desktop files.
	home, err := os.UserHomeDir()
	if err == nil {
		desktopDir := home + "/.local/share/applications"
		entries, err := os.ReadDir(desktopDir)
		if err == nil {
			for _, e := range entries {
				lower := strings.ToLower(e.Name())
				for _, pm := range knownPMPackages {
					if strings.Contains(lower, pm) {
						return true
					}
				}
			}
		}
	}
	return false
}

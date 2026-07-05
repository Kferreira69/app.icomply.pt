//go:build darwin

package checks

import (
	"os"
	"strings"
)

var knownPMApps = []string{
	"1Password",
	"Bitwarden",
	"Dashlane",
	"LastPass",
	"Keeper",
	"Enpass",
	"RoboForm",
	"NordPass",
	"KeePassXC",
	"Strongbox",
}

func checkPasswordManager() bool {
	entries, err := os.ReadDir("/Applications")
	if err != nil {
		return false
	}
	for _, e := range entries {
		name := e.Name()
		for _, pm := range knownPMApps {
			if strings.Contains(strings.ToUpper(name), strings.ToUpper(pm)) {
				return true
			}
		}
	}
	// Also check ~/Applications (user-scoped installs).
	home, err := os.UserHomeDir()
	if err != nil {
		return false
	}
	entries2, err := os.ReadDir(home + "/Applications")
	if err != nil {
		return false
	}
	for _, e := range entries2 {
		name := e.Name()
		for _, pm := range knownPMApps {
			if strings.Contains(strings.ToUpper(name), strings.ToUpper(pm)) {
				return true
			}
		}
	}
	return false
}

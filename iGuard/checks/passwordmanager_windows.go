//go:build windows

package checks

import (
	"os"
	"os/exec"
	"strings"
)

var knownPMNames = []string{
	"1Password",
	"Bitwarden",
	"Dashlane",
	"LastPass",
	"Keeper",
	"Enpass",
	"RoboForm",
	"NordPass",
	"KeePassXC",
	"KeePass",
}

func checkPasswordManager() bool {
	// Check common install directories.
	dirs := []string{
		os.Getenv("ProgramFiles"),
		os.Getenv("ProgramFiles(x86)"),
		os.Getenv("LOCALAPPDATA"),
		os.Getenv("APPDATA"),
	}
	for _, dir := range dirs {
		if dir == "" {
			continue
		}
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, e := range entries {
			name := e.Name()
			for _, pm := range knownPMNames {
				if strings.Contains(strings.ToUpper(name), strings.ToUpper(pm)) {
					return true
				}
			}
		}
	}

	// Fallback: check registry uninstall keys via PowerShell.
	out, err := exec.Command("powershell", "-NonInteractive", "-Command",
		`Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Select-Object -ExpandProperty DisplayName`).Output()
	if err == nil {
		upper := strings.ToUpper(string(out))
		for _, pm := range knownPMNames {
			if strings.Contains(upper, strings.ToUpper(pm)) {
				return true
			}
		}
	}
	return false
}

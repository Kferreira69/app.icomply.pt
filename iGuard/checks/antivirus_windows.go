//go:build windows

package checks

import (
	"os/exec"
	"strings"
)

func checkAntivirus() bool {
	// Primary: Windows Defender via Get-MpComputerStatus.
	out, err := exec.Command("powershell", "-NonInteractive", "-Command",
		"(Get-MpComputerStatus).AntivirusEnabled").Output()
	if err == nil && strings.TrimSpace(string(out)) == "True" {
		return true
	}

	// Fallback: WMI query for any registered antivirus product.
	out2, err := exec.Command("powershell", "-NonInteractive", "-Command",
		`Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object -ExpandProperty displayName`).Output()
	if err == nil && len(strings.TrimSpace(string(out2))) > 0 {
		return true
	}
	return false
}

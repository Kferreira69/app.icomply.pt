//go:build darwin

package checks

import (
	"os"
	"os/exec"
	"strings"
)

// knownAVProcesses is a list of well-known AV process name substrings.
var knownAVProcesses = []string{
	"CrowdStrike",
	"SentinelOne",
	"CarbonBlack",
	"Malwarebytes",
	"Sophos",
	"Defender",
	"Cylance",
	"ESET",
	"Symantec",
	"Norton",
	"Avast",
	"AVG",
}

// knownAVApps are /Applications directory entries for common AV products.
var knownAVApps = []string{
	"CrowdStrike",
	"SentinelOne",
	"Carbon Black",
	"Malwarebytes",
	"Sophos",
	"Microsoft Defender",
	"Cylance",
	"ESET",
	"Symantec",
	"Norton",
	"Avast",
	"AVG",
}

func checkAntivirus() bool {
	// macOS 12+ ships XProtect (built-in malware protection) — always present.
	// Check the XProtect bundle as a baseline.
	if _, err := os.Stat("/Library/Apple/System/Library/CoreServices/XProtect.bundle"); err == nil {
		return true
	}
	// Fallback: scan running processes.
	out, err := exec.Command("ps", "aux").Output()
	if err == nil {
		upper := strings.ToUpper(string(out))
		for _, av := range knownAVProcesses {
			if strings.Contains(upper, strings.ToUpper(av)) {
				return true
			}
		}
	}
	// Fallback: check /Applications for known AV apps.
	entries, err := os.ReadDir("/Applications")
	if err == nil {
		for _, e := range entries {
			name := e.Name()
			for _, av := range knownAVApps {
				if strings.Contains(strings.ToUpper(name), strings.ToUpper(av)) {
					return true
				}
			}
		}
	}
	return false
}

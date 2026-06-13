//go:build linux

package checks

import (
	"os/exec"
	"strings"
)

var knownAVProcesses = []string{
	"clamd",
	"freshclam",
	"rkhunter",
	"chkrootkit",
	"sophos",
	"sentinelone",
	"crowdstrike",
	"falcond",
}

func checkAntivirus() bool {
	out, err := exec.Command("ps", "aux").Output()
	if err != nil {
		return false
	}
	lower := strings.ToLower(string(out))
	for _, av := range knownAVProcesses {
		if strings.Contains(lower, av) {
			return true
		}
	}
	return false
}

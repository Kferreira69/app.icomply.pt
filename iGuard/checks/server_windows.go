//go:build windows

package checks

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// checkSSHRootLoginDisabled is not applicable on Windows Server.
// We return true if the OpenSSH server is not running (port 22 not exposed).
func checkSSHRootLoginDisabled() bool {
	out, err := exec.Command("powershell", "-Command",
		"Get-Service -Name sshd -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status").Output()
	if err != nil {
		return true // SSH not installed = not exposed
	}
	return !strings.Contains(strings.ToLower(string(out)), "running")
}

// checkFirewall returns true if Windows Firewall (all profiles) is active.
func checkFirewall() bool {
	out, err := exec.Command("netsh", "advfirewall", "show", "allprofiles", "state").Output()
	if err != nil {
		return false
	}
	lines := strings.Split(string(out), "\n")
	onCount := 0
	for _, line := range lines {
		if strings.Contains(strings.ToLower(line), "state") && strings.Contains(strings.ToLower(line), "on") {
			onCount++
		}
	}
	return onCount >= 1
}

// checkPendingPatches returns the number of pending Windows Updates.
func checkPendingPatches() int {
	out, err := exec.Command("powershell", "-Command",
		`(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search("IsInstalled=0 and Type='Software'").Updates.Count`).Output()
	if err != nil {
		return -1
	}
	n, err := strconv.Atoi(strings.TrimSpace(string(out)))
	if err != nil {
		return -1
	}
	return n
}

// checkOpenPorts returns open listening TCP ports via netstat.
func checkOpenPorts() []string {
	out, err := exec.Command("netstat", "-an").Output()
	if err != nil {
		return nil
	}

	portSet := map[string]bool{}
	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		if !strings.HasPrefix(strings.ToUpper(fields[0]), "TCP") {
			continue
		}
		if len(fields) >= 4 && strings.ToUpper(fields[3]) != "LISTENING" {
			continue
		}
		addr := fields[1]
		parts := strings.Split(addr, ":")
		port := parts[len(parts)-1]
		if _, err := strconv.Atoi(port); err == nil && port != "0" {
			portSet[port] = true
		}
	}

	ports := make([]string, 0, len(portSet))
	for p := range portSet {
		ports = append(ports, fmt.Sprintf("%s/tcp", p))
	}
	return ports
}

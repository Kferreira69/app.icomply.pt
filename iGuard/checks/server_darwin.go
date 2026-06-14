//go:build darwin

package checks

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// checkSSHRootLoginDisabled checks /etc/ssh/sshd_config on macOS (same as Linux).
func checkSSHRootLoginDisabled() bool {
	out, err := exec.Command("grep", "-i", "PermitRootLogin", "/etc/ssh/sshd_config").Output()
	if err != nil {
		return false
	}
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			val := strings.ToLower(fields[1])
			return val == "no" || val == "prohibit-password" || val == "without-password"
		}
	}
	return false
}

// checkFirewall checks if the macOS Application Firewall is enabled.
func checkFirewall() bool {
	out, err := exec.Command("/usr/libexec/ApplicationFirewall/socketfilterfw", "--getglobalstate").Output()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(out)), "enabled")
}

// checkPendingPatches returns the number of pending macOS software updates.
func checkPendingPatches() int {
	out, err := exec.Command("softwareupdate", "-l").Output()
	if err != nil {
		return -1
	}
	count := 0
	for _, line := range strings.Split(string(out), "\n") {
		if strings.HasPrefix(strings.TrimSpace(line), "*") {
			count++
		}
	}
	return count
}

// checkOpenPorts returns listening TCP ports via lsof on macOS.
func checkOpenPorts() []string {
	out, err := exec.Command("lsof", "-iTCP", "-sTCP:LISTEN", "-n", "-P").Output()
	if err != nil {
		return nil
	}

	portSet := map[string]bool{}
	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 9 {
			continue
		}
		addr := fields[8]
		parts := strings.Split(addr, ":")
		port := parts[len(parts)-1]
		if _, err := strconv.Atoi(port); err == nil {
			portSet[port] = true
		}
	}

	ports := make([]string, 0, len(portSet))
	for p := range portSet {
		ports = append(ports, fmt.Sprintf("%s/tcp", p))
	}
	return ports
}

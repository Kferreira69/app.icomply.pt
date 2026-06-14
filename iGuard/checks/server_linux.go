//go:build linux

package checks

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

// checkSSHRootLoginDisabled returns true if PermitRootLogin is set to "no"
// (or prohibited-password/without-password) in sshd_config.
func checkSSHRootLoginDisabled() bool {
	f, err := os.Open("/etc/ssh/sshd_config")
	if err != nil {
		return false
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		if strings.EqualFold(fields[0], "PermitRootLogin") {
			val := strings.ToLower(fields[1])
			return val == "no" || val == "prohibit-password" || val == "without-password"
		}
	}
	return false
}

// checkFirewall returns true if UFW or iptables/nftables indicates an active firewall.
func checkFirewall() bool {
	// Try UFW first
	if out, err := exec.Command("ufw", "status").Output(); err == nil {
		return strings.Contains(string(out), "Status: active")
	}

	// Try firewalld
	if out, err := exec.Command("firewall-cmd", "--state").Output(); err == nil {
		return strings.TrimSpace(string(out)) == "running"
	}

	// Try iptables — if there are any non-default ACCEPT rules, firewall is active
	if out, err := exec.Command("iptables", "-L", "-n", "--line-numbers").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		ruleCount := 0
		for _, l := range lines {
			if strings.HasPrefix(l, "Chain") || strings.HasPrefix(l, "target") || strings.TrimSpace(l) == "" {
				continue
			}
			ruleCount++
		}
		return ruleCount > 0
	}

	return false
}

// checkPendingPatches returns the number of pending security updates.
func checkPendingPatches() int {
	// Debian/Ubuntu
	if _, err := exec.LookPath("apt-get"); err == nil {
		out, err := exec.Command("apt-get", "-s", "upgrade").Output()
		if err != nil {
			return -1
		}
		count := 0
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(line, "Inst ") {
				count++
			}
		}
		return count
	}

	// RHEL/CentOS/Amazon Linux
	if _, err := exec.LookPath("yum"); err == nil {
		out, err := exec.Command("yum", "check-update", "--security", "-q").Output()
		if err != nil && err.(*exec.ExitError).ExitCode() != 100 {
			return -1
		}
		count := 0
		for _, line := range strings.Split(strings.TrimSpace(string(out)), "\n") {
			if strings.TrimSpace(line) != "" {
				count++
			}
		}
		return count
	}

	return 0
}

// checkOpenPorts returns a list of open listening TCP ports.
func checkOpenPorts() []string {
	out, err := exec.Command("ss", "-tlnp").Output()
	if err != nil {
		// Fallback to netstat
		out, err = exec.Command("netstat", "-tlnp").Output()
		if err != nil {
			return nil
		}
	}

	portSet := map[string]bool{}
	for _, line := range strings.Split(string(out), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		// ss output: State Recv-Q Send-Q Local-Address:Port Peer-Address:Port
		for _, f := range fields {
			if strings.Contains(f, ":") {
				parts := strings.Split(f, ":")
				port := parts[len(parts)-1]
				if _, err := strconv.Atoi(port); err == nil {
					if port != "0" && port != "*" {
						portSet[port] = true
					}
				}
			}
		}
	}

	ports := make([]string, 0, len(portSet))
	for p := range portSet {
		ports = append(ports, fmt.Sprintf("%s/tcp", p))
	}
	return ports
}

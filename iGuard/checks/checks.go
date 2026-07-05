package checks

import (
	"fmt"
	"runtime"
)

// AgentVersion is injected at build time via ldflags.
var AgentVersion = "dev"

// ComplianceReport is the payload sent to the iComply API.
type ComplianceReport struct {
	AgentVersion      string                 `json:"agent_version"`
	OS                string                 `json:"os"`
	OSVersion         string                 `json:"os_version"`
	Arch              string                 `json:"arch"`
	// Endpoint checks
	DiskEncryption    bool                   `json:"disk_encryption"`
	ScreenLock        bool                   `json:"screen_lock"`
	AntivirusEnabled  bool                   `json:"antivirus_enabled"`
	OSUpToDate        bool                   `json:"os_up_to_date"`
	PasswordManager   bool                   `json:"password_manager"`
	ScreenLockTimeout int                    `json:"screen_lock_timeout"` // minutes, 0 if unknown
	// Server checks (only populated in server mode)
	SSHRootLoginDisabled *bool     `json:"ssh_root_login_disabled,omitempty"`
	FirewallActive       *bool     `json:"firewall_active,omitempty"`
	PendingPatches       *int      `json:"pending_patches,omitempty"`
	OpenPorts            []string  `json:"open_ports,omitempty"`
	ComplianceScore      int       `json:"compliance_score"` // 0-100
	RawData              map[string]interface{} `json:"raw_data,omitempty"`
}

// RunAll executes endpoint compliance checks and returns a populated report.
func RunAll() ComplianceReport {
	r := ComplianceReport{
		AgentVersion: AgentVersion,
		OS:           runtime.GOOS,
		Arch:         runtime.GOARCH,
		OSVersion:    getOSVersion(),
		RawData:      make(map[string]interface{}),
	}

	r.DiskEncryption = checkDiskEncryption()
	r.ScreenLock, r.ScreenLockTimeout = checkScreenLock()
	r.AntivirusEnabled = checkAntivirus()
	r.OSUpToDate = checkOSPatch()
	r.PasswordManager = checkPasswordManager()
	r.ComplianceScore = ComputeScore(&r)
	return r
}

// RunServerChecks executes server-mode compliance checks.
func RunServerChecks() ComplianceReport {
	r := ComplianceReport{
		AgentVersion: AgentVersion,
		OS:           runtime.GOOS,
		Arch:         runtime.GOARCH,
		OSVersion:    getOSVersion(),
		RawData:      make(map[string]interface{}),
	}

	sshDisabled := checkSSHRootLoginDisabled()
	firewallOK := checkFirewall()
	patches := checkPendingPatches()
	ports := checkOpenPorts()

	r.SSHRootLoginDisabled = &sshDisabled
	r.FirewallActive = &firewallOK
	r.OSUpToDate = checkOSPatch()
	r.PendingPatches = &patches
	r.OpenPorts = ports
	r.ComplianceScore = ComputeServerScore(&r)
	return r
}

// ComputeScore returns a 0–100 compliance score for endpoints (each of 5 checks = 20 pts).
func ComputeScore(r *ComplianceReport) int {
	score := 0
	if r.DiskEncryption {
		score += 20
	}
	if r.ScreenLock {
		score += 20
	}
	if r.AntivirusEnabled {
		score += 20
	}
	if r.OSUpToDate {
		score += 20
	}
	if r.PasswordManager {
		score += 20
	}
	return score
}

// ComputeServerScore returns a 0–100 compliance score for servers (each of 4 checks = 25 pts).
func ComputeServerScore(r *ComplianceReport) int {
	score := 0
	if r.SSHRootLoginDisabled != nil && *r.SSHRootLoginDisabled {
		score += 25
	}
	if r.FirewallActive != nil && *r.FirewallActive {
		score += 25
	}
	if r.OSUpToDate {
		score += 25
	}
	if r.PendingPatches != nil && *r.PendingPatches == 0 {
		score += 25
	}
	return score
}

// PrintTable prints a human-readable compliance table to stdout.
func (r ComplianceReport) PrintTable() {
	pass := func(b bool) string {
		if b {
			return "PASS"
		}
		return "FAIL"
	}

	isServer := r.SSHRootLoginDisabled != nil

	fmt.Println("╔══════════════════════════════════════════════════════╗")
	if isServer {
		fmt.Println("║          iGuard Server Compliance Report             ║")
	} else {
		fmt.Println("║           iGuard Compliance Report                   ║")
	}
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Agent Version  : %-34s║\n", r.AgentVersion)
	fmt.Printf("║  OS             : %-34s║\n", r.OS+" "+r.OSVersion)
	fmt.Printf("║  Architecture   : %-34s║\n", r.Arch)
	fmt.Println("╠══════════════════════════════════════════════════════╣")

	if isServer {
		sshVal := "UNKNOWN"
		if r.SSHRootLoginDisabled != nil {
			sshVal = pass(*r.SSHRootLoginDisabled)
		}
		fwVal := "UNKNOWN"
		if r.FirewallActive != nil {
			fwVal = pass(*r.FirewallActive)
		}
		patchVal := "UNKNOWN"
		if r.PendingPatches != nil {
			if *r.PendingPatches == 0 {
				patchVal = "PASS (0 pending)"
			} else {
				patchVal = fmt.Sprintf("FAIL (%d pending)", *r.PendingPatches)
			}
		}
		fmt.Printf("║  SSH Root Disabled : %-30s║\n", sshVal)
		fmt.Printf("║  Firewall Active   : %-30s║\n", fwVal)
		fmt.Printf("║  OS Up-to-Date     : %-30s║\n", pass(r.OSUpToDate))
		fmt.Printf("║  Pending Patches   : %-30s║\n", patchVal)
		if len(r.OpenPorts) > 0 {
			ports := r.OpenPorts
			if len(ports) > 5 {
				ports = ports[:5]
			}
			fmt.Printf("║  Open Ports        : %-30s║\n", fmt.Sprintf("%v (+more)", ports))
		}
	} else {
		fmt.Printf("║  Disk Encryption   : %-32s║\n", pass(r.DiskEncryption))
		fmt.Printf("║  Screen Lock       : %-32s║\n", pass(r.ScreenLock))
		if r.ScreenLockTimeout > 0 {
			fmt.Printf("║    Lock Timeout    : %-32s║\n", fmt.Sprintf("%d min", r.ScreenLockTimeout))
		}
		fmt.Printf("║  Antivirus         : %-32s║\n", pass(r.AntivirusEnabled))
		fmt.Printf("║  OS Up-to-Date     : %-32s║\n", pass(r.OSUpToDate))
		fmt.Printf("║  Password Manager  : %-32s║\n", pass(r.PasswordManager))
	}

	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Compliance Score  : %-2d / 100                        ║\n", r.ComplianceScore)
	fmt.Println("╚══════════════════════════════════════════════════════╝")
}

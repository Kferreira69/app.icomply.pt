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
	DiskEncryption    bool                   `json:"disk_encryption"`
	ScreenLock        bool                   `json:"screen_lock"`
	AntivirusEnabled  bool                   `json:"antivirus_enabled"`
	OSUpToDate        bool                   `json:"os_up_to_date"`
	PasswordManager   bool                   `json:"password_manager"`
	ScreenLockTimeout int                    `json:"screen_lock_timeout"` // minutes, 0 if unknown
	ComplianceScore   int                    `json:"compliance_score"`    // 0-100
	RawData           map[string]interface{} `json:"raw_data,omitempty"`
}

// RunAll executes every compliance check and returns a populated report.
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

// ComputeScore returns a 0–100 compliance score (each of 5 checks = 20 pts).
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

// PrintTable prints a human-readable compliance table to stdout.
func (r ComplianceReport) PrintTable() {
	pass := func(b bool) string {
		if b {
			return "PASS"
		}
		return "FAIL"
	}

	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║              iGuard Compliance Report                ║")
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Agent Version  : %-34s║\n", r.AgentVersion)
	fmt.Printf("║  OS             : %-34s║\n", r.OS+" "+r.OSVersion)
	fmt.Printf("║  Architecture   : %-34s║\n", r.Arch)
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Disk Encryption   : %-32s║\n", pass(r.DiskEncryption))
	fmt.Printf("║  Screen Lock       : %-32s║\n", pass(r.ScreenLock))
	if r.ScreenLockTimeout > 0 {
		fmt.Printf("║    Lock Timeout    : %-32s║\n", fmt.Sprintf("%d min", r.ScreenLockTimeout))
	}
	fmt.Printf("║  Antivirus         : %-32s║\n", pass(r.AntivirusEnabled))
	fmt.Printf("║  OS Up-to-Date     : %-32s║\n", pass(r.OSUpToDate))
	fmt.Printf("║  Password Manager  : %-32s║\n", pass(r.PasswordManager))
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Compliance Score  : %-2d / 100                        ║\n", r.ComplianceScore)
	fmt.Println("╚══════════════════════════════════════════════════════╝")
}

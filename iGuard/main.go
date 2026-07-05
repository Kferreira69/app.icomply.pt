package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Kferreira69/iguard/checks"
	"github.com/Kferreira69/iguard/config"
	"github.com/Kferreira69/iguard/reporter"
	"github.com/Kferreira69/iguard/service"
)

// Version is set at build time via -ldflags "-X main.Version=x.y.z".
var Version = "dev"

func main() {
	// Propagate version into the checks package for the report payload.
	checks.AgentVersion = Version

	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	switch os.Args[1] {
	case "setup":
		cmdSetup(os.Args[2:])
	case "run":
		cmdRun(os.Args[2:])
	case "status":
		cmdStatus()
	case "service":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "Usage: iguard service <install|uninstall|start|stop>")
			os.Exit(1)
		}
		cmdService(os.Args[2])
	case "version":
		fmt.Printf("iGuard %s\n", Version)
	case "help", "--help", "-h":
		printUsage()
	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n\n", os.Args[1])
		printUsage()
		os.Exit(1)
	}
}

// ---------- setup ----------

func cmdSetup(args []string) {
	var token, apiURL, deviceName, mode string

	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--token":
			i++
			if i < len(args) {
				token = args[i]
			}
		case "--api":
			i++
			if i < len(args) {
				apiURL = args[i]
			}
		case "--name":
			i++
			if i < len(args) {
				deviceName = args[i]
			}
		case "--mode":
			i++
			if i < len(args) {
				mode = args[i]
			}
		case "--server":
			mode = "server"
		}
	}

	if token == "" || apiURL == "" {
		fmt.Fprintln(os.Stderr, "Usage: iguard setup --token <TOKEN> --api <URL> [--name <device-name>] [--mode server]")
		os.Exit(1)
	}

	if mode == "" {
		mode = "endpoint"
	}

	hostname, _ := os.Hostname()
	if deviceName == "" {
		deviceName = hostname
	}

	cfg := &config.Config{
		DeviceToken: token,
		APIURL:      strings.TrimRight(apiURL, "/"),
		DeviceName:  deviceName,
		Hostname:    hostname,
		Mode:        mode,
		ReportEvery: 24,
	}

	if err := config.Save(cfg); err != nil {
		fmt.Fprintf(os.Stderr, "Error saving config: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Config saved to %s\n", config.DefaultPath())
	fmt.Printf("  Device : %s (%s)\n", cfg.DeviceName, cfg.Hostname)
	fmt.Printf("  API URL: %s\n", cfg.APIURL)
}

// ---------- run ----------

func cmdRun(args []string) {
	dryRun := false
	serverMode := false
	for _, a := range args {
		switch a {
		case "--dry-run":
			dryRun = true
		case "--mode=server", "--server":
			serverMode = true
		}
	}

	cfg, err := loadConfigOrDie()
	if err != nil && !dryRun {
		fmt.Fprintf(os.Stderr, "Warning: %v\n", err)
	}

	// Read mode from config if not forced on CLI
	if !serverMode && cfg != nil && cfg.Mode == "server" {
		serverMode = true
	}

	var report checks.ComplianceReport
	if serverMode {
		fmt.Println("Running server compliance checks…")
		report = checks.RunServerChecks()
	} else {
		fmt.Println("Running endpoint compliance checks…")
		report = checks.RunAll()
	}
	fmt.Println()
	report.PrintTable()

	if dryRun {
		fmt.Println("\n[dry-run] Report NOT submitted to API.")
		return
	}

	if cfg == nil {
		fmt.Fprintln(os.Stderr, "\nSkipping API submission: no valid config.")
		os.Exit(1)
	}

	fmt.Printf("\nSubmitting report to %s…\n", cfg.APIURL)
	if err := reporter.Submit(cfg, report); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("Report submitted successfully at %s\n", time.Now().Format(time.RFC3339))
}

// ---------- status ----------

func cmdStatus() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "No config found (%v).\nRun 'iguard setup' first.\n", err)
		os.Exit(1)
	}

	fmt.Println("╔══════════════════════════════════════════════════════╗")
	fmt.Println("║                  iGuard Status                      ║")
	fmt.Println("╠══════════════════════════════════════════════════════╣")
	fmt.Printf("║  Agent Version  : %-34s║\n", Version)
	fmt.Printf("║  Config File    : %-34s║\n", truncate(config.DefaultPath(), 34))
	fmt.Printf("║  Device Name    : %-34s║\n", cfg.DeviceName)
	fmt.Printf("║  Hostname       : %-34s║\n", cfg.Hostname)
	fmt.Printf("║  API URL        : %-34s║\n", truncate(cfg.APIURL, 34))
	token := cfg.DeviceToken
	if len(token) > 8 {
		token = token[:4] + "…" + token[len(token)-4:]
	}
	fmt.Printf("║  Device Token   : %-34s║\n", token)
	fmt.Printf("║  Report Every   : %-34s║\n", fmt.Sprintf("%dh", cfg.ReportEvery))
	fmt.Println("╚══════════════════════════════════════════════════════╝")

	// Show last cached report if it exists.
	if data, err := os.ReadFile(lastReportPath()); err == nil {
		var r checks.ComplianceReport
		if json.Unmarshal(data, &r) == nil {
			fmt.Println()
			r.PrintTable()
		}
	}
}

// ---------- service ----------

func cmdService(sub string) {
	cfg, err := config.Load()
	intervalHours := 24
	if err == nil {
		intervalHours = cfg.ReportEvery
	}

	switch sub {
	case "install":
		if err := service.Install(intervalHours); err != nil {
			fmt.Fprintf(os.Stderr, "Error installing service: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("iGuard service installed (runs every %dh).\n", intervalHours)
	case "uninstall":
		if err := service.Uninstall(); err != nil {
			fmt.Fprintf(os.Stderr, "Error uninstalling service: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("iGuard service uninstalled.")
	case "start":
		if err := service.Start(); err != nil {
			fmt.Fprintf(os.Stderr, "Error starting service: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("iGuard service started.")
	case "stop":
		if err := service.Stop(); err != nil {
			fmt.Fprintf(os.Stderr, "Error stopping service: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("iGuard service stopped.")
	default:
		fmt.Fprintf(os.Stderr, "Unknown service sub-command: %s\n", sub)
		fmt.Fprintln(os.Stderr, "Usage: iguard service <install|uninstall|start|stop>")
		os.Exit(1)
	}
}

// ---------- helpers ----------

func printUsage() {
	fmt.Printf(`iGuard %s — iComply Endpoint & Server Compliance Agent

Usage:
  iguard setup --token <TOKEN> --api <URL> [--name <device-name>] [--mode server]
      Save device token and API URL to config.
      --mode server: configure as server agent (checks SSH, firewall, patches).

  iguard run [--dry-run] [--server]
      Run all compliance checks and report results.
      --dry-run: print results without submitting to API.
      --server:  run server checks instead of endpoint checks.

  iguard status
      Show current config and last compliance report.

  iguard service <install|uninstall|start|stop>
      Manage the background service.

  iguard version
      Print agent version.

`, Version)
}

func loadConfigOrDie() (*config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("loading config: %w (run 'iguard setup' first)", err)
	}
	return cfg, nil
}

func lastReportPath() string {
	home, _ := os.UserHomeDir()
	return home + "/.iguard/last_report.json"
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return "…" + s[len(s)-(max-1):]
}

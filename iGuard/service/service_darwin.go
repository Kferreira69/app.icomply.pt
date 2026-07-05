//go:build darwin

package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"text/template"
)

const plistLabel = "pt.icomply.iguard"

var plistTemplate = template.Must(template.New("plist").Parse(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{{.Label}}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{{.BinaryPath}}</string>
        <string>run</string>
    </array>
    <key>StartInterval</key>
    <integer>{{.IntervalSecs}}</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{{.LogPath}}</string>
    <key>StandardErrorPath</key>
    <string>{{.ErrPath}}</string>
</dict>
</plist>
`))

func plistPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, "Library", "LaunchAgents", plistLabel+".plist"), nil
}

func logDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".iguard", "logs")
	return dir, os.MkdirAll(dir, 0700)
}

// Install writes the launchd plist and loads the agent.
func Install(intervalHours int) error {
	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolving binary path: %w", err)
	}
	ldir, err := logDir()
	if err != nil {
		return err
	}
	path, err := plistPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("creating plist: %w", err)
	}
	defer f.Close()

	data := struct {
		Label        string
		BinaryPath   string
		IntervalSecs int
		LogPath      string
		ErrPath      string
	}{
		Label:        plistLabel,
		BinaryPath:   self,
		IntervalSecs: intervalHours * 3600,
		LogPath:      filepath.Join(ldir, "iguard.log"),
		ErrPath:      filepath.Join(ldir, "iguard.err"),
	}
	if err := plistTemplate.Execute(f, data); err != nil {
		return fmt.Errorf("writing plist: %w", err)
	}
	return launchctl("load", path)
}

// Uninstall unloads and removes the launchd plist.
func Uninstall() error {
	path, err := plistPath()
	if err != nil {
		return err
	}
	// Unload first (ignore error if not loaded).
	_ = launchctl("unload", path)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("removing plist: %w", err)
	}
	return nil
}

// Start loads the launchd agent.
func Start() error {
	path, err := plistPath()
	if err != nil {
		return err
	}
	return launchctl("load", path)
}

// Stop unloads the launchd agent.
func Stop() error {
	path, err := plistPath()
	if err != nil {
		return err
	}
	return launchctl("unload", path)
}

func launchctl(action, path string) error {
	out, err := exec.Command("launchctl", action, path).CombinedOutput()
	if err != nil {
		return fmt.Errorf("launchctl %s: %s: %w", action, string(out), err)
	}
	return nil
}

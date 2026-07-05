# iGuard

iGuard is the iComply endpoint compliance monitoring agent. It runs silently in the background on employee laptops, checks device security posture every 24 hours, and reports results to the iComply API.

## What it checks

| Check | macOS | Windows | Linux |
|-------|-------|---------|-------|
| Disk encryption | FileVault (`fdesetup`) | BitLocker (`Get-BitLockerVolume`) | LUKS (`lsblk`) |
| Screen lock | `com.apple.screensaver` defaults | `HKCU:\Control Panel\Desktop` | gsettings / xset |
| Antivirus | XProtect (built-in) + known AV apps | Windows Defender / SecurityCenter2 | clamd, falcond, etc. |
| OS up-to-date | `softwareupdate -l` (macOS 13+) | Last hotfix < 30 days | apt/dnf security updates |
| Password manager | `/Applications` scan | Program Files + registry | dpkg/rpm + PATH |

iGuard is **read-only** — it never modifies system settings.

## Installation

```bash
# macOS / Linux — download and install
curl -fsSL https://releases.icomply.pt/iguard/install.sh | bash

# Windows (PowerShell)
irm https://releases.icomply.pt/iguard/install.ps1 | iex
```

## Setup

```bash
iguard setup --token <DEVICE_TOKEN> --api https://api.icomply.pt
```

The token is provided by your IT administrator from the iComply dashboard.

## Usage

```bash
# Run checks once (submit to API)
iguard run

# Dry run — print results, no submission
iguard run --dry-run

# Show current config and last report
iguard status

# Install background service (runs every 24h)
iguard service install

# Manage the service
iguard service start
iguard service stop
iguard service uninstall
```

## Compliance score

Each of the 5 checks is worth 20 points. A score of 100 means fully compliant.

## Build from source

Requires Go 1.22+. No external dependencies.

```bash
git clone https://github.com/Kferreira69/iguard
cd iguard
make build          # builds all 4 platform binaries into dist/
make run            # local dry-run test
```

## Uninstall

```bash
iguard service uninstall
rm -rf ~/.iguard
rm $(which iguard)
```

## Config file

Stored at `~/.iguard/config.json` with permissions `0600`.

```json
{
  "device_token": "…",
  "api_url": "https://api.icomply.pt",
  "device_name": "Alice's MacBook Pro",
  "hostname": "alices-mbp.local",
  "report_every_hours": 24
}
```

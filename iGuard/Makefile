VERSION ?= 0.1.0
LDFLAGS = -ldflags "-X main.Version=$(VERSION) -s -w"

.PHONY: all build run clean

all: build

build:
	@mkdir -p dist
	GOOS=darwin  GOARCH=arm64  go build $(LDFLAGS) -o dist/iguard-darwin-arm64 .
	GOOS=darwin  GOARCH=amd64  go build $(LDFLAGS) -o dist/iguard-darwin-amd64 .
	GOOS=windows GOARCH=amd64  go build $(LDFLAGS) -o dist/iguard-windows-amd64.exe .
	GOOS=linux   GOARCH=amd64  go build $(LDFLAGS) -o dist/iguard-linux-amd64 .

# Quick local test (dry-run, no API submission).
run:
	go run . run --dry-run

clean:
	rm -rf dist/

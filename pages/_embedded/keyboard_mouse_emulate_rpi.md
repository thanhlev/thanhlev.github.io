---
layout: default
title: "Bluetooth Keyboard, Mouse & Media Emulator on Raspberry Pi"
short_description: "Turn a Raspberry Pi into a Bluetooth HID device that emulates keyboard, mouse, and media controls"
status: "Done"
picture: "assets/images/rpi_bt_hid.png"
latest_release: "Stable"
index: 0
publish: true
---

# Bluetooth Keyboard, Mouse & Media Emulator on Raspberry Pi
{: .no_toc }

<div class="info">
  <p>An open-source project that transforms a Raspberry Pi into a Bluetooth HID device, capable of emulating keyboard, mouse, and media controls to any paired host.</p>
</div>

**GitHub:** [thanhlev/keyboard_mouse_emulate_on_raspberry](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry)

## Table of Contents
{: .no_toc }

1. TOC
{:toc}

## Overview

This project turns a Raspberry Pi (3 or later) into a Bluetooth Human Interface Device (HID) emulator. Once set up, the Pi registers itself as a Bluetooth peripheral and can send keystroke, mouse, and media control data to any paired computer, phone, or tablet — either by relaying a physical keyboard/mouse or through programmatic injection.

## Key Features

- **Triple HID emulation** — acts as keyboard, mouse, and media controller over Bluetooth simultaneously
- **Consumer control support** — send media keys (play/pause, volume, next/prev track, mute, etc.)
- **Physical device passthrough** — relay a USB keyboard or mouse connected to the Pi wirelessly to the host
- **Proxy keyboard mode** — type directly from a terminal on the Pi and forward keystrokes to the host
- **Headless automation** — inject keystrokes, mouse movements, or media commands programmatically via D-Bus
- **Structured logging** — all modules use Python's logging framework with timestamps and log levels for easy debugging
- **Simple setup** — single shell script to install, one command to boot
- **Open source** — MIT licensed, 342+ stars on GitHub

## Architecture

The system uses a client-server model communicating over D-Bus:

```
┌──────────────────────────┐       Bluetooth HID        ┌──────────────┐
│   Raspberry Pi           │ ─────────────────────────► │  Host Device │
│                          │   Keyboard (Report ID 1)   │  (PC/Phone)  │
│  ┌────────────────────┐  │   Mouse    (Report ID 2)   └──────────────┘
│  │    btk_server      │  │   Media    (Report ID 3)
│  │  (D-Bus + L2CAP)   │  │
│  └─────────┬──────────┘  │
│            │ D-Bus        │
│  ┌─────────┴──────────┐  │
│  │      Clients       │  │
│  │ kb / mouse / proxy │  │
│  │ send_string / media│  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Server

`btk_server.py` — Registers the Pi as a Bluetooth HID device and manages the connection to the target host. Handles the SDP record, L2CAP channels, and exposes D-Bus methods for keyboard, mouse, and consumer control reports.

### Keyboard Clients

| Client | Description |
|--------|-------------|
| `kb_client.py` | Captures input from a USB keyboard on the Pi, relays keystrokes over Bluetooth |
| `send_string.py` | Sends arbitrary text strings via D-Bus — useful for automation and scripting |
| `proxy_keyboard.py` | Interactive terminal proxy — type on the Pi's terminal and forward to the host in real-time |

### Mouse Clients

| Client | Description |
|--------|-------------|
| `mouse_client.py` | Captures USB mouse input and relays movements/clicks over Bluetooth |
| `mouse_emulate.py` | Sends programmatic mouse data (button, X, Y, wheel) via D-Bus |

### Media Control

The server exposes a `send_consumer` D-Bus method for media keys. The consumer control report supports:

| Bit | Function |
|-----|----------|
| 0 | Browser Home |
| 1 | Browser Search |
| 2 | Consumer Config |
| 3 | Eject |
| 4 | Previous Track |
| 5 | Play/Pause |
| 6 | Next Track |
| 7 | Mute |
| 8 | Volume Down |
| 9 | Volume Up |
| 10 | Power |

## Hardware Requirements

| Component | Notes |
|-----------|-------|
| Raspberry Pi 3/4/Zero W | Must have built-in Bluetooth |
| USB Keyboard (optional) | For physical keyboard relay mode |
| USB Mouse (optional) | For physical mouse relay mode |
| Power supply | Standard Pi power adapter |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry.git
cd keyboard_mouse_emulate_on_raspberry

# 2. Run setup (installs dependencies, configures BlueZ)
sudo ./setup.sh

# 3. Set target device MAC address
# Edit ./server/btk_server.py, line 25:
# TARGET_ADDRESS = "XX:XX:XX:XX:XX:XX"

# 4. Start the server (launches in tmux)
sudo ./boot.sh

# 5. Use a client
./keyboard/kb_client.py              # Physical keyboard relay
./keyboard/send_string.py "hello"    # Inject text
./keyboard/proxy_keyboard.py         # Interactive terminal → BT keyboard
./mouse/mouse_client.py              # Physical mouse relay
./mouse/mouse_emulate.py 0 10 0 0    # Move mouse: button=0, dx=10, dy=0, wheel=0
```

## Use Cases

- **KVM over Bluetooth** — control a headless machine wirelessly
- **Automated testing** — inject keystrokes, mouse input, and media commands into devices under test
- **Accessibility** — build custom input devices that speak Bluetooth HID
- **Presentations** — control slides and media playback from a Pi hidden in your pocket
- **IoT automation** — trigger keyboard shortcuts or media controls on paired devices from scripts
- **Media remote** — use a Pi as a wireless media controller for a home theater PC

## How Bluetooth HID Works

The Raspberry Pi uses the BlueZ stack to:

1. Register an SDP (Service Discovery Protocol) record advertising HID capabilities with a combined descriptor for keyboard, mouse, and consumer control
2. Open L2CAP channels (control port 17 + interrupt port 19) for HID communication
3. Send HID input reports using Report IDs (1=keyboard, 2=mouse, 3=media) conforming to the USB HID specification over Bluetooth
4. The host device sees the Pi as a standard Bluetooth keyboard/mouse/media controller — no special drivers needed

### HID Report Formats

| Report | Packet (hex) | Size |
|--------|-------------|------|
| Keyboard | `A1 01 [modifier] [reserved] [key1..key6]` | 10 bytes |
| Mouse | `A1 02 [buttons] [X] [Y] [wheel]` | 6 bytes |
| Consumer | `A1 03 [byte0] [byte1] [byte2]` | 5 bytes |

## Utility Scripts

| Script | Purpose |
|--------|---------|
| `setup.sh` | Install dependencies and configure BlueZ |
| `boot.sh` | Start the HID server |
| `updateMac.sh` | Change the Pi's Bluetooth MAC address |
| `updateName.sh` | Change the Pi's Bluetooth device name |
| `uninstall.sh` | Remove the setup |

## Demo Video

<div style="max-width: 560px; margin: 24px 0;">
  <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
    <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/fFpIvjS4AXs" title="Bluetooth HID Emulator Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Dependencies

Listed in `requirements.txt`:

| Package | Purpose |
|---------|---------|
| `dbus-python` | D-Bus IPC between server and clients |
| `evdev` | Read input events from USB keyboard/mouse |
| `PyGObject` | GLib main loop for the D-Bus service |
| `pyudev` | Hot-plug detection for input devices |
| `pybluez` | Python Bluetooth bindings |

---

*This project is open source under the MIT license. Contributions welcome!*

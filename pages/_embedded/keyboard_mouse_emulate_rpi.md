---
layout: default
title: "Bluetooth Keyboard, Mouse & Media Emulator on Raspberry Pi"
short_description: "My Raspberry Pi pretends to be a Bluetooth keyboard, mouse and media remote; started 2017, still patched in 2026"
status: "Done"
picture: "assets/images/kbd_bt_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 1
publish: true
tags: [raspberry-pi, linux, python, bluetooth]
permalink: /embedded/keyboard-mouse-emulate-rpi   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
---

<!-- 2026-11-22: rewritten in STAR form (user «hãy viết lại tất cả các trang theo chuẩn STAR»).
     Same facts as before; the dated fix list became paragraphs grouped by what broke. -->

# Bluetooth Keyboard, Mouse & Media Emulator on Raspberry Pi
{: .no_toc }

![The BT keyboard emulator in numbers]({{ '/assets/images/kbd_bt_cover.jpg' | relative_url }})
*A Pi that pairs as a keyboard, mouse and media remote with no driver on the host: 341 stars and 120 forks as of 2026-11-22.*

## Table of Contents
{: .no_toc }

1. TOC
{:toc}

## Situation

In September 2017 I wanted a Raspberry Pi 3 to show up on a PC as a plain Bluetooth keyboard. No
driver on the host, no app: you pair it like any keyboard and it types.

## Task

Make the Pi a Bluetooth HID device that any host accepts as a keyboard, and later as a mouse and a
media remote too, driven either by a real USB keyboard/mouse on the Pi or by a script.

## Action

The code lives in [thanhlev/keyboard_mouse_emulate_on_raspberry](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry).
The background write-ups from back then are on my old blog:
[Make Raspberry Pi3 as an emulator bluetooth keyboard](https://thanhle.me/make-raspberry-pi3-as-an-emulator-bluetooth-keyboard/)
and [Emulate Bluetooth mouse with Raspberry Pi](https://thanhle.me/emulate-bluetooth-mouse-with-raspberry-pi/).

<div style="max-width: 560px; margin: 24px 0;">
  <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
    <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/fFpIvjS4AXs" title="Bluetooth HID Emulator Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

(That video is the old keyboard-only version.)

### Make it work first

You need a Pi with Bluetooth that BlueZ can drive. I started on a Pi 3. A USB keyboard or mouse on the
Pi is optional: only the relay clients need one.

```bash
git clone https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry.git
cd keyboard_mouse_emulate_on_raspberry

# apt + pip deps, the D-Bus policy, patches bluetooth.service and /etc/bluetooth/main.conf
sudo ./setup.sh

# put the MAC of the host (your PC/phone) here; I never got round to a script for it
#   ./server/btk_server.py, line 25: TARGET_ADDRESS = "XX:XX:XX:XX:XX:XX"

# starts the server in a tmux session called "thanhle"
sudo ./boot.sh

# then one of the clients
./keyboard/kb_client.py              # relay the USB keyboard on the Pi
./keyboard/send_string.py "hello"    # type a string, no keyboard needed
./keyboard/proxy_keyboard.py         # type in the Pi's terminal, keys go to the host
./mouse/mouse_client.py              # relay the USB mouse on the Pi
./mouse/mouse_emulate.py 0 10 0 0    # buttons=0, dx=10, dy=0, wheel=0
```

`boot.sh` also runs `updateMac.sh` and `updateName.sh ThanhLe_Keyboard_Mouse`, so that is the
name you look for when pairing. `uninstall.sh` puts things back.

### How it hangs together

One server owns the Bluetooth side. Everything else is a small client that talks to it over
D-Bus (`org.thanhle.btkbservice`):

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

`server/btk_server.py` does three things:

1. registers a BlueZ profile with the SDP record in `server/sdp_record.xml` (that record carries
   the HID descriptor, which is what the host reads to learn "this is a keyboard + mouse + media
   remote");
2. listens on L2CAP PSM 17 (control) and 19 (interrupt), the two channels a Bluetooth HID host
   connects to;
3. exposes `send_keys`, `send_mouse` and `send_consumer` on D-Bus and writes each call to the
   interrupt channel as an input report.

The clients:

| Client | What it does |
|--------|--------------|
| `keyboard/kb_client.py` | reads the USB keyboard on the Pi (evdev), sends the keys |
| `keyboard/send_string.py` | types a string you pass on the command line |
| `keyboard/proxy_keyboard.py` | raw-mode terminal on the Pi, every key you press goes to the host (contributed in 2025) |
| `mouse/mouse_client.py` | reads the USB mouse on the Pi, sends moves and clicks |
| `mouse/mouse_emulate.py` | sends one mouse report from the command line (button, X, Y, wheel) |

### The bytes on the wire

Every report starts with `0xA1` (HID "DATA | Input") and then the report ID. These are the
arrays the server builds:

| Report | Packet | Size |
|--------|--------|------|
| Keyboard | `A1 01 [modifier] [reserved] [key1..key6]` | 10 bytes |
| Mouse | `A1 02 [buttons] [X] [Y] [wheel]` | 6 bytes |
| Consumer | `A1 03 [byte0] [byte1] [byte2]` | 5 bytes |

The media report is a bitmap: one bit per key, 11 used, 13 bits of padding. Usage codes are
from the descriptor in `sdp_record.xml`:

| Bit | Usage | Key |
|-----|-------|-----|
| 0 | 0x0223 | Browser Home |
| 1 | 0x0221 | Browser Search |
| 2 | 0x01B1 | an "AL" launcher usage (not Consumer Control Config, as this table used to say; that one is 0x0183) |
| 3 | 0x00B8 | Eject |
| 4 | 0x00B6 | Previous Track |
| 5 | 0x00CD | Play/Pause |
| 6 | 0x00B5 | Next Track |
| 7 | 0x00E2 | Mute |
| 8 | 0x00EA | Volume Down |
| 9 | 0x00E9 | Volume Up |
| 10 | 0x0030 | Power |

`send_consumer` takes the first two bytes; the third is always 0 because nothing above bit 10
is used.

### What broke, and how it got fixed

The commit log is more honest than any feature list, so here is the short version of it. Some of the
nastier fixes came from other people, not from me.

BlueZ itself was the first fight. In June 2020 the server didn't come up unless `bluetoothd` ran with
`--compat`, so `boot.sh` started its own `bluetoothd --compat --nodetach --debug` in a tmux pane. Today
`setup.sh` only adds `--noplugin=input` to `bluetooth.service`, so BlueZ's own input plugin doesn't grab
the HID channels before the server does. In April 2021 Henri Manson's PR found that registering the
profile resets the device class to 0x400000, so the server now sets the class *after* `RegisterProfile`.

New Raspberry Pi OS releases kept breaking `setup.sh` (Bullseye, then Bookworm, in 2024). Raraph84
reorganised the script; PyBluez now gets installed from source and pip needs `PIP_BREAK_SYSTEM_PACKAGES=1`.
Reconnecting to an already-paired host didn't work at all
([#19](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry/issues/19)), and that stayed open
from 2020 until a fix from Woisol-ISer in 2025. Smaller: `send_string.py` went down to 0.01 s per key in
June 2020.

The mouse didn't work with the old descriptor
([#51](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry/issues/51)). In June 2026 I
replaced it with one combined keyboard + mouse + consumer descriptor and added `send_consumer`. My
first consumer report was 4 bytes; the descriptor says 3 data bytes, so it has to be 5 with the header.
Fixed in the next commit, together with clamping the mouse buttons to the 3 the descriptor declares.

Windows saw the Pi as a speaker
([#42](https://github.com/thanhlev/keyboard_mouse_emulate_on_raspberry/issues/42), open since 2023):
BlueZ loads its A2DP/AVRCP plugins by default, so Windows found audio profiles next to the HID one.
First I disabled those plugins; then I switched to keeping them and disabling the Source/Sink/Media
profiles in `/etc/bluetooth/main.conf` instead (`Disable=Source,Sink,Media`). The device class went from
0x002540 (keyboard only) to 0x0025C0 (keyboard + pointing device).

Also in June 2026: logging in every module (timestamps and levels, much easier when someone pastes a
log into an issue) and unit tests for the keymap, the report layouts, the mouse state and `send_string`.

### Python deps

From `requirements.txt`:

| Package | Why |
|---------|-----|
| `dbus-python` | D-Bus between server and clients |
| `evdev` | read the USB keyboard/mouse |
| `PyGObject` | GLib main loop for the D-Bus service |
| `pyudev` | input device hot-plug |
| `pybluez` | Bluetooth sockets |

## Result

A Pi that pairs as `ThanhLe_Keyboard_Mouse` and works as keyboard, mouse and media remote on the host,
with no driver there. As of 2026-11-22 the repo has 341 stars and 120 forks. MIT licensed; issues and PRs
are how most of the fixes above arrived.

## What I'd do next

The host MAC is still hard-coded in `btk_server.py` (the README literally says "Lazy to write at
scipt", and it also still says line 26 while the variable now sits on line 25), so a pairing script is
the obvious next step. And I haven't tested what hosts do with bit 2 of the media report.

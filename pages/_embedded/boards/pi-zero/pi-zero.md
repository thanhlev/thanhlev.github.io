---
layout: default
title: "Raspberry Pi Zero W (BCM2835)"
short_description: "Bare metal with no SD card, a FreeRTOS shell on the boot cable, and the 12 QPUs driven from my own code"
status: "In Progress"
picture: "assets/images/boards/pi-zero/pz_board_blocks.png"
latest_release: "2026-11-22: hub page with three STAR write-ups"
index: 22
publish: true
permalink: /embedded/boards/pi-zero/
board_hub: true
---

# Raspberry Pi Zero W (BCM2835)

![Pi Zero W block diagram, drawn from the reduced schematic and the device tree]({{ '/assets/images/boards/pi-zero/pz_board_blocks.png' | relative_url }})

The Pi Zero W is the 65 x 30 mm one: a BCM2835 (the same chip as the very first Pi), one ARM1176
core, 512 MB of LPDDR2 stacked on top of the SoC, a CYW43438 for Wi-Fi and Bluetooth, one micro-USB
for data and one for power. Mine has no header soldered and, for this whole project, no SD card and
no UART cable either. Just the USB data cable to my PC.

<a href="{{ '/assets/images/boards/pi-zero/pz_board_model.png' | relative_url }}"><img src="{{ '/assets/images/boards/pi-zero/pz_board_model.png' | relative_url }}" alt="3D model of my Pi Zero W" style="width:100%;max-width:540px"></a>
*My Zero W as a 3D model I made for the video series (no photo of mine yet): 65 x 30 mm, the BCM2835 with the 512 MB stacked on it, two micro-USB, no header.*

The question I started with in October 2026 was simple: what does "bare metal" even mean on this
chip? On a microcontroller the reset vector is yours. Here it isn't. The VideoCore GPU boots first
from its own ROM, runs closed firmware, and only then lets the ARM out of reset at `0x8000`. I wanted
to see how much of that I could poke at from my side of the cable.

![Datasheet bus addresses vs ARM physical addresses]({{ '/assets/images/boards/pi-zero/pz_addr_map.png' | relative_url }})
*The first thing that tripped me: the datasheet prints `0x7E...` VideoCore bus addresses, my ARM code has to use `0x20...`. Same GPIO, UART0 and AUX, 0x5E000000 apart.*

## Timeline

| When | What happened |
|---|---|
| 2026-10-11 | Bare-metal project from an empty folder: a 1381-byte `kernel.img`, checked on QEMU's `raspi0` machine |
| 2026-10-12 | Plugged the board in with no card. USB device boot works, but only after pinning an older firmware |
| 2026-10-12 | Same day: FreeRTOS and a 13-command shell over the boot cable, after a long hunt for a USB drop |
| 2026-10-13 | Went back over my own notes: 10 code excerpts did not match their files, fixed by extracting them from the files |
| 2026-10-20 | `qpu` command: the same multiply-add on the 12 QPUs and on the ARM |
| 2026-10-20 | `cam` command for the CSI port: I2C and the Unicam receiver answer, but I still have no camera |
| 2026-10-20 | The same `rtos_cli` image runs unchanged on my Pi 1 Model B ([Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }})) |

## The stories

{% include board_children.html board="pi-zero" %}

## Still open

- **The camera.** `cam probe` gets a NACK from both sensor addresses (OV5647 at `0x36`, IMX219 at
  `0x10`) because nothing is plugged in. The receiver registers read back as written, and the board's
  own 640x480 test frame comes back to the PC in 1.0 s (my first try took 45.9 s). The real frame
  waits for a camera and a cable.
- **No UART cable yet**, so the bare-metal banner and its baud rate have never been seen on a wire.
- **A crash only shows up as a reboot.** I tried to keep a "black box" record in DRAM at
  `0x0F000000` across a watchdog reset. It was gone after the reset, every time.
- SD-card boot, Wi-Fi, the D-cache and the MMU: not touched.

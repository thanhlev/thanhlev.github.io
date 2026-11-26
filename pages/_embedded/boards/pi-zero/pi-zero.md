---
layout: default
title: "Raspberry Pi Zero W (BCM2835)"
short_description: "Bare metal with no SD card, a FreeRTOS shell on the boot cable, and the 12 QPUs driven from my own code"
status: "In Progress"
picture: "assets/images/boards/pi-zero/pz_hub_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: hub page with three STAR write-ups"
index: 22
publish: true
permalink: /embedded/boards/pi-zero/
board_hub: true
tags: [raspberry-pi, arm, gpu, freertos, bare-metal, boot]
---

# Raspberry Pi Zero W (BCM2835)

![The Pi Zero W in numbers]({{ '/assets/images/boards/pi-zero/pz_hub_cover.jpg' | relative_url }})
*What came out of it: 4799 MFLOPS on the 12 QPUs (66 times the ARM with VFP), and my code running about 10 s after power-on, all over one USB cable. The board on the left is my 3D model of it.*

![Pi Zero W block diagram, drawn from the reduced schematic and the device tree]({{ '/assets/images/boards/pi-zero/pz_board_blocks.png' | relative_url }})

The Pi Zero W is the 65 x 30 mm one: a BCM2835 (the same chip as the very first Pi), one ARM1176
core, 512 MB of LPDDR2 stacked on top of the SoC, a CYW43438 for Wi-Fi and Bluetooth, one micro-USB
for data and one for power. Mine has no header soldered and, for this whole project, no SD card and
no UART cable either. Just the USB data cable to my PC.

<a href="{{ '/assets/images/boards/pi-zero/pz_board_model.png' | relative_url }}"><img src="{{ '/assets/images/boards/pi-zero/pz_board_model.png' | relative_url }}" alt="3D model of my Pi Zero W" style="width:100%;max-width:540px"></a>
*My Zero W as a 3D model I made for the video series (no photo of mine yet): 65 x 30 mm, the BCM2835 with the 512 MB stacked on it, two micro-USB, no header.*

I started in October 2026 with something simple: working out what "bare metal" even means on this
chip. On a microcontroller the reset vector is yours. Here it isn't. The VideoCore GPU boots first
from its own ROM, runs closed firmware, and only then lets the ARM out of reset at `0x8000`. I wanted
to see how much of that I could poke at from my side of the cable.

![Datasheet bus addresses vs ARM physical addresses]({{ '/assets/images/boards/pi-zero/pz_addr_map.png' | relative_url }})
*The first thing that tripped me: the datasheet prints `0x7E...` VideoCore bus addresses, my ARM code has to use `0x20...`. Same GPIO, UART0 and AUX, 0x5E000000 apart.*

What I got out of it: a 1381-byte bare-metal kernel booting over USB with no card (once I pinned an
older firmware), then FreeRTOS with a 13-command shell on that same boot cable, after a long hunt for
a USB device that kept leaving. Later the shell learned to run my own programs on the 12 QPUs, and
the same `rtos_cli` image runs unchanged on my Pi 1 Model B
([Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }})).

## The stories

{% include board_children.html board="pi-zero" %}

## Still open

The camera. `cam probe` gets a NACK from both sensor addresses (OV5647 at `0x36`, IMX219 at `0x10`)
because nothing is plugged in. The Unicam receiver registers read back as written, and the board's
own 640x480 test frame comes back to the PC in 1.0 s (my first try took 45.9 s), so the real frame
just waits for a camera and a cable.

I still have no UART cable, so the bare-metal banner and its baud rate have never been seen on a
wire. A crash only shows up as a reboot: I tried keeping a "black box" record in DRAM at `0x0F000000`
across a watchdog reset and it was gone after the reset, every time. SD-card boot, Wi-Fi, the D-cache
and the MMU I haven't touched.

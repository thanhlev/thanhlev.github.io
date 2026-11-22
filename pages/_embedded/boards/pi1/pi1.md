---
layout: default
title: "Raspberry Pi 1 Model B (BCM2835)"
short_description: "A 2012 Pi with no Linux: FreeRTOS, MJPEG decoded by the VideoCore, a face detector on the 12 QPUs, a WS2812 ring"
status: "In Progress"
picture: "assets/images/boards/pi1/pi1_block.png"
latest_release: "2026-11-22: hub page with four STAR write-ups"
index: 23
publish: true
permalink: /embedded/boards/pi1/
board_hub: true
tags: [raspberry-pi, arm, gpu, freertos, bare-metal, camera]
---

# Raspberry Pi 1 Model B (BCM2835)

![Pi 1 Model B block diagram]({{ '/assets/images/boards/pi1/pi1_block.png' | relative_url }})

The original Pi from 2012: a BCM2835 (one ARM1176 at 700 MHz, a VideoCore IV with 12 QPUs), 512 MB of
LPDDR2 stacked on the SoC, a LAN9512 that is both the USB hub (two ports) and the Ethernet, HDMI, an SD
slot and the old 26-pin header. When I first looked at mine I couldn't find "A" or "B" printed
anywhere. I counted: 26 GPIO pins, an RJ45, two USB ports. So, a Model B. The firmware later said
revision `0x000E`, which is the B rev 2.

<a href="{{ '/assets/images/boards/pi1/pi1_bench.jpg' | relative_url }}"><img src="{{ '/assets/images/boards/pi1/pi1_bench.jpg' | relative_url }}" alt="My Pi 1 B on the bench, HDMI to the monitor" style="width:100%;max-width:640px"></a>
*Mine, on my desk: the Pi 1 B with jumper wires on the header and HDMI into the monitor, 11 s after power-on, my FreeRTOS status panel already on screen.*

Why this board at all: in October 2026 I'd just got FreeRTOS running on my
[Pi Zero W]({{ '/embedded/boards/pi-zero/' | relative_url }}), same chip. The Pi 1 was sitting there
plugged into the PC, so I asked the obvious question: does the Zero's image run on it? It did. And then
it turned into a bigger thing: the face detector I had on my NanoPi 2 Fire, but on a 2012 board, with
no Linux under it.

What it does now: the Zero's FreeRTOS image boots unchanged from the SD card, a loader inside the
firmware takes the next build over the UART at 1.5 Mbaud (no more card swaps), the VideoCore decodes
the webcam's MJPEG for me, and the face detector runs on the 12 QPUs at 43.5 ms a picture. A WS2812
ring counts the faces.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/pi1/pi1_boot_short_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/pi1/pi1_boot_short.mp4' | relative_url }}" type="video/mp4"></video>

*How this board gets from power to my code, 84 s: a real clip of my bench first, then the boot ROM finding `bootcode.bin` (52 KB), `start.elf` (2.9 MB) splitting the RAM 448/64 MB, `kernel.img` at `0x8000`. (Vietnamese on-screen text, background music, no voice-over.)*

## The stories

{% include board_children.html board="pi1" %}

## Still open

The auto start at power-on is on the card, but I haven't watched it come up from a cold boot with the
latest kernel yet. VCHIQ only opens once per GPU boot, so I have to reboot before every `make load`;
annoying, not fixed. The port saves no VFP registers, so only the face task may use floats and the
ring effects run in soft float. Ethernet on the LAN9512 is still unused.

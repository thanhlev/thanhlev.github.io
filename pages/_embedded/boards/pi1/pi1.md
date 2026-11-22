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
---

# Raspberry Pi 1 Model B (BCM2835)

![Pi 1 Model B block diagram]({{ '/assets/images/boards/pi1/pi1_block.png' | relative_url }})

The original Pi from 2012: a BCM2835 (one ARM1176 at 700 MHz, a VideoCore IV with 12 QPUs), 512 MB of
LPDDR2 stacked on the SoC, a LAN9512 that is both the USB hub (two ports) and the Ethernet, HDMI, an SD
slot and the old 26-pin header. When I first looked at mine I couldn't find "A" or "B" printed
anywhere. I counted: 26 GPIO pins, an RJ45, two USB ports. So, a Model B. The firmware later said
revision `0x000E`, which is the B rev 2.

Why this board at all: in October 2026 I'd just got FreeRTOS running on my
[Pi Zero W]({{ '/embedded/boards/pi-zero/' | relative_url }}), same chip. The Pi 1 was sitting there
plugged into the PC, so I asked the obvious question: does the Zero's image run on it? It did. And then
it turned into a bigger thing: the face detector I had on my NanoPi 2 Fire, but on a 2012 board, with
no Linux under it.

## Timeline

| When | What happened |
|---|---|
| 2026-10-20 | The Zero W's `rtos_cli` image boots unchanged from the SD card; pins picked per board revision |
| 2026-10-20 | First UART loader (`pzload`): works on QEMU, prints nothing on the real board |
| 2026-10-25 | YuNet face detector ported from my NanoPi 2 Fire project; same boxes as on the PC (QEMU) |
| 2026-10-26 | Loader built into the firmware itself: new image over the UART at 1.5 Mbaud, no card swap |
| 2026-10-26 | First run on the board: 2.37 s per picture. MJPEG decoded on the VideoCore from bare metal |
| 2026-10-26 | Convolutions moved onto the 12 QPUs: 43.5 ms per picture |
| 2026-10-26 | Webcam drops fixed in the DWC2 isochronous code; WS2812 ring counts the faces |
| 2026-10-27 | Separate FreeRTOS task for the ring, `0xF8` for a 1 bit, new kernel on the card |

## The stories

{% include board_children.html board="pi1" %}

## Still open

- The auto start at power-on is on the card, but I haven't watched it come up from a cold boot with the
  latest kernel yet.
- VCHIQ only opens once per GPU boot, so I have to reboot before every `make load`. Annoying, not fixed.
- The port saves no VFP registers, so only the face task may use floats; the ring effects run in soft
  float.
- Ethernet on the LAN9512 is still unused.

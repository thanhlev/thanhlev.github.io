---
layout: default
title: "NanoPi 2 Fire (S5P4418): bare metal to face detection"
short_description: "An old quad Cortex-A9 board from FriendlyELEC, taken from the boot ROM up to a FreeRTOS webcam that finds faces"
status: "In Progress"
picture: "assets/images/boards/nanopi2-fire/np2f_bench.jpg"
latest_release: "2026-11-22: hub page and six STAR write-ups"
index: 21
publish: true
permalink: /embedded/boards/nanopi2-fire/
board_hub: true
---

# NanoPi 2 Fire
{: .no_toc }

![My bench: the NanoPi 2 Fire, a 16-LED ring, the webcam and the HDMI screen](/assets/images/boards/nanopi2-fire/np2f_bench.jpg)

The NanoPi 2 Fire is a 75 × 40 mm board from FriendlyELEC (FriendlyARM back then), from around 2016.
It has a Samsung S5P4418: four Cortex-A9 cores rated at 1.4 GHz, 1 GB of DDR3 on a 32-bit bus,
Gigabit Ethernet, HDMI, a microSD slot, one micro-USB and a Raspberry-Pi-style 40-pin header. No eMMC,
no Wi-Fi. The PMIC is an AXP228.

Why bother with a board this old? Two reasons. Its vendor software is only lightly maintained, so if I
want something modern on it I have to build it myself. And the S5P4418 boot ROM falls back to USB when
there's no card, which means I can push code into SRAM from my PC and start from zero: no U-Boot, no
Linux, just my own code and the Cortex-A9 manual.

I had just done a "USB webcam to HDMI" demo on my Allwinner D1 board, so the plan was the same here,
but on bare metal and FreeRTOS. It went a lot further than that.

<video controls muted playsinline preload="metadata" poster="/assets/images/boards/nanopi2-fire/np2f_boot_tree_poster.jpg" style="width:100%;max-width:360px"><source src="/assets/videos/boards/nanopi2-fire/np2f_boot_tree.mp4" type="video/mp4"></video>

*The whole board on one chip diagram, 82 s: one boot ROM, four ways I start code on it (USB, my own card, FriendlyELEC's Android card, and the Linux + RTOS split I haven't booted yet). It opens on my screen 3.4 s after power-on. (Vietnamese on-screen text, music track if you unmute.)*

## Timeline

| When | What happened |
|---|---|
| 2026-09-30 | Board on USB with no card: the boot ROM shows up as `04e8:1234`. First bare-metal code runs from SRAM, then 1 GiB of DDR3 comes up |
| 2026-10-01 | FreeRTOS with a shell, then AMP (one kernel per core) and SMP on two and four cores |
| 2026-10-01 | USB webcam on HDMI from FreeRTOS, then moved onto DMA + the JPEG unit; CPU at 1.2 GHz; a microSD image that boots by itself |
| 2026-10-11 → 12 | Android 7.1.2 from FriendlyELEC on a card, a WS2812 ring over spidev and a small Android app for it |
| 2026-10-15 → 24 | Person and face detection on the webcam stream, then a week of making it fast: 642 ms down to 27 ms a run |
| 2026-11-02 | Linux on cores 0–2 next to FreeRTOS on core 3: built, not run on the board yet |

## The write-ups

Each one is written as Situation / Task / Action / Result, with the numbers I measured on the board.

{% include board_children.html board="nanopi2-fire" %}

## Still open

Not written up because there's no result yet: Linux + FreeRTOS side by side (built, never booted),
and the Mali-400 GPU taking over part of the detector (planned, not started).

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

## What I got it to do

The USB boot ROM let me load my own code into SRAM, and from there I brought up the 1 GiB of DDR3 by
hand. On top of that went FreeRTOS with a shell, first one kernel per core and then one kernel on all
four. Then the USB webcam on HDMI, with the copy on DMA and the decode on the JPEG unit, and a microSD
card that boots straight into it. On a different card I ran FriendlyELEC's Android 7.1.2 and drove a
WS2812 ring from it. The last big piece was person and face detection on the webcam stream, which went
from 642 ms a run down to 27 ms.

## The write-ups

Each one is written as Situation / Task / Action / Result, with the numbers I measured on the board.

{% include board_children.html board="nanopi2-fire" %}

## Still open

Two things aren't written up because there's no result yet. Linux on cores 0–2 next to FreeRTOS on
core 3 is built but has never booted on the board. And the Mali-400 GPU taking over part of the
detector is only a plan, I haven't started it.

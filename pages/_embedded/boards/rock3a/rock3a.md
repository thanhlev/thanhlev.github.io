---
layout: default
title: "Radxa ROCK 3A (RK3568)"
short_description: "Bare metal, FreeRTOS on four A55s, a 154 ms boot, NPU without Linux, Android 14, a hidden RISC-V MCU"
status: "In Progress"
picture: "assets/images/boards/rock3a/rock-3a.jpg"
latest_release: "2026-11-22: hub page with seven STAR write-ups"
index: 20
publish: true
permalink: /embedded/boards/rock3a/
board_hub: true
tags: [rockchip, arm, npu, freertos, bare-metal, linux]
---

# Radxa ROCK 3A (RK3568)

![ROCK 3A on my desk]({{ '/assets/images/boards/rock3a/rock-3a.jpg' | relative_url }})

The ROCK 3A is Radxa's Pi-sized board with a Rockchip RK3568: four Cortex-A55 cores, a Mali-G52,
an NPU (Rockchip says 0.8 or 1 TOPS, depending on which doc you read), LPDDR4X (mine has 8 GB), eMMC and a 16 MiB SPI NOR. I bought it because I wanted an
RK3568 I could afford, with an NPU I could poke at and a datasheet-level manual (the TRM) that is
actually public.

The first thing I did with it, a few years ago, was a Yocto port. In October 2026 I came back to it
with a different question: how far down can I go on this chip? Not "install
Debian and run a demo", but start from the BootROM and own every stage I can.

It went further than I planned. Most of what follows was done in about five weeks of evenings and a
couple of nights.

![Five ways to run the board, measured]({{ '/assets/images/boards/rock3a/overview_options.png' | relative_url }})

The overview I made (labels in Vietnamese): the same RetinaFace job in five set-ups, from bare FreeRTOS to Debian with PREEMPT_RT. Top: power-on to the first face, 3.30 s on the RTOS against 10.17 s on Debian. Middle: one inference, 3.44 ms replayed on the NPU at 600 MHz, 1407 ms on the CPU with numpy. Bottom: worst lateness of a 1 kHz task under load, 6.1 µs on an RTOS core against 349 µs on Linux PREEMPT.

## The stories

Each page below is one thing I got working, written as Situation / Task / Action / Result, with the
numbers I measured on this board. The old Yocto port is in the list too.

{% include board_children.html board="rock3a" %}

## Still open

A few things never got a clean result, so they're not pages yet: the board resets itself after running
two 1280x720 webcams at once (cause not found), 640x480 webcam frames only reach 21.6 to 23.6 fps
on the RTOS because my JPEG decoder takes 28 ms each, and the LED ring shows no blue at 3.3 V. The
Real-ESRGAN x4 upscaler on the NPU is too fresh to write up.

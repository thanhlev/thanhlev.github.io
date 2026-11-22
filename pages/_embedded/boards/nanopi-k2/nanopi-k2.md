---
layout: default
title: "NanoPi K2 (Amlogic S905): ten demos waiting for a board"
short_description: "A quad A53 TV-box chip on a Pi-sized board. I've read it, fixed my demos against mainline, and not run them on hardware yet"
status: "Pending"
picture: "assets/images/boards/nanopi-k2/k2_demos_status.png"
latest_release: "2026-11-22: honest hub, nothing measured on a board yet"
index: 31
publish: true
permalink: /embedded/boards/nanopi-k2/
board_hub: true
---

# NanoPi K2
{: .no_toc }

![The ten NanoPi K2 demos and where each one stands](/assets/images/boards/nanopi-k2/k2_demos_status.png)

The NanoPi K2 is FriendlyELEC's Raspberry-Pi-sized board with the Amlogic S905: four Cortex-A53 cores
at 1.5 GHz, a Mali-450 GPU, and the 4K video decoder that made the S905 a TV-box favourite. It has
Gigabit Ethernet (RTL8211F), an AP6212 for Wi-Fi and BT, four USB ports behind one hub, and an IR
receiver.

The vendor BSP has been frozen since 2017, so anything current means mainline. I wrote ten small demos
for it (GPIO, CPU governor, thermal, eMMC and network benchmarks, Wi-Fi scan, USB, IR, HDMI framebuffer,
video decode) before having it on the bench, and that's where it still is.

## What I've done so far (no board)

| When | What |
|---|---|
| 2026-09-27 | Read the FriendlyELEC wiki, the schematic and the vendor trees; rewrote the pin-out page, 41 rows each with a source |
| 2026-09-27 | Answered my own questions from the sources: the boot chain from BootROM to kernel, the clock, the USB layout |
| 2026-10-26 | Audited the ten demos against the mainline device tree; fixed four of them (GPIO line names, eMMC, video decoder, USB) |

A few things the reading settled:

- 1.5 GHz is the rated clock. The 2 GHz people quote is FriendlyELEC's overclock test, not a spec.
- The four type-A USB ports sit behind one GL852G USB 2.0 hub, so they share 480 Mbit/s.
- Mainline still supports the board (its device tree was last changed on 2026-01-14), but the eMMC
  node is disabled by default. Armbian or LibreELEC are the sane OS choices today.
- Pin 10 of the header is GPIOY_14; the schematic's net label says GPIOY_13, which is a typo.
- U-Boot has to be wrapped with Amlogic's signed FIP blobs, then written with `dd` from sector 1,
  keeping the MBR.

Only one demo has run anywhere: `gpio_led_blink` passes against `gpio-sim` on my PC. Every README says
"result when run" with an empty slot for the first real log.

## The write-ups

None yet: nothing has run on the board, so there is no result to write up.

{% include board_children.html board="nanopi-k2" %}

## What's next

Get the board on the bench with Armbian, run all ten demos and paste the real logs. The questions only
the hardware can answer: 4K H.265 decode on mainline, heat without a heatsink, 5 V / 2 A with four USB
loads, and whether it boots eMMC before SD. I also still haven't read the S905 datasheet itself.

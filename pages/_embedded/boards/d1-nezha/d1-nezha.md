---
layout: default
title: "Allwinner D1-H Nezha (RISC-V C906)"
short_description: "A single-core RISC-V board: my own boot0 on SPI-NAND, FreeRTOS, a webcam on HDMI with no Linux, XR829 Wi-Fi on mainline"
status: "In Progress"
picture: "assets/images/boards/d1-nezha/d1_uvc_osd.png"
latest_release: "2026-11-22: hub page with five STAR write-ups"
index: 25
publish: true
permalink: /embedded/boards/d1-nezha/
board_hub: true
---

# Allwinner D1-H Nezha (RISC-V C906)

![My FreeRTOS OSD over the webcam picture on HDMI]({{ '/assets/images/boards/d1-nezha/d1_uvc_osd.png' | relative_url }})

The Nezha is Allwinner's reference board for the D1-H: one T-Head XuanTie C906 core (RV64GC plus their
own pre-1.0 vector extension) at 1008 MHz, a HiFi4 DSP, 1 GiB of DDR3, 256 MB of SPI-NAND, Ethernet,
an XR829 for Wi-Fi/BT, HDMI, USB host and a USB-C OTG port. A RISC-V chip with an MMU, a boot ROM
with a USB mode, and a public user manual: plenty to dig into.

I started in late September 2026 the boring way: reading Allwinner's own D1 docs end to end, then
plugging in an FTDI cable on the debug UART and checking each claim against what the board actually
said. It still ran the stock Tina Linux in NAND. Within a week I was replacing pieces of the boot with
my own.

## Timeline

| When | What happened |
|---|---|
| 2026-09-27 | Read the vendor docs, then measured the stock board over UART and OTG; FEL without pressing the button |
| 2026-09-28 | My own eGON boot0 in NAND block 0: an LED blink from SRAM, no Tina at all |
| 2026-09-28 | Two-stage version: my SPL trains the DDR3, loads an app into DRAM |
| 2026-09-29 | A bare-metal CLI, then FreeRTOS on the C906 over FEL |
| 2026-09-29 | Boot chain over FEL: my boot0, OpenSBI v1.9, U-Boot, an S-mode kernel, SBI reset back to NAND |
| 2026-09-30 | HDMI from FreeRTOS (colour bars at 720p60 and 1080p60), then a USB webcam on screen |
| 2026-10-01 | XR829 Wi-Fi on mainline Linux 6.8, 22 Mbit/s; Wi-Fi scan from FreeRTOS; power-management demos |

## The stories

{% include board_children.html board="d1-nezha" %}

## Still open

- **Wi-Fi from FreeRTOS** stops at the scan: SDIO, the firmware download and a passive/active scan
  work; join, WPA2, DHCP and ping don't exist yet.
- **The FreeRTOS image is 84 KB**, over the 64 KiB app slot my SPL loads from NAND, so it only runs
  over FEL for now.
- **The boot chain** (my boot0, OpenSBI, U-Boot) only runs from FEL; nothing of it is flashed, and it
  hasn't booted a real Linux userspace by itself yet. (The Wi-Fi work booted Linux 6.8 through it over FEL.)
- **No current measurement.** The power demos use die temperature as a proxy; I need a USB-C meter
  between the supply and the board.
- The C906 JTAG pins: I never found the schematic (the sunxi wiki blocked me), so no debugger yet.

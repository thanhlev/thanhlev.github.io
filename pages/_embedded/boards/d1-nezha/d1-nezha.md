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

Where it got to: FEL from a shell command with no hand on the button, my own eGON boot0 in NAND
block 0 (first an LED from SRAM, then an SPL that trains the DDR3 and loads an app), FreeRTOS on the
C906, HDMI and a USB webcam on screen with no Linux, and the XR829 Wi-Fi at 22 Mbit/s on mainline
Linux 6.8 booted through my own chain over FEL.

![Stock boot chain vs the ones I built]({{ '/assets/images/boards/d1-nezha/d1_boot_chains.png' | relative_url }})
*Four boot chains: the stock Tina one I found in NAND, then mine. Grey is vendor code, green is mine, blue is upstream I built myself. (No photo of my Nezha yet, so this is the overview.)*

## The stories

{% include board_children.html board="d1-nezha" %}

## Still open

Wi-Fi from FreeRTOS stops at the scan. SDIO, the firmware download and a passive/active scan work;
join, WPA2, DHCP and ping don't exist yet. The FreeRTOS image is 84 KB, over the 64 KiB app slot my
SPL loads from NAND, so it only runs over FEL for now.

The boot chain (my boot0, OpenSBI, U-Boot) also only runs from FEL. Nothing of it is flashed, and it
hasn't booted a real Linux userspace by itself yet (the Wi-Fi work booted Linux 6.8 through it over
FEL). I have no current measurement either: the power demos use die temperature as a proxy, and I
need a USB-C meter between the supply and the board. And the C906 JTAG pins: I never found the
schematic (the sunxi wiki blocked me), so no debugger yet.

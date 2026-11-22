---
layout: default
title: "Banana Pi M3 (A83T): eight cores, poked over USB"
short_description: "An octa-core Allwinner board I drove from the FEL boot ROM: my own code in SRAM, then DRAM, then a CLI for every peripheral"
status: "In Progress"
picture: "assets/images/boards/bpi-m3/bpim3_fel_path.png"
latest_release: "2026-11-22: hub page and four STAR write-ups"
index: 26
publish: true
permalink: /embedded/boards/bpi-m3/
board_hub: true
tags: [allwinner, arm, bare-metal, boot, memory, usb]
---

# Banana Pi M3
{: .no_toc }

![The path my code takes on the BPI-M3: FEL ROM, SRAM, DRAM init, then programs in DRAM](/assets/images/boards/bpi-m3/bpim3_fel_path.png)

The BPI-M3 is Banana Pi's octa-core board: an Allwinner A83T (two clusters of four Cortex-A7), 2 GB of
LPDDR3, 8 GB of eMMC, an AXP813 PMIC, Gigabit Ethernet and an AP6212 Wi-Fi/BT module. The spec sheet
says 1.8 GHz. Mine still had the vendor's Ubuntu 16.04 image on the eMMC, kernel 3.4.39 from 2017.

I picked it up again right after my Allwinner D1 board, because the A83T has the same trick: hold a key,
plug in USB, and the boot ROM waits for the PC (FEL mode). That means I can run my own code on it
without an SD card, which matters because my PC has no card reader. The other pull was the eight cores
on two clusters: I wanted to see how Linux even wakes the second cluster.

![Block diagram of the BPI-M3 around the A83T](/assets/images/boards/bpi-m3/bpim3_blocks.png)
*What hangs off the A83T on my board: no photo of my own yet, so this is drawn from what my probes found (AXP813 over RSB, AP6212 on SDIO, RTL8211E, 2 GB LPDDR3).*


## What I got it to do

First I only read the vendor image over the serial console: eight cores, eleven CPU frequencies up
to 2016 MHz. Everything after that went in over USB through the FEL boot ROM. My own code from SRAM, a blink of the two
LEDs that hang off the PMIC. Then DRAM: xfel can't bring it up on the A83T, so I ported U-Boot's
init and got all 2 GiB. And last a bare-metal command line in DRAM with one command per peripheral.

## The write-ups

Each one is Situation / Task / Action / Result, with the numbers I measured on my board.

{% include board_children.html board="bpi-m3" %}

## Still open

The mainline U-Boot + Linux 6.18 SD image I built is still unbooted (no card reader here), so every Linux number here is from the vendor
3.4 kernel. The eMMC root file system of the vendor image also has EXT4 errors; I haven't written
anything to it and won't until I can fsck it unmounted.

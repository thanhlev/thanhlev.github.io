---
layout: default
title: "[🔥] - Boot sequence on Wireless MCU ESP8266"
short_description: "What runs between power-on and my app on the ESP8266: ROM (BL0), the first-stage bootloader, the partition table"
status: "Done"
picture: "assets/images/esp8266_boot_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story; ROM addresses re-checked against the SDK"
index: 6
publish: true
tags: [esp8266, boot, memory, mcu]
permalink: /embedded/esp8266-boot-up   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
---

<!-- 2026-11-22: rewritten in STAR form (user «hãy viết lại tất cả các trang theo chuẩn STAR»).
     ROM symbol listings replaced by the lines actually in ESP8266_RTOS_SDK master
     components/esp8266/ld/esp8266.rom.ld (fetched 2026-11-22); see the Update block. -->

# Esp8266 Bootup Sequence
{: .no_toc }

![ESP8266 cover, "ESP8266 boot": BL1 reads the table, who reads the partition table]({{ '/assets/images/esp8266_boot_cover.jpg' | relative_url }})
*The answer of this page: the ROM only knows offset 0; BL1 is the one that reads the partition table at 0x8000.*

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

This is part two of my ESP8266 notes. In [ESP8266 Flash Map & Partition Table](/embedded/esp8266-flash-map)
I went through ROM, RAM, flash and the partition table at 0x8000. What I didn't know after that was
who actually reads that table, and when.

Two facts from part one that everything below leans on. The ESP8266 has ROM, but not erasable or
writable ROM, so application code has to live on an external flash chip. And one flash chip can hold
several applications plus various kinds of data (calibration, file systems, settings), which is why
there's a partition table at offset 0x8000 (the offset can move if the bootloader grows).

## Task

Follow the chip from power-on until my own code runs: where the CPU starts, what the ROM does, how
the bootloader gets loaded, and how the bootloader finds the app.

## Action

### Why a CPU starts in ROM at all

I started one level lower, because "the CPU jumps to ROM" only made sense to me once I asked why it
has to be ROM.

A CPU executes instructions (add, shift, copy, compare...); which instructions and how fast depends on
its architecture (Arm, x86, RISC-V, and the Tensilica L106 here). It can't decide what to run by itself,
so something has to hold the first instructions. It can't be an SD card, eMMC, USB or an SSD: all of those
need a controller that must be initialised first, by code, so putting the first-stage code there is a
chicken-and-egg problem. ROM needs nothing.

ROM and the peripherals sit on a bus, each at a physical address, and the CPU reaches them through
those addresses. So the CPU designer picks one address the core jumps to right after power-on reset:
the [reset vector](https://en.wikipedia.org/wiki/Reset_vector). Every vendor picks its own.

### The ESP8266 reset vector

On the ESP8266 the reset vector is **0x40000080**, inside the internal ROM. Here is what else is on
the chip:

![ESP8266 block diagram](../../../assets/images/esp8266_block_diagram.png)

I couldn't find an address map for the ROM in any Espressif document. The SDK's linker script is the
closest thing; these are lines from it as they are in ESP8266_RTOS_SDK master today:

```
File: ESP8266_RTOS_SDK/components/esp8266/ld/esp8266.rom.ld
PROVIDE ( SPI_sector_erase = 0x400040c0 );
PROVIDE ( SPI_page_program = 0x40004174 );
PROVIDE ( SPI_read_data = 0x400042ac );
PROVIDE ( SPI_read_status = 0x400043c8 );
PROVIDE ( SPI_write_status = 0x40004400 );
PROVIDE ( SPI_write_enable = 0x4000443c );
PROVIDE ( Wait_SPI_Idle = 0x4000448c );
PROVIDE ( Enable_QMode = 0x400044c0 );
PROVIDE ( Disable_QMode = 0x40004508 );

PROVIDE ( Cache_Read_Enable = 0x40004678 );
PROVIDE ( Cache_Read_Disable = 0x400047f0 );
...
PROVIDE ( ets_io_vprintf = 0x40001f00 );
PROVIDE ( uart_rx_one_char = 0x40003b8c );
...
PROVIDE ( rom_software_reboot = 0x40000080 );
```

`rom_software_reboot` sits exactly on the reset vector. So after power-on the CPU fetches its first
instruction at 0x40000080, the physical address of the internal ROM on the bus.

### Internal ROM boot (BL0)

The code in that ROM is put there by Espressif and does two jobs. First, it sets up the UART and
offers functions to talk to the SoC (the SPI flash, cache and UART helpers you see in the linker
script above are ROM code that the SDK calls). Second, it loads the first-stage bootloader (BL1)
into SRAM and runs it.

### First-stage bootloader (BL1)

BL1 is ordinary executable code, and this is where the partition table from part one comes in: its
main job is to read the table, find the user application (for example the right OTA slot), load it
and run it. The SDK calls this binary the second-stage bootloader, counting the ROM as stage one;
I call it BL1 here.

- Stored in external flash at offset **0x0000**. The ROM is hard-coded to read it from there.
- The ROM reads it over SPI from the external flash and copies it into SRAM, at **0x40100000**.
- Once it is loaded, the ROM jumps to 0x40100000.

### User application

- Stored in external flash at the offset the partition table gives.
- BL1 reads the partition table at **0x8000** to find it, reads it over SPI and copies it into SRAM
  at 0x40100000 (after BL1 itself is done), then jumps to the application's entry point.

### Boot mode pins

Which path the ROM takes is decided by three GPIOs sampled at reset:

| GPIO15 | GPIO0 | GPIO2 | Mode |
|--------|-------|-------|------|
| 0 | 0 | 1 | UART download mode (flashing new firmware) |
| 0 | 1 | 1 | Flash boot mode (normal boot) |
| 1 | x | x | SD card boot mode |

## Result

The chain, end to end:

1. Power on: the CPU starts at the reset vector, 0x40000080, in ROM.
2. The ROM (BL0) sets up the basic hardware and checks the boot mode pins. In flash boot mode it loads
   BL1 from flash offset 0x0000 into SRAM.
3. BL1 reads the partition table at 0x8000, finds the app and loads it.
4. The app runs.

So the answer to my question is BL1: the ROM doesn't know there is a partition table, it only knows
offset 0. A caveat on all the ROM addresses: they come from the SDK linker script, not from a
datasheet, and I haven't traced any of this on a board with a debugger.

> **Update (2026-11-22)**
> When I re-checked this page against `esp8266.rom.ld` in ESP8266_RTOS_SDK master, my old copy of the
> listing didn't match it: `SPI_write_enable` had the same address as `Cache_Read_Enable`, and a second
> block of UART/eFuse/interrupt functions had addresses that aren't in that file at all. I replaced both
> with the lines that are really there.

## What I'd do next

Watch it happen: put a logic analyser on the SPI flash lines and see the ROM read offset 0x0000 and
then BL1 read 0x8000, instead of taking it from the docs. The flash layout this boot chain reads from
is in part one, [ESP8266 Flash Map & Partition Table](/embedded/esp8266-flash-map).

## References

1. ROM code reads the config pins on the SoC to know where to boot from. On a SoC that supports eMMC,
   SD card, SSD or USB, the ROM looks for code on whichever one the pins select.
2. [ESP8266 Technical Reference](https://www.espressif.com/sites/default/files/documentation/esp8266-technical_reference_en.pdf)
3. [ESP8266 Boot Process](https://github.com/espressif/ESP8266_RTOS_SDK/tree/master/components/bootloader)
4. [esp8266.rom.ld](https://github.com/espressif/ESP8266_RTOS_SDK/blob/master/components/esp8266/ld/esp8266.rom.ld)

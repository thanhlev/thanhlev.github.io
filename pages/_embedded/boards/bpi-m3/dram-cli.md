---
layout: default
title: "A bare-metal command line for every peripheral on the board"
short_description: "29 KiB of my own code in DRAM, loaded over FEL: one command per block, from the PMIC to the IR receiver"
status: "Done"
picture: "assets/images/boards/bpi-m3/bpim3_cli_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-04: every command measured on the board"
index: 4
publish: true
permalink: /embedded/boards/bpi-m3/dram-cli
board_parent: bpi-m3
result: "eMMC, Wi-Fi, BT, PHY and IR all answer; 64 MiB memtest, 0 errors"
tags: [allwinner, arm, bare-metal, memory, wifi]
---

# A bare-metal command line for every peripheral on the board
{: .no_toc }

[Back to the Banana Pi M3 hub](/embedded/boards/bpi-m3/)

![Banana Pi M3 cover, "A CLI for every block": 64 MiB tested, 0 errors, 29 KiB of my code, over FEL]({{ '/assets/images/boards/bpi-m3/bpim3_cli_cover.jpg' | relative_url }})
*EMMC, Wi-Fi, BT, the PHY and the IR receiver all answer, and 64 MiB of memtest gives 0 errors.*

1. TOC
{:toc}

## Situation

The day after. DRAM worked over FEL, so I had 2 GiB and a CPU that does exactly what I tell it. What
I didn't have was any idea whether the rest of the board was alive under my code: eMMC, the SDIO Wi-Fi,
Bluetooth, the Ethernet PHY, the IR receiver. The vendor image talks to most of it through blobs.

![Each BPI-M3 block with the dram_cli command meant to test it](/assets/images/boards/bpi-m3/bpim3_cli_before.png)
*The plan for the CLI: one command per block, and at that point a question mark on every one of them.*


## Task

One program on UART0 (CON2) with a command per peripheral, read-only for storage, that I can load,
poke, and `exit` back to FEL for the next build. No U-Boot, no OS.

## Action

It's loaded the same way as the DRAM blink: `ddr_init.bin` first, then `cli.bin` at 0x40000000.
There's no write command for eMMC or SD, on purpose.

```
$ make                      # cli.bin, about 29 KiB
$ sh run.sh                 # board in FEL: DRAM init, load, start
$ python3 cli.py /dev/ttyUSB0 help info pmic emmc
$ python3 cli.py /dev/ttyUSB0 exit
```

Getting it to run taught me a few rules the hard way. Anything written before `.bss` is cleared
must not live in `.bss`: my `exit` once restored a stack pointer of 0. FEL writes the new image behind
the cache, so invalidate the I-cache before turning it on. With the MMU off, unaligned loads fault,
hence `-mno-unaligned-access`. The SD/MMC module clock has to run before the controller reset can
finish, or it never does. The first temperature sample reads 0 until a conversion ends, so throw it
away. And every polling loop has to reach its timeout test on every path, because the one path that
skipped it was a hang.

One issue from that session is still open. My suspect: I had a second serial terminal on the same port
while `cli.py` ran, and two readers on one port split the bytes between them.

## Result

| Command | Result on my board |
|---|---|
| `info` | Cortex-A7 r0p5, 408 MHz (ROM clock) |
| `memtest` | 64 MiB, 0 errors, 16 MB/s with caches off |
| `pmic` | AXP813 IC 0x51, ACIN + VBUS present, every rail read |
| `emmc` | Samsung 8WPD3R, 7456 MiB, MBR, boot0 checksum OK |
| `temp` | 3 sensors, about 39 to 44 °C |
| `eth` | RTL8211E, PHY ID 001c:c915, link down (no cable) |
| `wifi` | SDIO CMD5 answers: Broadcom 02d0 / BCM43430 a9a6 |
| `bt` | HCI reset ok, BT 4.1, Broadcom, subversion 2209 |
| `usb` | EHCI0 port enabled, high-speed device (on-board hub) |
| `ir` | 12-bit fixed-code remote, 6 codes decoded |
| `ac100` | RTC running, still at 1970 (never set) |
| `i2c` | TWI0 to 2 scan: nothing on CON1 (nothing plugged in) |

![Each BPI-M3 block with the result my bare-metal CLI got from it](/assets/images/boards/bpi-m3/bpim3_cli_after.png)
*Same diagram afterwards: every block answered, from the AXP813 (IC 0x51) to the IR receiver (6 codes).*


Also there: `timer` (Timer1 at 24 MHz; the ARM generic timer isn't counting, the ROM leaves it off),
`led`/`key`, `pin`/`header` (all 40 pins of CON1 with function and level), `sd` (no card in the slot).

## What I'd do next

Close that open issue for real, with only one program on the port. And use this as the
test bed when the mainline image finally boots: every number in the table above is something Linux
should agree with.

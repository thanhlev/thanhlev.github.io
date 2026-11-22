---
layout: default
title: "Bare metal from the BootROM, no hands on the board"
short_description: "sram_hello and dram_hello loaded over Maskrom, and a reset that drops the chip straight back into Maskrom"
status: "Done"
picture: "assets/images/boards/rock3a/boot_seq.png"
latest_release: "2026-10-16: dram_hello dev loop"
index: 10
publish: true
permalink: /embedded/boards/rock3a/maskrom-bare-metal
board_parent: rock3a
result: "8 GB DRAM seen from my own code; download to Maskrom again in ~3 s, 0 hands"
---

# Bare metal from the BootROM, no hands on the board

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }}) · measured 2026-10-16

![RK3568 boot sequence]({{ '/assets/images/boards/rock3a/boot_seq.png' | relative_url }})

## Situation

I wanted to run my own code on the RK3568 with nothing underneath it: no U-Boot, no TF-A, no Linux.
The chip has a USB download mode in its mask ROM (Rockchip calls it Maskrom, it's the same idea as
FEL on Allwinner). The catch on my bench: the relay I'd wired for power cycles turned out to do
nothing once the board moved to a proper PSU, so every power cycle needed my hand.

## Task

1. Get a tiny program (`sram_hello`) running from SRAM, printing on UART2 and blinking the LED.
2. Get one running from DRAM (`dram_hello`), which means the DDR training has to happen first.
3. Make the loop hands-free: build, download, run, and land back in Maskrom by itself.

![The two SRAMs of the RK3568]({{ '/assets/images/boards/rock3a/maskrom_sram_map.png' | relative_url }})

Before DDR training the only memory is on the chip: 64 KB of system SRAM at `0xfdcc0000` (where `sram_hello` lives, and where the DDR blob runs later) and 8 KB of PMU SRAM. Drawn from TF-A's `rk3568_def.h` plus my own measurement of the blob's size (59 240 B). The pink block is from a later experiment.

## Action

**From U-Boot first.** At that point my PC only saw the board through USB-C, which is power only,
so Maskrom was out and the first
`sram_hello` went in through the vendor U-Boot prompt: 329 `mw.l` writes into SRAM at `0xfdcc6000`
and a `crc32` to check it. `go 0xfdcc6000` crashed with an instruction abort (`esr 0x8600000e`):
U-Boot's MMU maps SRAM as non-executable device memory. My workaround was a bit silly but it worked.
I wrote an 88-byte fake Linux `Image` into DRAM whose only job is `blr 0xfdcc6000`, and started it
with `booti`. `booti` turns the MMU off before jumping, as Linux expects, so SRAM becomes executable.

**Then from Maskrom.** With the A-A cable in, I found I didn't even need the Maskrom jumper: U-Boot's
`download` started a USB gadget my PC never saw, and Ctrl+C on it printed
`Enter rockusb failed, fallback to bootrom...` and dropped the chip into the BootROM's USB mode. Fine
by me.

The first Maskrom run of `sram_hello` was painfully slow: six "500 ms" LED blinks took 328 s. Straight
from the BootROM nobody has programmed `CNTFRQ_EL0` and the system counter isn't running, so my
`delay_ms()` fell back to a busy loop sized for a fast CPU with caches on. I measured the real rate
(50 000 000 turns took 54.7 s, so 914 turns per ms) and put that in.

**DRAM.** For `dram_hello` I packed Rockchip's closed DDR blob as the first image (471) and my code as
the second (472). The BootROM runs the blob, it trains the LPDDR4X, returns, then the BootROM copies
my 472 to DRAM address `0x0` and jumps to it at EL3. My code starts the STIMER (so the generic timer
counts at 24 MHz), probes 10 addresses up to `0x1fff00000`, and runs a 16 MiB write/read test.

![Where the DDR blob sits in the 471 image]({{ '/assets/images/boards/rock3a/maskrom_ddr_blob.png' | relative_url }})

Why `dram_hello` needs two images: the 471 is Rockchip's closed DDR blob v1.26 (59 240 B of the 60 KB the BootROM allows), it trains the LPDDR4X and returns to the BootROM. The red boxes are the things I wanted and can't have: FreeRTOS can't call the blob (it lives in the DRAM that isn't trained yet), and there's no public source to rewrite it from.

**The hands-free part** is three registers. `dram_hello` ends with `reset_into()`: write `0xEF08A53C`
into `PMU_GRF os_reg0` (`0xfdc20200`, U-Boot keeps its boot-mode flag there), wait for UART `LSR.TEMT`
so the last line isn't cut, then write `0xfdb9` to the CRU global reset. The BootROM reads the flag
after reset and goes straight back to USB download.

```
~/rock3a$ make -C dram_hello run
    1.06  BW=32 Col=10 Bk=8 CS0 Row=17 CS1 Row=17 CS=2 Die BW=8 Size=8192MB
    1.11  change to: 1560MHz(final freq)
    1.37  loaded at     0x0000000000000000
    1.37  CurrentEL     0x0000000000000003
    2.28  4 x 250 ms on the timer took 1000221 us
    2.48  probe 0x00000001fff00000      ok      (10 of 10 ok)
    3.08  write 141557 us = 118 MB/s
    3.08  read  480783 us = 34 MB/s, errors 0
    3.68  dram_hello: reset into Maskrom (boot mode 0xef08a53c)
Bus 003 Device 017: ID 2207:350a Fuzhou Rockchip Electronics Company
```

The last line is my PC seeing a brand-new Maskrom device. That's the loop closing.

## Result

- `sram_hello` from Maskrom: 6 blinks went from **328 s to 3.01 s** after the busy-loop fix.
- `dram_hello`: all **8 GB** answer (2 ranks, trained to 1560 MHz), 0 errors on the 16 MiB test.
- Bandwidth with the MMU off: **118 MB/s write, 34 MB/s read**. That's latency, not bandwidth: every
  access is Device memory, one 8-byte read about every 235 ns.
- Dev loop: about **3 s** from `rkdeveloptool db` to the last UART line, then the board is waiting in
  Maskrom again. `make END=normal run` leaves it booting the vendor Ubuntu instead (login after 40 s).

## What I'd do next

The 34 MB/s bugs me. An identity map with DRAM as Normal cacheable memory and the caches on should
give GB/s; I did that later inside FreeRTOS (633 MB/s read at 400 MHz) but never went back to measure
it in plain bare metal. A hang still needed my hand at this point; a day later the watchdog took that
over too (see the [FreeRTOS page]({{ '/embedded/boards/rock3a/freertos-smp' | relative_url }})).

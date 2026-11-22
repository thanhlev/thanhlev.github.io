---
layout: default
title: "DRAM init over FEL, and the probe that froze the boot ROM"
short_description: "xfel ddr doesn't know the A83T, so I ported U-Boot's LPDDR3 init into a 4 KiB SRAM program"
status: "Done"
picture: "assets/images/boards/bpi-m3/bpim3_dram_order.png"
latest_release: "2026-10-04: 2 GiB up and tested, blink runs from 0x40000000"
index: 3
publish: true
permalink: /embedded/boards/bpi-m3/dram-init
board_parent: bpi-m3
result: "2 GiB LPDDR3, 294 896 words tested, 0 errors, 3.44 s"
tags: [allwinner, arm, bare-metal, boot, memory, testing]
---

# DRAM init over FEL, and the probe that froze the boot ROM
{: .no_toc }

[Back to the Banana Pi M3 hub](/embedded/boards/bpi-m3/)

1. TOC
{:toc}

## Situation

Same night as the blink. It ran from SRAM, but SRAM A2 is tiny. On the D1, `xfel ddr` brings up
DRAM for you. On the A83T:

```
$ xfel ddr
Failed to initial ddr controller
$ xfel ddr lpddr3
Failed to initial ddr controller
```

No luck, xfel has no DRAM init for this chip.

![ddr_init in SRAM brings up DRAM; reading DRAM before that hangs the ROM](/assets/images/boards/bpi-m3/bpim3_dram_order.png)
*The plan, and the hole I fell into on the way: a 4196-byte init in SRAM, DRAM only after it says `DDR!`. My early `hexdump 0x40000000` cost a power cycle.*


## Task

Bring up the 2 GB of LPDDR3 myself, from a program in SRAM, prove it works, then run the unchanged
blink from DRAM. Everything over FEL, no SD card.

## Action

U-Boot already knows how to do it: `dram_sun8i_a83t.c`, 471 lines. I copied it and
changed only how registers are addressed (U-Boot uses struct pointers, I use plain addresses), plus a
small `compat.h`. The first compile warned about a missing `max()` and a pointer/integer mix; fixed,
2560 bytes of code.

Around it, my own `main` does what SPL would normally do first:

1. DCDC5 (the DRAM supply) to 1.2 V over RSB: `32 + (1200 - 1140) / 20 = 0x23`, U-Boot's formula.
2. PLL6, MBUS, PLL5, gates.
3. U-Boot's init: timing, ODT, ZQ, PHY training, size detection.
4. A memory test, then a magic word `DDR!` in the result table if it all passed.

`ddr_init.bin` came out at 4196 bytes, linked at 0x44000 like the blink.

Then I hurt myself. Before running the init I wanted a "before" picture, so I did
`xfel hexdump 0x40000000 16`. That read never returned, `timeout` killed it, and from then on the ROM
answered nothing:

```
$ xfel hexdump 0x40000000 16
Terminated
usb bulk send error
rc=124
```

Reading DRAM while the DRAM controller has no clock leaves the CPU's bus transaction waiting forever.
Power cycle, back in FEL.

Two smaller bugs on the way: a field in my result table read "MfCe", because there's no C runtime
clearing `.bss` (so don't trust `.bss`). And my shell guard comparing the magic failed, because
`xfel read32` prints `0x21524444\r\n`. A `tr -d '\r'` fixed it.

A small `run.sh` does the whole thing with a guard: init, check the magic is `DDR!`, and only then
write to DRAM.

```
$ sh run.sh 4 250 2
```

## Result

DRAM came up with all 2 GiB, controller config `0x004719E5` (2 ranks, 8 banks, 16-bit bus, LPDDR3),
and both byte lanes trained clean (DXnGSR0 = 0x0046A300 on lanes 0 and 1). The memory test checked
294 896 words, dense over the first 1 MiB plus one word every 64 KiB, with 0 errors. Init plus test
took 3.44 s, and then the CPU was back in FEL.

The unchanged blink, relinked at 0x40000000, ran from DRAM and wrote `DONE` at 0x40000F00, an address
only DRAM has. 8 writes, so 4 blue blinks, in 2.0 s.

![Coverage of the 294 896-word memory test over 2 GiB](/assets/images/boards/bpi-m3/bpim3_memtest.png)
*What my "0 errors" actually covers: every word of the first MiB, then one word per 64 KiB. It's a smoke test, not a full memtest.*


Not measured: DRAM at full speed or with marginal timing. The CPU was at the ROM's clock with caches
off.

## What I'd do next

The obvious one: put something bigger than a blink in all that DRAM. That became the
[bare-metal CLI](/embedded/boards/bpi-m3/dram-cli).

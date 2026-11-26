---
layout: default
title: "FreeRTOS on core 3 at 154 ms, Linux on the other three"
short_description: "Boot from SPI NOR, a 1 kHz loop through DDR training, a patched BL31 handover, and cutting the image the BootROM reads"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_nor_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-23: 472 packed to 111 KB, RTOS at 154 ms"
index: 12
publish: true
permalink: /embedded/boards/rock3a/rtos-before-linux
board_parent: rock3a
result: "FreeRTOS takes core 3 at 0.154 s (was 3.90 s); Linux prompt at 2.49 s; 1 kHz loop worst lateness 0.25 µs"
tags: [rockchip, arm, freertos, bare-metal, linux, boot]
description: "Boot from SPI NOR, a 1 kHz loop through DDR training, a patched BL31 handover, and cutting the image the BootROM reads"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# FreeRTOS on core 3 at 154 ms, Linux on the other three

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![ROCK 3A cover, "FreeRTOS before Linux": 0.154 s (was 3.90), core 3 first, Linux on three]({{ '/assets/images/boards/rock3a/r3a_nor_cover.jpg' | relative_url }})
*FreeRTOS owns core 3 at 0.154 s instead of 3.90 s, Linux still reaches its prompt at 2.49 s, and the 1 kHz loop is never more than 0.25 µs late.*

![Three NOR boot builds on one time axis]({{ '/assets/images/boards/rock3a/nor_boot_timeline.png' | relative_url }})

*The figure is from my wiki, so the labels are in Vietnamese. Each row is one build; the green arrow is
the moment FreeRTOS owns core 3, the pink bar under it is the real-time loop that runs from 0.4 ms.*

## Situation

I had FreeRTOS on four cores and a mainline Linux, but never both, and never quickly. On a robot the
motor loop shouldn't wait for Linux to finish booting. A normal RK3568 boot needs seconds before
anything of mine runs: the DDR blob trains, the BootROM loads the next stage, TF-A, U-Boot, kernel.

## Task

A hard real-time loop on core 3 from the very first instructions, even while DRAM is being trained.
Then hand core 3 to FreeRTOS and boot Linux on cores 0 to 2 next to it, with no U-Boot. All of it from
the 16 MiB SPI NOR, so the board boots by itself, and with the RTOS up as early as I can get it.

![The plan: a stage between BL31 and Linux]({{ '/assets/images/boards/rock3a/amp_handover_plan.png' | relative_url }})

*The plan I drew before writing any of it (Vietnamese labels): BootROM, DDR blob, my `tramp` at EL3, BL31, then core 3 started into `rtos_amp` while Linux boots on cores 0 to 2 and attaches to it later with `amp_ctl.ko`.*

## Action

The loop has to run before DRAM exists. The only RAM free while the DDR blob runs is the second half of the 8 KB
PMU SRAM. My first-stage 471 starts the STIMER, copies a tiny `rt_loop` there, wakes core 3 through the
BootROM's mailbox and returns. Core 3 then busy-waits 1 ms deadlines on `CNTPCT`. The first
measurement said "no period lost", and it was wrong: the DDR blob resets the STIMER twice (around
5.5 ms and 285 ms), and a loop that only compares against its deadline can't see a counter that jumped
back. The loop now treats any reading lower than the previous one as a reset and shifts its deadline
by the same jump.

![Core 3 runs a 1 kHz loop while the DDR blob trains]({{ '/assets/images/boards/rock3a/amp_loop_before_dram.png' | relative_url }})

*Core 3 in its 1 kHz loop from PMU SRAM, under the whole DDR training and download: 7820 periods in 7821 ms, worst 0.25 µs late. The red marks are the two STIMER resets (~5.5 ms and ~285 ms) that fooled my first version.*

Booting from NOR ate a whole afternoon, most of it asking "why is it back in Maskrom". U-Boot's mkimage has two
Rockchip header types, `rksd` and `rkspi`. `rkspi` pads every 2 KB to 4 KB for older SoCs. I picked
`rkspi` because the name said SPI. The RK3568 BootROM silently ignores it and falls back to Maskrom.
Comparing against U-Boot's own `u-boot-rockchip-spi.bin` showed it uses `rksd`, at NOR offset `0x8000`.
I also stopped trusting the Rockchip SPL loader for writing the NOR (it once repeated a 32 KB chunk,
and once wedged so hard only a power cut helped) and wrote a `spi flash` command into my own shell
that erases, programs and reads back every byte.

![Same two images, mkimage -T rksd vs -T rkspi]({{ '/assets/images/boards/rock3a/amp_nor_rksd_rkspi.png' | relative_url }})

*The afternoon's mistake in one picture: the same two images packed with `-T rksd` (data back to back, boots) and with `-T rkspi` (2 KB of data in every 4 KB, the RK3568 BootROM ignores it and falls back to Maskrom). Idblock at NOR offset `0x8000`.*

For the handover, a small `tramp` at EL3 places the RTOS at `0x30000000` and fills a mailbox. I patched BL31
in three places, each of which would kill an RTOS that runs before Linux: it reloads the STIMER (the
counter would jump to 0 under a running tick), it leaves Group 1 Non-secure interrupts off until Linux's
GIC driver turns them on, and its write of the request sat in core 0's cache for 19 ms because core 3
reads PMU SRAM with its MMU off. With a cache clean after the write, core 3 sees the request 22 µs
later. Linux then boots and `amp_ctl` just attaches: `core 3 already runs '20261023-2156': attached`.

The first NOR build gave FreeRTOS core 3 only at 3.9 s. The BootROM reads the whole second image from NOR, one data line at 24 MHz,
about 2.8 MB/s, before running a byte of it. My 472 carried the 6.5 MB kernel, so the RTOS waited for
a kernel it doesn't need. I split it: the BootROM now reads a small 472 (366 KB), and a 3 KB `nsloader`
I wrote reads the kernel later with quad-output reads and a CRC-32 on the fly. That alone brought
the RTOS to 0.242 s.

Then 366 KB down to 111 KB. 136 KB of that 472 was all-zero pages (page tables, gaps), and 66 KB was
the DTB, which `nsloader` can read later. `mkimage.py` now cuts everything into 64-byte blocks and
writes a table of (src, dst, len) records; `src = 0` means "write zeros". Before writing the NOR I ran a
Python replay of `tramp` over the 31 records and compared every piece byte for byte, because a bad
record only shows as a board that doesn't boot.

```
  0.101  out
  0.141  NOTICE:  BL31: core 3 asked to start the RTOS at 0x30000000
  1.495  nsloader: read 1350 ms (4755 KB/s), CRC ok; Linux
  2.487  linux_min: BusyBox shell (exit = kernel panic, reset the board)
  handover: asked at 153 ms, taken 829 us later, after 154 periods (154 ms since power-on)
```

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_rtos_before_linux_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_rtos_before_linux_169.mp4' | relative_url }}" type="video/mp4"></video>

*From my film on this boot (Vietnamese narration, 70 s): the four problems in order, the 1 kHz loop that had to wait for Linux, BL31 switching core 3 off, the slow hand-off through the cache, the big first image, then the UART log of the 154 ms start.*

| Milestone | First NOR build | Kernel split off | Packed 472 |
|---|---|---|---|
| Image the BootROM reads | ~10.7 MB | 366 125 B | **110 832 B** |
| FreeRTOS owns core 3 | 3.897 s | 0.242 s | **0.154 s** |
| Linux prompt | 4.888 s | 2.561 s | **2.487 s** |

The real-time loop starts **174 µs** after my first instruction and keeps its 1 kHz period through
DDR training and the whole download: 7820 periods in 7821 ms, worst lateness **0.25 µs**, 0 periods
late by more than 10 µs. The only gap on core 3 is the switch from the loop to FreeRTOS, 4.3 ms.

![The 472 before and after packing, and the NOR map]({{ '/assets/images/boards/rock3a/amp_472_packed.png' | relative_url }})

*The image the BootROM has to read, before and after packing: 366 125 B with 136 KB of zero pages (BootROM done at 141 ms), then 110 832 B as 31 records (40 ms). Below, the 16 MiB NOR to scale, with the 6.4 MB kernel at `0x100000` that `nsloader` reads later.*

The blue LED tells me who owns core 3 without a terminal: an even 1 Hz is the loop, a double blink is
FreeRTOS.

## What I'd do next

Of the 154 ms, 101 ms is DDR training in Rockchip's closed blob, and I don't see a way around that.
The Linux side is where the time is now: `nsloader` reads the NOR at 4.8 MB/s, while U-Boot read the
eMMC at 91 to 125 MiB/s in HS200 on the same board. An eMMC driver in `nsloader` would cut most of
the 1.35 s kernel read. For the RTOS itself I expect almost nothing from eMMC (my guess is 0.15 to
0.17 s, not measured).

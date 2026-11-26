---
layout: default
title: "FreeRTOS on the C906: a 27x cache surprise, and an RTOS that never slept"
short_description: "The generic RISC-V port in M-mode, loaded over FEL; two things only the measurements caught"
status: "Done"
picture: "assets/images/boards/d1-nezha/d1_rtos_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-01: idle hook with wfi by default"
index: 30
publish: true
permalink: /embedded/boards/d1-nezha/freertos-c906
board_parent: d1-nezha
result: "Task switch 19907 -> 734 cycles with the D-cache on; tick wake-up 0.50 µs; idle wfi ~2.5 C cooler"
tags: [allwinner, risc-v, freertos, bare-metal, memory]
---

# FreeRTOS on the C906: a 27x cache surprise, and an RTOS that never slept

[Back to the D1 Nezha hub]({{ '/embedded/boards/d1-nezha/' | relative_url }}) · measured 2026-09-29 and 2026-10-01

![The result first]({{ '/assets/images/boards/d1-nezha/d1_rtos_cover.jpg' | relative_url }})
*The result first: one task switch went from 19 907 to 734 cycles once the D-cache was on. Chip photo: [Popolon](https://commons.wikimedia.org/wiki/File:AllWinner_D1.jpg), CC BY-SA 4.0.*

![One task switch on the C906, cache off vs on]({{ '/assets/images/boards/d1-nezha/d1_rtos_switch.png' | relative_url }})

## Situation

By then I had a bare-metal CLI on the Nezha (`d1_cli`: UART, I2C, SD, SDIO, DMA, the vector unit...)
loaded from my [own SPL]({{ '/embedded/boards/d1-nezha/own-boot0' | relative_url }}) or over FEL. It
runs in M-mode, no SBI firmware under it, built with zig. I wanted an RTOS under that shell, and real
latency numbers for the C906, because I couldn't find any published.

I chose FreeRTOS, not RT-Thread, even though RT-Thread has D1 BSPs. Those are RT-Smart: S-mode with the MMU, entered
through OpenSBI and U-Boot, and they want GNU GCC. I'd have had to throw away my boot path, my
toolchain and my shell. FreeRTOS's generic RISC-V port runs in M-mode and leaves the timer to me.

![M-mode only vs S-mode on OpenSBI]({{ '/assets/images/boards/d1-nezha/d1_mode_pair.png' | relative_url }})
*The two roads, from my own notes on the D1 boot chain: left, everything at physical addresses with no MMU and the CLINT mine; right, OpenSBI in M-mode and a kernel at `0xffff_ffff_8...` through page tables.*

## Task

FreeRTOS V11.2.0 on the C906 with a 1 kHz tick from the CLINT, an interrupt-driven console, all the
`d1_cli` commands as before, plus commands that measure the kernel itself. Load over FEL, and `exit`
back to FEL so the edit-run loop needs no hands.

## Action

**The tick.** With `portasmHAS_MTIME 1` the port updates `mtimecmp` with one 64-bit store, which the
C906 CLINT doesn't take, and there's no hook to replace it. With `0`, the trap code hands the timer
interrupt to a C handler I own. I took 0.

**A bug of mine, with damage.** The link rule was `-o $$@` inside a `define` used through `$(call)`.
It reached the shell as `-o $@`, empty, so the linker took the next word as its output:
`../d1_cli/app/start.S`. It overwrote a committed source file of the other project with an ELF.
`git status` in `d1_cli` caught it (`file` said "ELF 64-bit LSB executable"), `git checkout` restored
it, and the macro now takes the output file as an explicit argument.

**First board run.** Tick, UART interrupt, preemption, sleeping in the kernel: all worked the first
time. Then the numbers:

```
d1rt> rt switch
100000 round trips = 200000 task switches in 3953685.958 us
one switch (notify + ecall + save/restore 31 regs + scheduler): 19926 cycles = 19.750 us (~19768 ns)
d1rt> rt jitter 10
wake-up latency (tick compare -> task running): 10000 samples min 14.958 us avg 15.583 us max 17.916 us
```

20 000 cycles per task switch. Way too slow. `info` showed `mhcr 0x109`: FEL and my SPL leave the
D-cache off. Every stack and list access was a DRAM round trip, and my old `d1_cli` bench had already
shown uncached DRAM reads about 20x slower than writes. One command to test it:

```
mhcr 109 -> 10b: D-cache ON (bit1), I-cache on (bit0)
one switch (notify + ecall + save/restore 31 regs + scheduler): 739 cycles = 0.708 us (~733 ns)
wake-up latency (tick compare -> task running): 10000 samples min 0.500 us avg 0.500 us max 0.541 us
```

**And then I broke FEL.** The binary I had loaded before had no cache handling, and I'd typed
`cache on` in it. It exited to FEL with the D-cache still on. `xfel write` then put the new image into
DRAM behind dirty cache lines, the CPU ran stale bytes, and the board hung with FEL dead. Even the
16 s watchdog didn't fire. I had to go and press the button on the board by hand. Now `main()` turns the D-cache on at start and
every way out (`exit`, `fel`, a fatal error) cleans it and turns it off first.

**The RTOS never slept.** Two days later I wrote power-management demos (clock changes, PLL off, power
domains, die temperature). My `pm wfi` demo said the core had been stopped for most of the second.
`mcycle` disagreed: it counted 99.9 % of the cycles. So I counted retired instructions instead
(`minstret`), with every task asleep:

```
999 ms at 1008 MHz: sleeping retired 517544620 instructions (1007777143 cycles counted), spinning 431965490: 119.81% of the work
```

While "sleeping" the core retired *more* instructions than a busy loop. The IDLE task was spinning:
`configUSE_IDLE_HOOK` was 0, and the only `wfi` in the whole image was in the fatal-error path. I added
an idle hook with `wfi`:

```
999 ms at 1008 MHz: sleeping retired 225457 instructions (1007367730 cycles counted), spinning 377840483: 0.05% of the work
idle is wfi
```

![Instructions retired while asleep: spin vs wfi]({{ '/assets/images/boards/d1-nezha/d1_idle_wfi.png' | relative_url }})
*Same 999 ms, every task asleep: 517 million instructions with the idle task spinning, 225 thousand with `wfi`. Log scale, or the green bar wouldn't show.*

(`mcycle` keeps counting through `wfi` on the C906, so it can't show sleep. That's why the first demo
lied.) The temperature sensor also read -10 C at first; it needed a trim value from the SID copied in.

## Result

| Measurement | D-cache off | D-cache on | On, CPU + memory load |
|---|---|---|---|
| task switch | 19 907 cycles (19.7 µs) | **734 cycles (0.71 µs)** | |
| tick wake-up, 10 000 samples | 14.96 / 15.58 / 18.04 µs | **0.500 / 0.500 / 0.541 µs** | 0.92 / 2.92 / 5.29 µs |
| wake-ups that slipped a tick | 0 | 0 | 0 |

So one bit in `mhcr` made the task switch **27x** faster. Under load the worst wake-up is 5.3 µs
and no tick is ever missed. Every `d1_cli` command gives the same result under the RTOS (DMA 1 MiB at
345 MB/s, 0 mismatches).

Idle in `wfi` retires **225 thousand** instructions a second instead of 444 million. After 90 s idle
the die read **19.2 C** with `wfi` against **21.6 C** spinning (18.6 C at 24 MHz with the PLL, VE and
DSP off). Trends, not steady states.

## What I'd do next

Measure current for real: temperature is a poor proxy, and I need a USB-C meter between supply and
board. Then external-interrupt latency (a GPIO edge through the PLIC), which needs a source whose edge
time I know, and a way to boot this 84 KB image from NAND.

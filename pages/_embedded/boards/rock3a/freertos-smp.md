---
layout: default
title: "FreeRTOS on all four Cortex-A55 cores, with my own shell"
short_description: "rtos_cli from Maskrom: GICv3 at Secure EL1, cpufreq up to 1992 MHz, CoreMark, then an AArch64 SMP port"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_smp_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-18: SMP heartbeat and four-core CoreMark"
index: 11
publish: true
permalink: /embedded/boards/rock3a/freertos-smp
board_parent: rock3a
result: "CoreMark 7634.83 at 1992 MHz on one core, 15.33/MHz on four, tick jitter ±0.5 µs"
tags: [rockchip, arm, freertos, bare-metal]
---

# FreeRTOS on all four Cortex-A55 cores, with my own shell

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![ROCK 3A cover, "FreeRTOS on four A55s": 7634.83 iter/s, CoreMark at 1992 MHz]({{ '/assets/images/boards/rock3a/r3a_smp_cover.jpg' | relative_url }})
*The whole story in one picture: CoreMark 7634.83 on one A55 at 1992 MHz, 15.33 per MHz on all four, and a tick that stays within ±0.5 µs.*

![rtos_cli boot banner on the UART]({{ '/assets/images/boards/rock3a/rtos_cli_banner.png' | relative_url }})

## Situation

Once `dram_hello` ran from Maskrom (see the [bare metal page]({{ '/embedded/boards/rock3a/maskrom-bare-metal' | relative_url }})),
the next step was obvious: put a real scheduler there. I had already done a FreeRTOS shell on the
NanoPi 2 Fire (Cortex-A9, GICv2), so I knew roughly what I was in for. The RK3568 is different in
the annoying ways: AArch64, a GIC-600 driven through system registers, and the BootROM leaves you
at EL3.

## Task

FreeRTOS V11.2.0 on core 0, loaded as the 472 behind the DDR blob, with a shell on UART2 whose
commands read the chip for real (clocks, temperature, PMIC, GPIO, I2C, SPI NOR, watchdog). Run the CPU
at its top OPP and measure it with CoreMark. Then one kernel on all four cores, which the upstream
AArch64 port doesn't support.

![The smp command on my shell]({{ '/assets/images/boards/rock3a/smp_cores.png' | relative_url }})

What I was after, as my shell shows it: `smp on` puts all four A55s at 100 % (359 M steps/s each at 1799 MHz), `smp off` sends cores 1 to 3 back to WFE. The prompt is my own ("cậu bé ham vọc" means roughly "the kid who pokes at things").

## Action

First, EL3 down to Secure EL1. My `start.S` sets up what the missing firmware would have: the watchdog,
the STIMER, `CNTFRQ`, the GIC distributor, then `eret`s into Secure EL1. That means every interrupt is
Group 1 Secure. The tick is the EL1 physical timer, PPI 30, at priority `0xF0`.

For cpufreq, Linux's DTS lists 1992 MHz at the same 1.15 V as 1800, but mainline's clock driver has no
divider row for 1992 and refuses it. I wrote the switch myself in the usual order: raise `vdd_cpu` on
the TCS4525 first, park the core on GPLL, relock the APLL, set the bus dividers, move back. 1992 needs
`force`, because nothing upstream validates it.

```
rock3a> cpufreq 1992 force
  vdd_cpu 1150000 -> 1150000 uV; APLL locked; CPU 1799 -> 1991 MHz measured (1992 configured)
  1024 MiB at 0x10000000: 0 errors in 554 ms   (3 times)
  10000 round trips in 10929 us: 546 ns per switch (2 switches per trip)
  64 MiB at 0x10000000: write 5295 MB/s, read 3057 MB/s, copy 2464 MB/s, errors 0
```

CoreMark went in as a shell command, with the TSADC temperature printed next to each score.

![cpufreq and ps on the UART]({{ '/assets/images/boards/rock3a/smp_cpufreq_ps.png' | relative_url }})

`cpufreq` prints the OPP table (copied from Linux's `rk3568.dtsi`) next to `vdd_cpu` on the TCS4525: 1799 MHz measured at 1.150 V, and 1992 only with `force` because Linux's divider table doesn't have it. Under it, `ps`: the shell, idle at 95.2 % and the timer task.

It ran at six clocks from 407 to 1991 MHz; the CRCs matched every time (`crcfinal 0x33ff`).

SMP was the real work. FreeRTOS has had SMP since V11.0, but each port has to provide it, and
the AArch64 port doesn't (I checked V11.3.2 too). The only AArch64 SMP port upstream is
for the Cortex-R82, so I made `ARM_AARCH64_SRE` per-core after that one: core ID from `MPIDR_EL1.Aff1`
(the R82 port uses Aff0, which is 0 on every A55, so that bit me first), ticket spinlocks, SGI 0 to make
another core reschedule, and per-core state arrays.

The first SMP build bit back straight away. Every idle core took about 1000 SGIs per second: the
time-slicing check counts running tasks as waiting, so four idle tasks kept swapping with each other
every tick. I patched it locally to count only tasks that are ready and not running, and idle cores 1
and 2 went to 0 SGIs at rest.

Then idle time read 58.34 of 4 cores. The run-time counters only update on a switch-out, which barely
happened anymore, so the idle hooks now measure their own time. And a wedged core went unnoticed,
because only core 0's tick kicks the watchdog. Core 0 now sends a heartbeat SGI 1 every second; a core
that misses 10 in a row stops the kicks and the chip resets.

```
rock3a> smp hang 3
   10.75  *** core 3 answered no heartbeat SGI for 10 s: the watchdog is left to reset the chip
new Maskrom device 038: after 20.999683402 s
    0.68  [  OK  ] watchdog armed, ~11 s · last reset: watchdog (CRU_GLB_RST_ST 0x10, GLB_RST_CON 0x103)
```

## Result

| | Measured |
|---|---|
| Tick period jitter (1000 ticks) | 999 541 to 1 000 416 ns, so ±0.5 µs |
| Context switch, one core | 2 682 ns at 400 MHz, 604 ns at 1800, 546 ns at 1992 |
| CoreMark, one core, 1991 MHz, -O2 | **7634.83** iter/s, 3.834 /MHz, chip at 40.6 °C |
| CoreMark, one core, 1799 MHz, -O3 | 7489.63 iter/s, 4.163 /MHz |
| CoreMark, four cores, 1799 MHz | 27583.44 iter/s, **15.33 /MHz** (3.833 each) |
| SMP lock test | 12 million lock entries from four cores, no lost update |
| Wedged core to Maskrom | 21.0 s (10 s heartbeat + ~11 s watchdog) |

CoreMark per MHz stays at 3.83 from 400 to 2000 MHz, which is what you'd hope from a small in-order
core with the work in L1.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_freertos_smp_169_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/rock3a/r3a_freertos_smp_169.mp4' | relative_url }}" type="video/mp4"></video>

*The whole story in 89 s: the first line on the UART, the hang I fixed, the clock steps and CoreMark on four cores, 27583 = 3.98× one core at 1799 MHz (the one-core bar in the film, 6926, comes from a different build than the 7489 in the table). Vietnamese on-screen text, background music, no voice-over.*

## What I'd do next

A switch costs ~2.5 µs in the SMP kernel against 605 ns single-core. About 1.7 µs of that is the lock
traffic (~20 lock takes per round trip). Why an ARMv8.1 `LDADDAL` costs ~170 ns on this A55, when an
exclusive pair costs 26 ns, I still don't know. I moved the ticket lock to the exclusive pair and left
the question open.

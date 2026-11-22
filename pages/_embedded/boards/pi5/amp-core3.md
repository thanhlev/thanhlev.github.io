---
layout: default
title: "Lending core 3 of a running Linux to FreeRTOS (QEMU so far)"
short_description: "A kernel module that unplugs one A76, starts FreeRTOS on it with PSCI, and gives it back, with no reboot"
status: "In Progress"
picture: "assets/images/boards/pi5/pi5_amp_arch.png"
latest_release: "2026-10-30: selftest passes on QEMU, board run pending"
index: 20
publish: true
permalink: /embedded/boards/pi5/amp-core3
board_parent: pi5
result: "QEMU: 13/13 selftest checks pass, start 54.8 ms, stop 28.3 ms; not run on the board yet"
---

# Lending core 3 of a running Linux to FreeRTOS (QEMU so far)

[Back to the Pi 5 hub]({{ '/embedded/boards/pi5/' | relative_url }}) · QEMU runs 2026-10-30, board run not done

![Who runs where: cores 0-2 Linux, core 3 FreeRTOS]({{ '/assets/images/boards/pi5/pi5_amp_arch.png' | relative_url }})

## Situation

Linux is good at almost everything except promising a deadline. The usual trick is AMP: give one core
to a small RTOS that only does the timed work, keep Linux on the rest. I'd done that on my ROCK 3A
(RK3568) and measured 2.3 to 7.8 us wake-up latency for a 1 kHz task there. The Pi 5 has four A76
cores, so it's the obvious next board.

But the usual way of doing AMP means changing the boot setup: reserved memory in the device tree,
`maxcpus=`, a reboot. My Pi 5 is running Linux for another project. I wasn't going to touch its boot.

## Task

Do AMP with no boot changes at all: take core 3 away from a Linux that's already running, start
FreeRTOS on it, talk to it, give the core back. Everything from a loadable module, so `rmmod` leaves
the system as it was.

## Action

**Design.** `amp_ctl.ko` calls `remove_cpu(3)`, allocates a 4 MiB block with `alloc_pages` (no
reserved memory needed), copies the RTOS image in, and starts core 3 there with PSCI `CPU_ON`. Linux
and the RTOS talk through rings in that shared block. To stop, the RTOS calls `CPU_OFF` on itself and
the module calls `add_cpu(3)`. About half the code comes from my ROCK 3A AMP. FreeRTOS V11.2.0 uses
its GICv2 AArch64 port; core 3 sets up its own MMU and only touches its own banked GIC registers.

<a href="{{ '/assets/images/boards/pi5/pi5_amp_seq.png' | relative_url }}"><img src="{{ '/assets/images/boards/pi5/pi5_amp_seq.png' | relative_url }}" alt="Sequence: load, start, ping, stop" style="width:100%;max-width:760px"></a>
*One full cycle as a sequence: `ampctl` LOAD and START, `remove_cpu(3)`, PSCI `CPU_ON` at the block's physical address, the RTOS turning on its MMU, pings over the rings, then `CPU_OFF` on itself and `add_cpu(3)`.*

**The Pi was offline.** On 2026-10-30 I couldn't reach the board at all (100 % ping loss), and I had
decided nothing gets written to it yet anyway. So: build on the PC against the Pi kernel at a pinned
commit (6.18.59), and test the whole cycle on QEMU's `virt` machine with GICv2 and four A76s.

**Bugs on the way.**
- The first link failed: FreeRTOS's port keeps a 32-bit absolute `.word`, so the link address has to
  be under 4 GiB. Moved the RTOS virtual address from `0x40_0000_0000` to `0x8000_0000`.
- A checker script walks every instruction that runs before the MMU is on: 274 of them, no absolute
  address except the jump to the virtual address. Page tables are walked in software for four layouts
  (Pi 5 x2, QEMU, VA = PA).
- First QEMU run: all PASS, and still two real bugs in the log. The second `START` reused the first
  run's `.data` (it came up still saying "rt 2000 us" from run one), so the image is now copied fresh
  every time. And the first two log lines used a 54 MHz fallback, so time ran backwards (3.543 s, then
  3.086 s); `CNTFRQ` is now read first thing.

## Result

The selftest on QEMU, verdict lines only:

```
[PASS] load: header + CRC accepted
[ 3.013302] amp: '20261030-2354' RUNNING on cpu3 (MPIDR 0x80000003) 6880 us after CPU_ON, entered at EL2, runs at EL1
start: ok, 54.8 ms (remove_cpu + CPU_ON + boot)
[PASS] while running: the core is offline in Linux
[PASS] mailbox: 5 pings answered
[PASS] tick: ~1000 IRQs/s on core 3
[PASS] period 1500 us refused (-22)
stop: ok, 28.3 ms (CPU_OFF + add_cpu)
[PASS] after: the core is Linux's again
SELFTEST PASS
rmmod amp_ctl: ok
QEMU AMP TEST PASS
```

- **13/13** checks pass on QEMU. A separate fault test works too: a data abort on core 3 ends in
  `CPU_OFF` and the core goes back to Linux.
- Start **54.8 ms**, stop **28.3 ms**; `CPU_ON` to RUNNING 1.2 to 6.9 ms under TCG.
- RTOS image **32 392 bytes**, using 1188 KiB of the 3 MiB it's allowed.
- Latency on QEMU means nothing: three runs gave a worst wake-up of 1.7, 8.0 and 13.7 ms, because
  each vCPU is just a thread on my busy PC. **The number this demo exists for is not measured yet.**

![The 4 MiB block by offset]({{ '/assets/images/boards/pi5/pi5_amp_block.png' | relative_url }})
*The 4 MiB block by offset, to scale: image header, code, the 1 MiB FreeRTOS heap in `.bss`, page tables, stacks, and the shared window for the rings at the top.*

## What I'd do next

Run it on the Pi 5 the day I'm allowed to write to it: copy only our sources over, fetch FreeRTOS there,
build the module against the Pi's own headers (it runs 6.18.50, I built against 6.18.59), then
`insmod`, `ampctl selftest`, `rmmod`. Things QEMU can't prove: whether the firmware puts the timer PPI
in a group core 3 can use, and the cache maintenance (QEMU models no caches, so a missing clean would
still pass). Then the real wake-up latency, next to the ROCK 3A's 2.3 to 7.8 us.

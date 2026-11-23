---
layout: default
title: "First contact: what the stock Nezha really runs, and which vector it really has"
short_description: "Checking the vendor docs against the board over UART and OTG: RVV 0.7.1 not 1.0, ADB as root, FEL with no button"
status: "Done"
picture: "assets/images/boards/d1-nezha/d1_first_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-09-27: UART + OTG measurements"
index: 10
publish: true
permalink: /embedded/boards/d1-nezha/first-contact
board_parent: d1-nezha
result: "vl=4 at e32 -> VLEN 128, vsetivli SIGILL (RVV 0.7.1); FEL via reboot efex, no button"
tags: [allwinner, risc-v, bare-metal]
---

# First contact: what the stock Nezha really runs, and which vector it really has

[Back to the D1 Nezha hub]({{ '/embedded/boards/d1-nezha/' | relative_url }}) · measured 2026-09-27

![The result first]({{ '/assets/images/boards/d1-nezha/d1_first_cover.jpg' | relative_url }})
*The result first: VLEN 128 and a SIGILL on vsetivli, so the vector unit is RVV 0.7.1, not 1.0. Chip photo: [Popolon](https://commons.wikimedia.org/wiki/File:AllWinner_D1.jpg), CC BY-SA 4.0.*

![The first 1 MiB of the SPI-NAND: boot0 copies per 128 KiB block]({{ '/assets/images/boards/d1-nezha/d1_nand_layout.png' | relative_url }})

## Situation

The D1 docs say "C906 RISC-V 1GHz" and "supports RVV". The ncnn page of the same docs says release
builds "will cause illegal instruction errors". Those two sentences don't sit well together. Before
writing any code for this board I wanted to know what it actually runs and what its vector unit
actually is. The board had the stock Tina firmware in NAND, an FTDI TTL-232R-3V3 on the debug UART,
and later a USB-C cable on the OTG port.

## Task

Measure, on the board, everything I'd otherwise take from the docs: clocks, RAM, flash, the boot chain,
the ISA. Then find a way into FEL (the boot ROM's USB mode) that doesn't need someone to press a button.

![reboot efex path into FEL]({{ '/assets/images/boards/d1-nezha/d1_fel_path.png' | relative_url }})
*Where this ended up: `reboot efex` from an adb shell, U-Boot waits about 3 s, gives up, boot0 sees the flag and the ROM comes up in FEL as `1f3a:efe8`. No hand on the board.*

## Action

**UART.** The boot log answered half the list by itself:

```
 [45]HELLO! BOOT0 is starting!
[00.288]DRAM: 1 GiB
[00.298]CPU=1008 MHz,PLL6=600 Mhz,AHB=200 Mhz, APB1=100Mhz MBus=300Mhz
```

Then OpenSBI v0.6, U-Boot 2018.05, "DSP0 start ok" (U-Boot starts the HiFi4 before the kernel), and a
5.4.61 kernel built in April 2021 with the C-SKY toolchain. `cpufreq` has exactly one level, 1008000.
So "1 GHz" means 1008 MHz, and Tina never clocks down. `/proc/cpuinfo` says `isa : rv64imafdcvu`. That
`v` is the trap.

**The vector probe.** I couldn't install a cross GCC (no sudo on that PC), but zig worked. I wrote a
small static binary that runs one instruction at a time as raw machine code (encodings computed by
hand) and catches `SIGILL` with `sigsetjmp`:

```
vsetivli t0,4,e32,m1 (RVV1.0 only) SIGILL
csrr vlenb (CSR 0xC22, RVV1.0) OK result=16
```

and a second probe with no signals at all:

```
A same-block: vsetvli->4 vl=4 vtype=8
B after printf: vl=4 vtype=8
C after usleep(syscall+sched): vl=4 vtype=8
```

In RVV 0.7.1, `vtype = 0x08` means e32/m1, so `vl = 4` gives VLEN = 4 x 32 = 128 bits. In RVV 1.0 the
same encoding would be e16 and give `vl = 8`. And `vsetivli` only exists in 1.0. So it's T-Head's 0.7.1
(mainline calls it `xtheadvector` from Linux 6.14 on), not binary compatible with RVV 1.0. Anything
built with `-march=rv64gcv` will die with illegal instruction here. That explains the ncnn page.

![vtype 0x08 read as RVV 0.7.1 and as RVV 1.0]({{ '/assets/images/boards/d1-nezha/d1_rvv_vtype.png' | relative_url }})
*The two readings of the same answer. Only 0.7.1 gives `vl = 4` for e32 at VLEN 128, and only 0.7.1 has no `vsetivli`.*

One odd thing I caught: in the first run, after the `SIGILL` handler returned, `vl` read 128 and
`vtype` 3, not what I'd set. Without signals (the second probe) the registers held across `printf`,
`usleep` and rescheduling. My reading: this vendor kernel's signal path doesn't preserve vector state.
I haven't read its signal code, so that's a guess. Vector code here should redo `vsetvli` after any
signal.

**OTG.** The stock firmware shows up as `18d1:d002` "Tina ADB", and `adb shell` drops straight into
root, no password. A 16 MiB file: push 4.5 MB/s, pull 5.1 MB/s, md5 matching both ways, on a link that
negotiated 480M. Probably the single core or adbd, not USB.

**FEL without the button.** `reboot efex` writes a flag; after the reset U-Boot waits about 3 s for
PhoenixSuit, gives up, resets, and boot0 sees the flag and jumps into the boot ROM's FEL:

```
Bus 003 Device 018: ID 1f3a:efe8 Allwinner Technology sunxi SoC OTG connector in FEL/flashing mode
$ xfel version
AWUSBFEX ID=0x00185900(D1/F133) dflag=0x44 dlength=0x08 scratchpad=0x00045000
```

From there, read-only: `xfel spinand` finds the MX35LF2GE4AD (268435456 bytes, the chip the kernel had
named), and the first word of NAND is `0x3c80006f` (a `jal` over the header) followed by `eGON.BT0`,
length 64 KB, checksum `0x31a49730`. I recomputed the checksum with the sunxi rule (sum of all 32-bit
words, checksum field replaced by `0x5F0A6C39`) and got exactly `0x31a49730`. `xfel reset` brings Tina
back.

**A backup trap.** `dd if=/dev/mtd0` on Tina returns every 2 KB physical page twice, because the sunxi
NAND driver uses 4 KB logical pages. Writing that image back would be wrong. Take the first half of
each 4 KB block, or read with `xfel spinand read`; both give the same bytes and the checksum matches.

## Result

All from the board, not the docs: the CPU runs at **1008 MHz** with a single level, **1 GiB** of DDR3
(PLL at 1584 MHz), 256 MB of SPI-NAND. The vector unit has **VLEN 128**, `vl = 4` at e32/m1, and
`vsetivli` raises **SIGILL**, so it's **RVV 0.7.1**, not 1.0.

ADB gives root, **4.5 / 5.1 MB/s** push/pull over a 480M link. **FEL is reachable from software**
(`reboot efex`), the stock boot0 header checks out byte for byte, and reading the NAND's first 4 KB
over FEL runs at **125 KB/s**. Slow, but it's the ROM.

## What I'd do next

That became the whole plan, really: with FEL reachable from a shell command, I could write my own
boot0 and try it without a hand on the board
([next story]({{ '/embedded/boards/d1-nezha/own-boot0' | relative_url }})). Still unmeasured from that
first day: current draw from the OTG port.

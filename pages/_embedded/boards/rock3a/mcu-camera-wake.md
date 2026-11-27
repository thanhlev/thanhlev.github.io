---
layout: default
title: "The RISC-V MCU keeps watch: webcam to NPU with all four A55s off"
short_description: "The RK3568's own RV32 core drives the USB webcam, RGA2 and the NPU by itself, keeps DRAM in self-refresh between frames and powers an A55 back on only when it finds a face"
status: "In Progress"
picture: "assets/images/boards/rock3a/r3a_mcu_cam_cover.jpg"   # 2026-11-23 cover, story_cover.py r3a_mcu_cam_cover
latest_release: "2026-11-27: plain English pass"
index: 16
publish: true
permalink: /embedded/boards/rock3a/mcu-camera-wake
board_parent: rock3a
result: "DRAM in self-refresh 74.0 % of a 1 s camera cycle with all four A55s powered off; bell to core 0 in 16 µs; colour step 470 ms to 148 µs on RGA2; no power meter yet (chip 13.1 °C cooler)"
edge_ai: true
edge_ai_index: 11
tags: [rockchip, risc-v, edge-ai, npu, freertos, bare-metal]
description: "The RK3568's own RV32 core drives the USB webcam, RGA2 and the NPU by itself, keeps DRAM in self-refresh between frames and powers an A55 back on only when it finds a face"
date: 2026-11-23
last_modified_at: 2026-11-27
---

# The RISC-V MCU keeps watch: webcam to NPU with all four A55s off

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![The MCU keeps watch]({{ '/assets/images/boards/rock3a/r3a_mcu_cam_cover.jpg' | relative_url }})
*The four Cortex-A55 cores are off. The RV32 MCU kept DRAM in self-refresh (asleep, but keeping its data) 74.0 % of the time, and it still caught every face frame.*

![What the MCU drives while the A55s are off]({{ '/assets/images/boards/rock3a/mcu_soc_map.png' | relative_url }})
*The blocks that the MCU programs by itself (yellow markers), and the path of one webcam frame. Every frame still goes through DRAM. The trick is to keep DRAM awake for only a small part of each second.*

## Situation

Think of a camera that runs on a battery: a doorbell, or a robot that sits in a corner most of the
day. You want it to look all the time. But you don't want to run four Cortex-A55 cores and 8 GB of
LPDDR4X only to see, thirty times a second, that the room is still empty.

The RK3568 on my ROCK 3A has a part that fits this job, and almost nobody uses it. It's a fifth
processor: a small 32-bit RISC-V core next to the four A55s. It's a Syntacore SCR1. The TRM (the
chip's reference manual) never names it, but its CSR map and the register name `SCR1_BOOT_ADDR` show
it. It is RV32IMC, machine mode only, with no cache and no MMU. Its clock is `aclk_bus`. A mux in the
CRU (the clock unit), `CRU_CLKSEL_CON50[1:0]`, sets it to 200, 150 or 100 MHz from the GPLL, or to
the 24 MHz crystal. No document says which one the boot leaves, so my code counts `mcycle` against a
timer. Under my Debian boot it was the 100 MHz setting (100.006 MHz measured). Under Android it was
the 150 MHz one (148.5 MHz measured). Every number in this post is at 100 MHz. I never switched the
mux to 150 or 200 MHz for these runs.

I used this core once before: a WS2812 LED ring under Android
([A WS2812 ring from the RK3568's RISC-V MCU, with Android on all four A55s]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }})).
There it ran FreeRTOS at 148.5 MHz and talked to Android through the mailbox. This post builds on
that one, so I only repeat the parts of the MCU boot that matter here.

A funny thing: when I first listed the ways to split work on this chip, the MCU wasn't on the list.
I wrote "Linux plus an external MCU, not wired, not feasible" and forgot the one inside the SoC. The
datasheet lists it in §1.2.6, and the Linux clock driver has `aclk_mcu`. My mistake.

On the A55 side, this whole story uses my own FreeRTOS image from
[Webcam to NPU to HDMI, with no Linux on the chip]({{ '/embedded/boards/rock3a/rtos-face-detect' | relative_url }}).
I load it into RAM through Maskrom, the chip's USB recovery mode (how I do that without touching the
board is in [Bare metal from the BootROM]({{ '/embedded/boards/rock3a/maskrom-bare-metal' | relative_url }})).
This matters later. Several switches I needed are secure-world registers. My RTOS runs at Secure
EL1, so it can reach them. Linux can't.

## Task

I wanted to know one thing: whether the MCU, alone, can set up the USB webcam, get frames, run a face
detector on the NPU (the chip's neural network engine), and wake the CPU and DRAM only on a face.

I turned that into things I could measure:

- the MCU finds the webcam on USB and streams it with 0 bad frames, with no A55 code in the loop;
- the MCU runs the whole chain for each frame: a motion check, colour conversion, RetinaFace on the
  NPU, its own score of the NPU output, and a doorbell (a short signal) to the A55 only on a face;
- while nothing happens, all four A55 cores are powered off, not only in WFI (an idle state that
  waits for an interrupt). DRAM sits in self-refresh, and only the MCU is awake, running from
  on-chip SRAM;
- on a face, an A55 comes back by itself, decodes the result and goes off again;
- every claim about the hardware is checked against the TRM (Part 1 and Part 2), with the page.

I knew two limits from the start. Nobody could sit in front of the camera during most of the work.
Also, the webcam on my desk can see people, a child among them, so no camera picture leaves the
board. And I have no current meter on this bench, so I can only guess the power saved.

The TRM also showed me one limit early: the frames can't go "straight into the
NPU". The USB3 controller writes to memory over AXI, the chip's main bus (Part 2, p.1697). The NPU
reads from memory through its own AXI port (Part 2, p.410). So the webcam data always goes through
DRAM. The real goal is DRAM awake for one frame and asleep for the rest.

## Action

### 1. Where the MCU runs from: 64 KiB of SRAM, after a bit hunt

The SCR1 has no RAM of its own (TRM Part 1 8.1, p.516). Rockchip's U-Boot starts it from a program
in DRAM. That's fine while DRAM is awake. But code that runs while DRAM is in self-refresh needs
another place. The only one is `SYSTEM_SRAM`, 64 KiB at `0xFDCC0000`. TRM 5.3 even lists the MCU
among the masters that may use it.

It didn't work. I got a load access fault on the AHB port, and reads of 0 and lost writes on the
AXI port. First I blamed the TRM, but the error was mine. Its figure of the SRAM security scheme
(Fig. 5-2, p.470) names `SGRF_SOC_CON10/11` but gives no address. I looked at the wrong offsets,
found 0 and decided there was no secure region. So I dumped the whole SGRF (the secure-world settings
registers) as the BootROM leaves it. I found twelve words set at `SGRF + 0x240`. TF-A, the secure
firmware, clears nine and never touches the last three. Then I cleared bits one at a time while the
MCU read a word the A55 had written:

```
rock3a# mw fdd1826c ffff0000
rock3a# mcu peek fdcc8000
  MCU read 0xfdcc8000 = 0x12345678
rock3a# mw fdd1826c fff1fff1
rock3a# mcu peek fdcc8000
  MCU read 0xfdcc8000 = 0x00000000
```

Two bits mattered. The fix is one write that makes region 0 non-secure. After that, FreeRTOS
(28 138 bytes) ran from SRAM with 0 overruns in 4 × 60 s. The catch: that write needs the secure
world. Under Linux, TF-A leaves the bit set, and Linux can't write the SGRF. So everything below runs
under my RTOS.

### 2. The webcam and the NPU, driven by the MCU

I didn't write a new USB stack. My RTOS already has xHCI (USB host), hub and UVC (USB camera) code,
and it built for RV32IMC with no changes. The A55 first does 11 one-time secure register writes.
After that, the MCU found the hub and both cameras on the first try.

Streaming needed three fixes. First, my time stamps were nonsense because TIMER4 counts down (Part 1
p.605 says so; I read it later). Second, the YUYV stream gave 2 good frames and 31 bad in 5 s. The
cause was where the code sat. The SCR1 fetches every instruction over the bus. With its code in SRAM,
the same DRAM loop took 0.09 µs per word. With its code in DRAM, it took up to 1.8 µs. Third, this
camera sets EOF (end of frame) before it changes the frame ID, so an empty bad frame came after every
good one. After the fixes: 52 good, 0 bad at 15 fps, and 92 good, 0 bad at 30 fps. One number for
later: the first good frame arrives 1.45 to 1.64 s after the stream starts, because the sensor is
slow to start.

The NPU part was small. The NPU runs lists of register commands from DRAM. The A55 powers it and
copies the model once. After that, the MCU only writes a few registers and checks in a loop for the
end. The 88-task RetinaFace job ran in 2.48 ms from the MCU, and its output bytes were the same as
under Linux. "Face or not" is an integer test on the raw int8 outputs.

The first full run gave the real surprise. The NPU took 2.5 ms. But turning one 320 × 240 YUYV
frame into the network's BGR input took 689 ms on the MCU. The MCU runs only a few million
instructions per second, so a loop over every pixel is far too slow.

### 3. RGA2 does the colour step, and a test face

RGA2 is Rockchip's 2D graphics engine. It converts YUV422 to RGB888 and can turn the picture 180°
(my camera hangs upside down). My first register read on it froze core 0, and the watchdog reset the
chip into Maskrom. The cause: the RGA power domain is off after a Maskrom boot, and a read from a
block with no power never finishes. Since then I check the power state before I touch a block.

With power on, RGA2 took 148 µs plus 21 µs of register writes, against 469.9 ms in software. I
compared its output with my software conversion. That showed two things the TRM doesn't say. Sizes
are stored minus 1. And a turned picture is written backwards, so the base address must point at the
last pixel. 177 791 of 230 400 bytes match exactly; the rest are off by one. On a face, the MCU rings
the A55 through the mailbox. With core 0 in WFI, the bell reached it in 3 µs.

Nobody sat at the desk during most of the work, and I don't use frames of real people. So for tests
the camera keeps streaming, and the MCU swaps the next frame for a public-domain NASA portrait in the
camera's own format. I put the test face and the empty room on alternate frames. 34 bells came for
exactly the 34 test-face frames and 0 for the 33 room frames. The A55's float decoder agreed every
time. The real person came later (see Result).

### 4. DRAM self-refresh: the request that did nothing

![The self-refresh source field]({{ '/assets/images/boards/rock3a/mcu_sref_mux.png' | relative_url }})
*The 2-bit field that led me to a wrong answer. At its reset value, the DDR controller listens to a GRF bit, not to the PMU.*

The PMU (the power management unit) has a software request for DRAM self-refresh,
`sw_ddr_sref_req` (Part 1 p.492). It touches no PLL, so the MCU keeps its clock. I set it from the
MCU, running from SRAM. The bit read back 1, but DRAM never went to sleep. I found a sentence in the
PMU chapter about settings being "delayed to execute after FSM running in particular phase", and
wrote down a wrong explanation from it.

The real reason was one chapter earlier. `DDR_GRF_CON3` bits [6:5] (p.219) choose who drives the
controller's low-power request. The reset value picks a GRF bit, not the PMU. So nobody listened to
my request. TF-A's suspend code switches it to the PMU first, and now my code does too. With that,
self-refresh started in 13 µs and ended in 6 µs. In a 5 s sleep I read the controller's state
register 6 941 418 times, and it said "in self-refresh" every time.

![One camera cycle]({{ '/assets/images/boards/rock3a/mcu_duty_cycle.png' | relative_url }})
*One 1 s cycle at 15 fps. DRAM is awake only around one frame, then it goes to self-refresh. Most of the awake time is waiting for the camera's next whole frame.*

The stream itself can't move to SRAM: my xHCI code needs about 1091 KiB of buffers and rings. So
DRAM sleeps between frames instead. My first loop closed the stream after each frame and opened it
again. Then every cycle took 1643 ms to its first whole frame, so 0.0 % of a 500 ms period was left
for sleep. Pausing the endpoint (the xHCI's Stop Endpoint command) works better. The camera keeps
streaming, but all DMA stops. After resume, the next whole frame arrives in 173 to 187 ms at 15 fps.
With 1 s cycles, DRAM was in self-refresh 73.9 % of the time. With 2 s cycles, it was 86.8 %.

### 5. All four A55s off, and the MCU keeps the console

![Sleep and wake, measured]({{ '/assets/images/boards/rock3a/mcu_power_states.png' | relative_url }})
*Who powers what off and on, with the times measured on the board. In sleep, `PMU_CLUSTER_PWR_ST` reads `0x0000f08f`: bits 3..0 are all set, so all four cores are down.*

WFI isn't off: a core in WFI keeps its power and its caches. TF-A's suspend code sets
`CORE_PWRDN_EN` on the last core, so its next WFI asks for the power to go off. A core that loses
power starts again from its reset vector. So I pointed that vector to a 60-byte stub in SYSTEM_SRAM
that jumps back into my C code. My first try that got this far turned core 0 off, and nothing brought
it back. The PMU's FSM (its state machine) waits until "all CPUs in WFI status" (p.477). Core 3 ran
my real-time loop and never executed one WFI. Once core 3 sat in a WFI loop, it worked. The PMU had
core 0 off and DRAM in self-refresh within 63 µs. It was back in 23 µs, and C code ran again 4 µs
after the reset address.

At that point I filmed a demo and called it done. It wasn't. Only core 0 was really off, and my own
plan said all four. Core 3 was the hard one. When it leaves the real-time loop, it lands at
Non-secure EL2, where the power-down write is blocked. So it calls the secure world with an `smc #0`
and powers down from a short piece of EL3 code in free PMU SRAM. In the camera loop the MCU no longer
needs the FSM. It holds DRAM asleep with the plain request, and it powers core 0 on itself when it
rings the bell.

```
rock3a# mcu cam duty 20 1000 fake2 rga off
  mcu| [  OK  ] MCU duty 20 cycles of 1000 ms: DRAM in self-refresh 14736 of 19895 ms (74.0 %), 18 holds ok; frames 20 (none 0), 10 bells, 10 acks (0 time-outs)
  mcu|   A55 cores at the hold starts (CLUSTER_PWR_ST [3:0], 1 = off): AND 0xf, OR 0xf, all four off in 18 of 18 holds; core 0 powered on by the MCU 10 times
```

All four were off at 18 of 18 hold starts. A bell brought core 0 to its reset address in 16 µs.
With only the empty room, no bell came at all, and the A55s slept through the whole run.

With four cores off, nothing answered on the serial console. So the MCU got its own small shell. UART2 has one owner at a time, kept in a word in SYSTEM_SRAM. While DRAM sleeps, the MCU checks
the UART in a loop, and a key press ends the hold (answers came 90 and 98 ms later). There was one
bug: a second writer. My warm-boot step characters printed "M123" before every echo. Over 101
cycles: DRAM in self-refresh 80.3 %, all four cores off at 102 of 102 hold starts, 81 bells, 0 RX
overruns.

## Result

The MCU, alone, runs the whole chain. It streams the webcam with 0 bad frames, converts each frame
on RGA2, runs RetinaFace on the NPU, scores the result, and rings an A55 only on a face. Between
faces, all four A55 cores were powered off (`PMU_CLUSTER_PWR_ST` `0x0000f08f`). DRAM was in
self-refresh **74.0 %** of a 1 s cycle at 15 fps, and 86.8 % with a frame every 2 s. A bell brings
core 0 to its reset address in 16 µs.

| What | Before | After |
|---|---|---|
| YUYV → BGR, one 320 × 240 frame | 469.9 ms on the MCU | 148 µs on RGA2 (+ 21 µs of register writes) |
| MCU's YUYV stream, 15 fps, 5 s | 2 good, 31 bad | 52 good, 0 bad (92 / 0 at 30 fps) |
| DRAM self-refresh request | ignored (GRF selected) | in 13 µs, out 6 µs (PMU selected) |
| Bell to the A55 | 89 to 957 µs (1 ms polling) | 3 µs (WFI), 16 µs (core powered off) |
| Camera frame per cycle | 1643 ms (close / reopen) | 173 to 187 ms (pause / resume) |
| A55 cores off while waiting | 0, then core 0 only | all four, 18 of 18 hold starts |

The first real person came by accident. In the temperature run below, I used only camera frames and
no test face. 189 of 359 frames had motion, and the MCU rang 186 bells. The A55's own decoder found a
face every time. No frame was kept or looked at, so the board couldn't tell me who it was. It was me,
sitting at the desk. So that was the first test of the chain with a real person: woken 186 times out
of 189 motion frames, all four cores off at 359 of 359 hold starts, DRAM asleep 57.6 % of the cycles.

Now the part I can't claim. I have no current meter on this bench, so I have no watts. The closest
thing I have is temperature. The MCU reads the chip's TSADC (its temperature sensor) once a cycle.
The A55 starts it at boot, and the MCU only reads the data registers:

```
mcu❯ temp
  now      CPU 37.7 °C, GPU 37.2 °C (TSADC DATA0 0x840, DATA1 0x83c)
  per 60 samples (= per minute at a 1 s period; CPU / GPU avg, °C): 0:41.1/40.9 1:38.5/38.4 2:38.2/38.1 3:37.8/37.6 4:37.6/37.5 5:37.5/37.3
```

For six minutes, the A55 shell was idle with four cores on in WFI: the CPU sensor read 50.6 °C. For
six minutes with all four off and the MCU on the console: 37.5 °C. That's 13.1 °C lower, and it was
still falling 0.1 to 0.2 °C a minute. Three minutes after `wake`, it was back at 50.0 °C. The PMIC
rails read the same before and after (vdd_logic and vdd_gpu at 0.900 V), so nothing in the run
lowered a voltage. But a temperature isn't a power. Without the board's thermal resistance, I can't
turn 13.1 °C into milliwatts. I didn't measure the power saved.

What's still missing:

- A stream with no DRAM at all is only designed, not built. From the real build and stream, the
  xHCI's structures plus 16 isochronous descriptors fit in 29.0 KiB of the 47.5 KiB of
  free SRAM. But the hot code (the code that runs all the time) is tight: 960 bytes of it against
  2520 bytes left. And a whole 153 600-byte frame never fits. So without DRAM, only the motion check
  could run. RGA2 and the NPU read DRAM, so DRAM would wake on motion anyway. It's a budget table,
  nothing more.
- The cluster's DSU (the shared L3 cache and its power) stays on. Turning it off is the deeper part
  of TF-A's suspend. I haven't tried it.
- All of this runs under my RTOS at Secure EL1. Under Linux the SRAM stays secure and the SGRF can't
  be written, so Linux would need a TF-A change first.
- The A55 still does the one-time setup before it hands over: NPU power and model, the RGA power
  domain, the secure USB writes, and opening the SRAM.
- Starting the MCU before the DDR blob (the DRAM start-up code) is parked is still open. I have
  three suspects.
- The per-cycle averages are wrong in runs longer than about 179 s, because a TIMER4 difference wraps
  around. The uptime and DRAM share use another counter, so they are right.

## What I'd do next

A current meter on the 12 V input comes first. Without it, every "saving" above is a guess from a
thermometer. I'd measure the same three phases (A55 idle, all off, after wake). Then I'd do one run
with DRAM asleep for the whole cycle, to separate what DRAM costs from what the cores cost.

Then the DRAM-free motion check. I'd lay out the xHCI's memory so it can live in SRAM, and link the
stream's hot path into the SRAM section. And I'd sum the 40 × 30 thumbnail packet by packet instead
of keeping a frame. If that works, DRAM would only wake when something moves, and the 173 to 187 ms
wait per cycle goes away.

And a longer test with real people, now that I know the chain notices me. The privacy rule stays:
the board reports numbers and boxes, never pictures.

---
layout: default
title: "Twelve QPUs from bare metal, no Linux"
short_description: "Queueing my own programs on the VideoCore IV shader cores from FreeRTOS, and checking every lane against the ARM"
status: "Done"
picture: "assets/images/boards/pi-zero/pz_qpu_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-20: qpu command in rtos_cli"
index: 30
publish: true
permalink: /embedded/boards/pi-zero/qpu
board_parent: pi-zero
result: "4799 MFLOPS on 12 QPUs vs 73 on the ARM with VFP (66x); 192 lanes bit-exact"
tags: [raspberry-pi, arm, gpu, freertos, bare-metal]
---

# Twelve QPUs from bare metal, no Linux

[Back to the Pi Zero W hub]({{ '/embedded/boards/pi-zero/' | relative_url }}) · measured 2026-10-20

![The QPU story in one picture]({{ '/assets/images/boards/pi-zero/pz_qpu_cover.jpg' | relative_url }})
*The whole story in one picture: 4799 MFLOPS on the 12 QPUs, 66 times the ARM with its VFP, every one of the 192 lanes bit-exact.*

## Situation

The Zero W has one ARM core. That's it for the CPU. But the GPU next to it has 12 QPUs (3 slices of 4),
each a 16-lane SIMD shader core. Linux uses them for 3D through the vc4 driver. My
[FreeRTOS shell]({{ '/embedded/boards/pi-zero/rtos-usb-shell' | relative_url }}) already ran on the
ARM, so I asked myself: could my own code run on the QPUs, from bare metal, and how much faster would
it be than the ARM1176?

<a href="{{ '/assets/images/boards/pi-zero/pz_qpu_ep3.jpg' | relative_url }}"><img src="{{ '/assets/images/boards/pi-zero/pz_qpu_ep3.jpg' | relative_url }}" alt="Frame from my Pi Zero video, episode 3" style="width:100%;max-width:432px"></a>
*A frame from episode 3 of my Pi Zero videos: one ARM core, then three slices of 4 QPUs next to it, and 192 results (12 x 16 lanes) landing in RAM. (Vietnamese labels.)*

## Task

Add a `qpu` command to `rtos_cli`: run the same floating-point work on the QPUs and on the CPU, check
the results lane by lane, and print the times. No Linux anywhere.

## Action

**The program.** I wrote it with the assembler from py-videocore (only the assembler, which runs on
the PC with numpy). A script turns it into a C header that's committed, so building the firmware needs
no Python. Each lane starts at `x = 16 t + lane`, then loops `x = x * 0.999 + 0.001`. The loop body is
five instructions: `isub`, the branch, and its three delay slots holding `fmul`, `fadd` and a `nop`.
At the end each QPU takes the mutex, writes its vector into its VPM row and DMAs it to RAM.

**First try: the firmware's way.** The mailbox has a tag for "execute QPU code" (`0x30011`). On my board
with firmware 1.20241126, it never answered, not even for a program that does nothing but exit, and
the next mailbox call failed after it:

```
pz> qpu exit
 QPUs on, GPU memory at bus 5EBF8000
 QPU execute failed: mailbox -2, answer 00000001, after 2000002 us
```

**Second try: queue them myself.** The mailbox now only switches the QPUs on (`0x30012`) and gives me
4 KB of GPU memory (`0x3000c`, `0x3000d`). The ARM copies the 24-instruction program and the uniforms
in (no MMU, so the physical address is the ARM's), then writes each thread's uniforms address to
`SRQUA` and code address to `SRQPC`, the way the Linux vc4 driver does it. Then it waits for `SRQCS`
to count 12 programs done.

## Result

![MFLOPS measured on my board]({{ '/assets/images/boards/pi-zero/pz_qpu_mflops.png' | relative_url }})
*MFLOPS from the `qpu` command on my board: 4799 on 12 QPUs, 399 on one, 73 on the ARM with VFP, 12 in soft float.*

```
pz> qpu
 QPUs on, V3D 02443356, GPU memory at bus 5EBF8000
 CPU rounding to nearest 107231 ppb
 CPU rounding toward zero 0 ppb
 12 QPU 1000000 x 80007 us 4799 MFLOPS
 1 QPU 1000000 x 80003 us 399 MFLOPS
 CPU vfp 10000 x 4365 us 73 MFLOPS
 CPU soft 10000 x 25636 us 12 MFLOPS
```

That's **4799 MFLOPS** on 12 QPUs, against **73** on the ARM1176 with its VFP and **12** in the soft
float `rtos_cli` is built with: **66x** and **400x**. The arithmetic checks out too. 5 instructions x
4 cycles x 1 000 000 passes at 250 MHz is 80 ms, and one QPU took 80 003 us. Twelve took the same
time, so they really ran in parallel.

At first the results looked wrong (107231 ppb off). It's rounding: the QPU rounds toward zero. With
the CPU also rounding toward zero, all **192 lanes match bit for bit**. The firmware's own "execute
QPU" mailbox call doesn't answer on this firmware; queueing through the V3D registers works. The
image grew to 60 KB with this command in.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/pi-zero/pz_qpu_169_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/pi-zero/pz_qpu_169.mp4' | relative_url }}" type="video/mp4"></video>

*55 s: how the ARM hands the work to the 12 QPUs through the mailbox, why the results first differed (rounding), and twelve cores finishing in the time of one: 66× the ARM with VFP. English on-screen text, background music.*

## What I'd do next

This was a toy loop, chosen to be easy to count. The useful version came later on my Pi 1, same chip:
moving a face detector's convolutions onto these 12 QPUs took one picture from 2.37 s to 43.5 ms
([Pi 1 story]({{ '/embedded/boards/pi1/face-detect-qpu' | relative_url }})). On the Zero itself I'd
like to try integer work next (the QPUs do more than floats) and see how the VPM DMA behaves with
bigger blocks.

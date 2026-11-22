---
layout: default
title: "A face detector on a 2012 Pi: 2.37 s to 43.5 ms on the 12 QPUs"
short_description: "YuNet from my NanoPi project on the ARM1176, then every convolution moved onto the VideoCore's shader cores"
status: "Done"
picture: "assets/images/boards/pi1/pi1_face_ms.png"
latest_release: "2026-10-26: 43.5 ms a picture, 12.3 detections/s live"
index: 30
publish: true
permalink: /embedded/boards/pi1/face-detect-qpu
board_parent: pi1
result: "One picture 2374 -> 43.5 ms; live 0.3 -> 12.3 detections/s (17.5 after the webcam fix)"
---

# A face detector on a 2012 Pi: 2.37 s to 43.5 ms on the 12 QPUs

[Back to the Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }}) · measured 2026-10-26

![One picture through YuNet, step by step]({{ '/assets/images/boards/pi1/pi1_face_ms.png' | relative_url }})

## Situation

On my NanoPi 2 Fire I already had a face detector running under FreeRTOS: YuNet (the small one from
OpenCV Zoo, 59 ops, 320x192 input here), webcam in, boxes on HDMI. I wanted the whole thing on the Pi 1.
CPU first, QPUs later. On QEMU the port gave the same boxes and scores as the PC on both test pictures
(884 and 872). Then the real board:

```
pz> face test 0
 picture 0 (640 x 360) at 320 x 192: 1 face(s), 2375 ms
 (278,120)-(395,285) score 884
 us: pre 22341 conv 273499 dw 370466 pw 1679318 pool 28583 dec 773 (forward 2374278)
```

2.37 s for one picture. With the D-cache off it was 8.57 s, so the MMU and cache setup was already
worth 3.6x. Live from the webcam it was about one detection every 3 s. The `us:` line says where the
time goes: `pw` (the 1x1 convolutions) is 1.68 s of the 2.37.

## Task

Get it to something that feels live, on a 700 MHz ARM1176. The [QPU test on the Zero]({{ '/embedded/boards/pi-zero/qpu' | relative_url }})
said 12 QPUs give about 66x the ARM with VFP. So: move the heavy ops onto the QPUs without changing a
single box or score.

## Action

**Step 1: 1x1 convs as a matrix multiply.** A 1x1 convolution is a GEMM: weights `cout x cin`, input
`cin x n`. I added a hook in the shared detector code (`fdet_pw_hook`, NULL on the NanoPi build so
that one is unchanged) and an sgemm on up to 12 QPU threads. The ARM cleans its D-cache before the GPU
reads, cleans and invalidates after. Alone it was fast and exact:

```
 sgemm 64 x 64 x 3840: QPU 0, 5391 us (5835 MFLOPS, 12 threads); CPU 751825 us (41 MFLOPS); max |diff| 0.000000
 sgemm 16 x 16 x 15360: QPU 0, 2803 us (2805 MFLOPS, 12 threads); CPU 218470 us (35 MFLOPS); max |diff| 3.937500
```

Except that last line. A test with a pattern that repeats every 3 columns showed only rows 0, 3, 6...
came out right: every row had got row 0's C. The C load ignored a 16 KiB pitch. I set beta to 0 and
did the bias on the ARM for now. Picture: **2374 -> 795 ms**, same boxes, same scores.

**Step 2: everything else that's a convolution.** My own QPU programs (written with py-videocore's
assembler, turned into C headers): depthwise 3x3 with 9 TMU gathers per 16 pixels and per-lane edge
masks, the first 3x3 conv as im2col + a 1x1 kernel with bias and ReLU fused, and the 1x1 convs with the
bias as the starting value of the sums. The first depthwise run gave NaN. A one-tap-at-a-time test
against plain C found only the 8th thread wrong: its VPM rows were 70..72, and only rows 0..63 work.
6 threads of 10 rows or 12 of 5 fixed it.

I also stopped the USB stream while YuNet runs, so the isochronous interrupts don't steal time: they
were adding about 18 %. Picture: **795 -> 136 ms**, live about 6 a second.

**Step 3: the memory-bound leftovers.** By now the ARM's share was mostly moving bytes, and the ARM is
slow at that. I measured it:

```
face membench
 1 MiB: memset 2734 us, read 6106 us, memcpy 11642 us, float stores 6470 us (sum 0)
```

So: the camera picture to float planes on the QPUs (bytes picked out of TMU words), the im2col rows
written by the QPUs' DMA, the per-op uniform lists built once and reused, row stores with two DMAs
instead of a padded scratch, and the HDMI scale-and-colour done by the QPUs straight into a cached
framebuffer. And since a 50 ms run is too short for pausing the stream to pay off, I took the pause
out again.

## Result

| Stage | One picture | Live |
|---|---|---|
| CPU, cache on | 2374 ms | ~0.3 /s |
| + 1x1 on the QPUs | 795 ms | ~1 /s |
| + every conv on the QPUs | 136 ms | ~6 /s |
| + pool, no copies | 104 ms | 6.7 /s |
| + load, im2col, HDMI on the QPUs | 43.5 ms | 12.3 /s |

![Face detection time per stage, log scale]({{ '/assets/images/boards/pi1/pi1_speed_chart.png' | relative_url }})
*Each step on one chart, log scale: blue is one still picture (2374 -> 795 -> 136 -> 104 ms...), green is live from the webcam, down to 81 ms a frame. (Vietnamese labels.)*

- **54x** faster per picture than the CPU version. Step 1 gave exactly the CPU's boxes and scores
  (884 and 872); I checked that the face is still found after each later step, I didn't re-diff every
  score.
- After the [webcam fix]({{ '/embedded/boards/pi1/webcam-and-ring' | relative_url }}) the live rate
  went to **~17.5 detections a second**: the stream had been restarting about 9 times a minute.
- Where a live frame's time goes now (from `usb stat`): load 2.1 ms, forward 44.7 ms (dw 17.1, pw 15.8,
  pool 6.5, conv 5.1), boxes and drawing 0.8 ms, HDMI 3.3 ms.

## What I'd do next

The depthwise kernel reads each input three times; a rotate-based version would read it once. And the
sgemm C-load pitch bug is still there in `face qpu test`. I worked around it, never fixed it.

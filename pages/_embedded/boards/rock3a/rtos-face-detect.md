---
layout: default
title: "Webcam to NPU to HDMI, with no Linux on the chip"
short_description: "Driving the RK3568 NPU, my own xHCI/UVC host and a JPEG decoder from FreeRTOS, RetinaFace boxes on HDMI"
status: "Done"
picture: "assets/images/boards/rock3a/rtos_face_cover.jpg"   # 2026-11-23 cover (user: make it more eye-catching)
latest_release: "2026-11-01: live webcam faces on HDMI from FreeRTOS"
index: 13
publish: true
permalink: /embedded/boards/rock3a/rtos-face-detect
board_parent: rock3a
result: "718 webcam frames in 30 s (25.09 fps at 320x240), faces in 703, JPEG to screen 28.0 ms avg, 0 dropped"
edge_ai: true   # 2026-11-22: listed on /edge-ai/ (user «Thêm 1 page là Edge AI … gom các project có liên quan đến AI»)
edge_ai_index: 0
tags: [rockchip, arm, edge-ai, npu, freertos, bare-metal]
description: "Driving the RK3568 NPU, my own xHCI/UVC host and a JPEG decoder from FreeRTOS, RetinaFace boxes on HDMI"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# Webcam to NPU to HDMI, with no Linux on the chip

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![ROCK 3A cover, "Webcam → NPU → HDMI": 25.09 fps, no Linux on the chip]({{ '/assets/images/boards/rock3a/rtos_face_cover.jpg' | relative_url }})
*25.09 fps from webcam to HDMI, the NPU doing the faces, no Linux on the chip.*

![What each core does for one frame]({{ '/assets/images/boards/rock3a/rtos_face_cores.png' | relative_url }})

*Per-core time for one frame, averaged over the 718 frames of the final run (labels in Vietnamese, from
my wiki): JPEG decode on core 0, the NPU on core 1, decode of the boxes and drawing on core 2.*

## Situation

I'd already done face detection on this board the normal way: Debian, Rockchip's `librknnrt`, V4L2
for the webcam. It worked. But the whole point of the RTOS work was to see how much of the chip I
could run without Linux, and the NPU is the part everyone says needs Linux, because Rockchip only
ships the runtime as a closed `.so` for Linux and Android.

![NPU stack on Linux vs what the RTOS does itself]({{ '/assets/images/boards/rock3a/face_npu_linux_vs_rtos.png' | relative_url }})

*The NPU stack on Debian (left) and what my FreeRTOS has to do itself for each layer (right). The top half happens on every job; the bottom five (regulator, clock, power domain, DDR firewall, IOMMU) are what Linux and TF-A quietly did at boot.*

## Task

Get the same demo running entirely on FreeRTOS: USB webcam in, RetinaFace on the NPU, boxes drawn and
shown on HDMI. No Linux, no Rockchip code at run time, no USB stack borrowed from anywhere.

## Action

I split it into milestones and checked each one against Linux before moving on.

The NPU first. It doesn't run models, it runs "regcmd" lists: arrays of 64-bit
words in DRAM, each saying "write this value into this register". The NPU's own program controller
fetches the list by DMA. So without Linux the job is: power the NPU up (RK809 regulator over I2C, clocks,
power domain, resets), put a list in DRAM, point the controller at it.

My first list, written from a generator for the RK3588, did nothing on the board. Three things were in
the way, found in this order: my host writes to the `S_POINTER` registers stopped any unit from starting;
the DDR firewall, which a Maskrom boot leaves closed for every non-secure master, so the NPU's first read
failed with `DMA_READ_ERROR`; and the field layout, which is the RK3588's, not the RK3568's. I fixed the
first two and then took a shortcut for the third: run the model once under `librknnrt` on Debian with
a small `LD_PRELOAD` that dumps every NPU buffer before and after the job, and replay those buffers from
the RTOS.

Then a USB host from scratch. The "webcam" turned out to be a 4-port USB 2.0 hub with two UVC cameras
behind it (a stereo pair). I wrote the DWC3 host setup and an xHCI driver: command ring, event ring,
device contexts, route strings for devices behind a hub. The device and configuration descriptors my
RTOS read are byte-identical to what Linux shows in sysfs (43, 699 and 699 bytes).

![Which USB port goes to which controller]({{ '/assets/images/boards/rock3a/face_usb_map.png' | relative_url }})

*Measured on Debian first, on 2026-11-01: the webcam's port is on the USB 2.0 side of the xHCI at `0xfd000000`, behind a 4-port hub with the two cameras of the stereo pair (`05a3:9601`, `05a3:9602`). So no SuperSpeed needed.*

![usb on the RTOS: nine steps from Maskrom to descriptors]({{ '/assets/images/boards/rock3a/face_usb_bringup.png' | relative_url }})

*The nine steps my `usb` command goes through, measured on the board: SoC + DWC3 up in 409/429 ms (400 ms of it deliberate waits), xHCI reset 3 ms, hub and both cameras enumerated in 743 ms, descriptors identical to Linux's 43 + 699 + 699 bytes.*

MJPEG frames come over isochronous transfers: one TD per 125 µs microframe, a ring of 128 kept full,
UVC probe/commit to agree on 640x480 MJPEG, then the payloads glued into frames using the FID/EOF bits.

The JPEG decoder is my own too: baseline, 4:2:2, Huffman, integer IDCT, decoding straight into the network's
320x320 BGR letterbox, rotated 180° because of how the camera sits. On the PC the same C file gives
44.6 to 53.1 dB PSNR against Pillow.

The pipeline around it is FreeRTOS SMP, tasks pinned to cores, queues carrying frame-slot indexes, a
double-buffered framebuffer flipped at the frame start.

One bug worth keeping: at 640x480 the decoder takes 28 ms, and my USB poll only drained 64 TDs per call.
During a long decode the ring ran dry, the controller reported ring overrun (completion code 15) 419
times in 10 s. Draining every finished TD before returning fixed it: 0 errors.

```
rock3a> face cam 9601 320 30
  frames .......... 718 shown, 25.09 fps (first to last flip) · 0 JPEGs dropped (pipeline full) · 0 bad
  faces ........... in 703 of 718 frames, best score 100 %
  JPEG decode ..... core 0 · avg 9201 us · min 8841 · max 9368 (320x240 -> 320x240 in 320x320, rot180)
  latency ......... whole JPEG -> its flip: avg 28029 us · min 19632 · max 36377
```

## Result

| Milestone | Measured on the board |
|---|---|
| RetinaFace 320 on the NPU from FreeRTOS | 88 tasks in **3.435 ms** at 600 MHz (100 runs: 3.432 to 3.439); output bytes identical to `librknnrt` for all 3 test pictures |
| Boxes on HDMI from still pictures | 602 frames in 10.04 s = **59.97 fps**, 0 missed flips |
| USB bring-up | port up in 409 to 429 ms (400 ms are deliberate waits), hub + 2 cameras enumerated in 743 ms |
| MJPEG stream | **30.04 fps**, 259 good frames in 10 s, 80 000 isochronous TDs = exactly 8000/s, 0 errors |
| Live webcam to HDMI | 718 frames in 30 s, **25.09 fps** at 320x240 (30.05 fps in an earlier run with nobody in view), faces in 703 of 718, 0 dropped |
| JPEG to page flip | **28.0 ms** average (19.6 to 36.4) |

The framebuffer read back over the UART matches the PC's render of the same JPEG in every pixel that
isn't a box, dot or label.

## What I'd do next

640x480 only reaches 21.6 to 23.6 fps because the decode takes 28 ms. Splitting the decode across two
cores, or using the chip's own JPEG decoder, is the obvious fix. I haven't tried either.

The network itself is still Rockchip's: compiled once by their toolkit, captured from `librknnrt`. At
run time there's no Rockchip code, but I can't build a new model for the RTOS without Linux yet.

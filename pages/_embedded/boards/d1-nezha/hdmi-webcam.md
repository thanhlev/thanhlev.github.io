---
layout: default
title: "A USB webcam on HDMI with no Linux: 1080p MJPEG at 29.4 fps on one RISC-V core"
short_description: "HDMI bring-up from FreeRTOS, my own EHCI isochronous driver, and the D1's Video Engine decoding the JPEGs"
status: "Done"
picture: "assets/images/boards/d1-nezha/d1_webcam_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-01: 1080p MJPEG webcam -> HDMI, CPU ~1.2 %"
index: 40
publish: true
permalink: /embedded/boards/d1-nezha/hdmi-webcam
board_parent: d1-nezha
result: "1920x1080 MJPEG webcam -> HDMI at 29.4 fps, CPU ~1.2 % (YUY2 640x480 first: 29.9 fps, 23 %)"
tags: [allwinner, risc-v, freertos, bare-metal, usb, camera]
---

# A USB webcam on HDMI with no Linux: 1080p MJPEG at 29.4 fps on one RISC-V core

[Back to the D1 Nezha hub]({{ '/embedded/boards/d1-nezha/' | relative_url }}) · measured 2026-09-30 and 2026-10-01

![The result first]({{ '/assets/images/boards/d1-nezha/d1_webcam_cover.jpg' | relative_url }})
*The result first: 1080p MJPEG from the webcam to HDMI at 29.4 fps, with the CPU about 1.2 % busy. Chip photo: [Popolon](https://commons.wikimedia.org/wiki/File:AllWinner_D1.jpg), CC BY-SA 4.0.*

![The OSD panel my FreeRTOS draws over the video, at 640x480]({{ '/assets/images/boards/d1-nezha/d1_uvc_osd.png' | relative_url }})

## Situation

[FreeRTOS was running]({{ '/embedded/boards/d1-nezha/freertos-c906' | relative_url }}) on the C906 over
FEL. The Nezha has an HDMI port, a USB-A host port, and I had a Logitech webcam. The D1 has no GPU, but
it has a display engine (mixer, scaler, colour conversion), a TCON, the HDMI controller and PHY, and a
Video Engine for H.264 and friends. Everything a "camera to screen" box needs, and on Linux the vendor
BSP does all of it. I wanted to see it on my RTOS.

## Task

Get a picture out of HDMI from FreeRTOS. Then get webcam frames in over USB and onto that screen. Then
see how far one 1 GHz core can take it.

![Webcam to HDMI data path]({{ '/assets/images/boards/d1-nezha/d1_uvc_path.png' | relative_url }})
*Where it ended: the frame never passes through the CPU. My EHCI driver points USB DMA at the buffers, the DMA controller gathers the payloads, the Video Engine decodes, the display engine scales to HDMI.*

## Action

**HDMI first.** With a monitor plugged in, the board saw hot-plug and read the 256-byte EDID. For the
controller I ported U-Boot's DesignWare HDMI code (GPL-2.0-only, so that demo carries that licence)
against small compat headers. First bring-up at 720p60: the PHY passed calibration, PLL lock and TX
ready, `PHY_STAT0 = f3` (HPD plus RX sense on all four TMDS lanes), the TCON at 60.00 Hz, and on the
screen: 8 colour bars and a grey strip.

Two of my own bugs after that. The vblank interrupt never came, because I used PLIC id 91 from the
device tree, when it's `SOC_PERIPHERAL_IRQ(91)` = 91 + 16 = **107**. Then the screen went black at
1080p, and stayed black at 720p, with every register identical to the good run. What was different
was how I got there: every black run came after `exit` -> FEL -> reload with the display still
running. A real reset, same image: picture at once. So `hdmi off` now stops scan-out, waits a frame and
puts HDMI, TCON, DPSS and DE back in reset with clocks gated, and the RTOS does that by itself on exit.
Which block keeps the bad state across a FEL reload, I still don't know.

The Video Engine also played H.264 here: a 720x1280 portrait test clip at 30.00 fps for 120 s, 0 late
frames, 9.5 % CPU.

**USB: writing an EHCI driver.** CherryUSB has a UVC host and T113 glue, but its isochronous function
for EHCI is called and never provided (none of its 1105 files has iso code), and the licences didn't mix
well with the GPL part. So I wrote the EHCI driver, with U-Boot's D1 PHY sequence. The controller woke
up halted and healthy (`HCIVERSION 0x0100`, 1 port); after `CONFIGFLAG` the port showed a high-speed
device. Then I hung the board: I'd enabled OHCI1's bus gate but not its clock, with my watchdog off.
Same mistake I'd made in the HDMI work. Every probe runs with the watchdog on since.

**The camera kept falling off the bus.** `GET_CUR` worked, `SET_CUR` made it disconnect electrically. I
guessed a supply droop when the sensor starts, and went as far as writing a hub driver. Same failure
with the board on its own supply. Wrong guess. Linux's `uvc_video_init()` calls `SET_INTERFACE(..., 0)`
first, with a comment that some cameras "crash or otherwise misbehave" without it. Doing the same fixed
it. Then 15.3 fps instead of 30: auto-exposure priority was 1 by default, which lets the camera trade
frame rate for exposure (the room's light varied between runs too). Priority 0:

```
(1206 - 903) frames in (40511 - 30378) ms = 29.9 fps, 0 errors
```

with the stream task using 23 % of the CPU. 1754 frames over 59 s with no fault, and a frame read back
over FEL decodes to a correct picture (I didn't commit it: it's me in the room).

**Bigger frames.** At 1920x1080 the camera does YUY2 at only 5 fps (I got 5.06), so it has to be
MJPEG. Decoding on the CPU with TJpgDec: 13.2 fps at 640x480, 4.4 at 720p, 1.8 at 1080p, the core
100 % busy. The Video Engine decodes JPEG too: 1080p at 29.8 fps, CPU 12.5 %. The last step was taking
the CPU out of the data path: USB DMA writes the isochronous buffers, the DMA controller copies the
payloads, the VE decodes and raises an interrupt, the display engine scales and shows.

## Result

**1920x1080 MJPEG from the webcam to HDMI at 29.4 fps, with the CPU about 1.2 % busy** and 0
errors, checked by eye on the monitor. The first version (YUY2 640x480, CPU copying) did **29.9 fps
at 23 %**; the OSD panel on top costs **0.4 %**. HDMI from FreeRTOS works at **720p60 and 1080p60**,
with vblank-paced drawing at 60 frames/s and no late frame, and H.264 on the VE plays **720x1280 at
30.00 fps for 120 s, 0 late, 9.5 % CPU**.

Three of the mistakes were mine: IRQ 91 vs 107, a clock left off (twice), and blaming the power
supply for a missing `SET_INTERFACE`.

![MJPEG decode fps and CPU load]({{ '/assets/images/boards/d1-nezha/d1_mjpeg_fps.png' | relative_url }})
*Who decodes the JPEGs, measured: the C906 alone tops out at 13.2 fps at 640x480 with the core at 100 %; the Video Engine does 1080p at 29.8 fps, and with DMA in the path 29.4 fps at 1.2 % CPU.*

## What I'd do next

4:2:0 JPEGs aren't handled yet; they'd need NV12 output from the VE. The hub driver is
written but untested, and full/low-speed devices need OHCI. HDMI audio is not started.

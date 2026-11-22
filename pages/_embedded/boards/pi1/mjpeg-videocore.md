---
layout: default
title: "Asking the VideoCore to decode my JPEGs, from bare metal"
short_description: "VCHIQ and MMAL rewritten from Linux's staging driver so a FreeRTOS app can use the GPU firmware's MJPEG decoder"
status: "Done"
picture: "assets/images/boards/pi1/pi1_soc.png"
latest_release: "2026-10-26: face live on GPU-decoded MJPEG"
index: 20
publish: true
permalink: /embedded/boards/pi1/mjpeg-videocore
board_parent: pi1
result: "352x288 JPEG to I420 in ~5 ms on the GPU; 597 webcam frames, 0 decode errors"
tags: [raspberry-pi, arm, gpu, freertos, bare-metal, linux]
---

# Asking the VideoCore to decode my JPEGs, from bare metal

[Back to the Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }}) · measured 2026-10-26

![Inside the BCM2835: the ARM side and the VideoCore side]({{ '/assets/images/boards/pi1/pi1_soc.png' | relative_url }})

## Situation

My face detector on the Pi 1 took frames from a USB webcam (an A4 Tech, behind the LAN9512 hub). In raw
YUYV at 352x288, 15 fps. The camera can also send MJPEG, so I asked myself whether this CPU has an
MJPEG decoder. It doesn't. The ARM1176 has nothing. But the
VideoCore IV firmware does: its `video_decode` component lists MJPG. On Linux you reach it through
VCHIQ (a message queue in shared memory between the ARM and the GPU) and MMAL (the media API on top).
I had no Linux.

## Task

Talk VCHIQ and MMAL from FreeRTOS, hand the firmware a JPEG, get I420 back. Then feed the face
detector from it.

<a href="{{ '/assets/images/boards/pi1/pi1_pipeline.png' | relative_url }}"><img src="{{ '/assets/images/boards/pi1/pi1_pipeline.png' | relative_url }}" alt="Webcam to HDMI pipeline on the Pi 1" style="width:100%"></a>
*Where this fits in the whole thing: webcam MJPEG through the LAN9512 and my DWC2 host code, about 74 KB a frame, then the VideoCore `video_decode` over VCHIQ/MMAL (~5 ms) before the QPUs see a pixel.*

## Action

I took VCHIQ and MMAL from Linux's `drivers/staging/vc04_services` and rewrote what I needed in bare
metal (`vchiq.c`, `mmal.c`, `vcdec.c`), keeping Linux's six MMAL headers unchanged. Buffers are copied
(bulk transfers), not zero-copy. Simpler, and I can measure it later.

**The firmware said no.** First `vc init`:

```
pz> vc init
 vchiq_init: -1, VCHIQ_INIT refused (answer not 0) (tag code 80000004, answer FFFFFFFF, VideoCore initialised 0)
```

Over and over. Two things had to change: slot zero needed its debug area filled in (1288 bytes, the
size the firmware expects), and the board had to be **rebooted between tries**, because VCHIQ only
opens once per GPU boot. After that the answer was 0 but no CONNECT came back, until I rang the
doorbell every time instead of only when I thought it was needed.

**MMAL.** Once connected:

```
pz> vc mmal
 MMAL version 16.1
 ril.video_decode: handle 00000040, 1 input(s), 1 output(s)
```

**First JPEG: nothing back.** Bulk transfers aborted until I rounded the length up to a multiple of 4.
Then the 19 534-byte test JPEG arrived on the GPU side (19 536 with padding) and... nothing came
back. To see why, I raised the firmware's own log levels (by poking its logging symbol from the ARM)
and read its log. The decoder answers **one frame late**. Send the JPEG again and the first frame pops
out:

```
 decode: 152064 bytes of I420 from 19534 of JPEG; ...
 Y mean 101.878, Y at 16 points: 94 122 124 48 102 126 194 155 53 39 131 206 159 71 197 96
 video_decode:0:RIL: decoding 19534 bytes, 0us, flags 130, (cb:0x1f4c968c)
 video_decode:0:RIL: finished passing imageJ
```

To check the pixels I decoded the same test JPEG on the PC with libjpeg: Y mean 101.635 there,
101.878 on the GPU. Close enough for two different decoders.

**Then live.** `face live 352 288 15 mjpeg` keeps whole JPEGs from the UVC stream (by SOI and length),
decodes each on the VideoCore and runs the detector on the I420. With me in front of the webcam it
found one face.

## Result

MJPEG gets decoded on the VideoCore from bare metal: **19 534 B of JPEG -> 152 064 B of I420 in
5.3 ms** in steady state, and the Y mean is **101.878 against libjpeg's 101.635**. Live on the webcam
it did **597 frames with 0 decode errors, 5 ms a decode**, and found one face (3.0 s a run, the
detector was still on the CPU then).

The gotchas, so I don't hit them twice: VCHIQ opens once per GPU boot, bulk lengths go in multiples
of 4, and the decoder returns frame N when you send frame N+1.

<a href="{{ '/assets/images/boards/pi1/pi1_hdmi_osd.jpg' | relative_url }}"><img src="{{ '/assets/images/boards/pi1/pi1_hdmi_osd.jpg' | relative_url }}" alt="HDMI screenshot: webcam picture and status panel" style="width:100%;max-width:800px"></a>
*Straight off the HDMI output, 27 s after boot: my floor through the webcam, and the panel says `GPU VideoCore IV: giải MJPEG 5 ms, 80 KB/khung` (decode 5 ms, 80 KB per frame). The 29 USB errors on it are the next story. (Vietnamese panel.)*

## What I'd do next

Two input and two output buffers instead of one each, so the decode overlaps the next USB frame. And
try the zero-copy path: right now every JPEG gets copied once more than it needs to be.

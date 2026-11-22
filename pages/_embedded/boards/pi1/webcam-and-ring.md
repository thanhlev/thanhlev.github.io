---
layout: default
title: "The webcam that kept dropping, and the LED ring that went dark"
short_description: "A DWC2 isochronous bug I first blamed on the faces, and a WS2812 bit that was 160 ns too short"
status: "Done"
picture: "assets/images/boards/pi1/pi1_tasks.png"
latest_release: "2026-10-27: led task, 0xF8, new kernel on the card"
index: 40
publish: true
permalink: /embedded/boards/pi1/webcam-and-ring
board_parent: pi1
result: "Stream restarts ~9/min -> 0 (2117 runs in 121 s, 0 errors); ring lit again with 0xF8"
---

# The webcam that kept dropping, and the LED ring that went dark

[Back to the Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }}) · measured 2026-10-26 and 2026-10-27

![The FreeRTOS tasks: USB IRQ, watchdog, face, led]({{ '/assets/images/boards/pi1/pi1_tasks.png' | relative_url }})

## Situation

With the [detector on the QPUs]({{ '/embedded/boards/pi1/face-detect-qpu' | relative_url }}) the Pi 1
could do a picture in under 50 ms. Live, it didn't feel like it. The webcam (A4 Tech, isochronous, on
the LAN9512 hub) would stop: its light went off and on, the picture froze. And it looked like it
happened when a face showed up. I also had a 16-LED WS2812 ring on SPI0 (GPIO10, header pin 19) that
should chase one light per face. At some point it just stayed dark.

## Task

Make the stream stay up for minutes, find out whether faces really had anything to do with it, and get
the ring back.

![Pi 1 header pins in use]({{ '/assets/images/boards/pi1/pi1_header.png' | relative_url }})
*Where the ring hangs: 3.3 V on pin 1, data on pin 19 (SPI0 MOSI, GPIO10), next to the PL2303 on pins 8/10.*

## Action

**The stall, first look.** It wasn't the GPU: the stream stopped after ~95 s with no VCHIQ use at all.
Reading the stuck DWC2 core: `DMAReq` set, `AHBIdle` 0, host channel 2 "disabling" forever. An RX FIFO
flush did nothing; a core soft reset (`CSftRst`) brought `AHBIdle` back, and a full USB init then
streamed again. So I added a watchdog task that does exactly that when the stream stalls. Over 200 s of
MJPEG: 7 restarts, 69 detector runs, never stuck for good. A band-aid. Each restart costs ~1.15 s,
mostly the hub re-enumerating.

**"It drops when a face appears."** That's what I saw. So I tested the obvious suspect, the ring
(which only lights up when there's a face):

```
ring off (round 1): restarts 0 -> 12 = 12 in 90 s
ring spin (round 1): restarts 12 -> 20 = 8 in 90 s
ring off (round 2): restarts 20 -> 20 = 0 in 90 s
ring spin (round 2): restarts 20 -> 20 = 0 in 90 s
```

Not the ring: 12 drops with it off, 8 with it on. And round 2 reads 0 not because it got better, but
because the stream had died for good: a restart had failed and my watchdog never tried again (nothing
left to watch). That was a real bug; it now retries after 300 ms with no stream. Drops also happened
with nobody in view. The faces were a coincidence.

**The actual cause.** I added a histogram to `usb stat`: when each isochronous transfer was armed
versus the frame parity bit (`OddFrm`) the DWC2 uses to decide which microframe a channel runs in.
Armed with the parity of the frame already running, the channel fires at once and errors follow:

```
 arm parity == OddFrm, data : +0 72967 +1 0 +2 0 +3.. 0
 arm parity == OddFrm, error: +0 0 +1 75356 +2 75355 +3.. 0
```

Linux's dwc2 driver arms for the *next* frame's parity. I switched to one channel armed that way:
0 errors, but still 11 restarts. The last piece was the alt setting. The camera had picked alt 7,
3072 bytes per microframe (three packets). Capping it at one 1024-byte packet per microframe:

```
 iso: 972685 transactions, 247698904 bytes, 651305 empty, 0 errors, 0 deferred, 972685 irqs; 0 stream restarts
 uvc: 3565 frames, 0 short, 1 bad payloads; HPRT 0000100F
 face: 2117 runs, last 50 ms, 0 face(s); ...
 mjpeg: last JPEG 70936 B, decode 4 ms, 0 decode errors
```

(I also tried a lighter recovery, resetting only the core. The hub port was lost after `CSftRst`, so
the full bring-up stays as the fallback.)

**The dark ring.** First question: does SPI0 even move the pin?

```
ring probe
 SPI0 CS 00050080 at start, 00050080 at the end, CLK 40; pin 19 seen high 804, low 847 times while sending
```

It moves. To separate code from wiring I rebuilt an older image (the one where the ring last worked) in
a git worktree and loaded it: the ring spun. So, code. SPI0 runs at 250 MHz / 40 = 6.25 MHz, 160 ns per
SPI bit, one SPI byte per LED bit. A WS2812 "1" was `0xF8` (800 ns high). Somewhere between the working
version and the new one it had become `0xF0`: 640 ns high. Too short for my ring. Back to `0xF8`, a red
test frame, and it lit.

![0xF0 vs 0xF8 as an SPI waveform]({{ '/assets/images/boards/pi1/pi1_ws2812_bits.png' | relative_url }})
*The whole bug in one picture: four high SPI bits are 640 ns, five are 800 ns. My ring wanted the longer one.*

While I was in there I gave the ring its own FreeRTOS task: the face task calls `ring_note(n)`, which
wakes the `led` task with `xTaskNotifyGive`; it waits for that or 40 ms. A frame on the SPI takes
0.5 ms. The effects come from my NanoPi project (78 of them), the WS2812 encoder from my ROCK 3A code.

## Result

- Webcam: from ~9 stream restarts a minute to **0 in 121 s**, **2117 detector runs**, 0 isochronous
  errors, 0 decode errors.
- Live rate: **~17.5 detections a second** (it was 12.3 with the restarts).
- The "drops when a face appears" theory was wrong: **12 drops with the ring off vs 8 with it on**.
  But the test found a real bug (no retry after a failed restart).
- The LED ring: dark with `0xF0` (640 ns), lit with **`0xF8` (800 ns)**. Checked by eye: the old image spun,
  then the new one lit.

![Webcam stream restarts before and after the fix]({{ '/assets/images/boards/pi1/pi1_restarts.png' | relative_url }})
*Restarts per run: 12 with the ring off, 8 with it spinning, 0 in 121 s after the parity and packet-size change.*

## What I'd do next

Watch the auto start at power-on with this kernel; it's on the card but I haven't seen a cold boot
through to a lit ring yet. And the stream costs one interrupt per microframe (972 685 in those two
minutes); batching them is what I'd look at next.

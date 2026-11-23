---
layout: default
title: "The board that names the music it plays, now on Linux"
short_description: "The YAMNet genre demo moved from Android 14 to Debian 11: a PipeWire monitor tap, one C program and the same INT8 model on the RK3568 NPU"
status: "Done"
picture: "assets/images/boards/rock3a/music_linux_chain.png"
latest_release: "2026-11-23: three clips right, NPU 1.44 ms per window at 900 MHz"
index: 17
publish: true
permalink: /embedded/boards/rock3a/music-linux
board_parent: rock3a
result: "1.44 ms per YAMNet window on the NPU at 900 MHz (Android: 2.05 ms), 32x faster than one CPU thread, piano, rock and speech all right"
edge_ai: true   # listed on /edge-ai/
edge_ai_index: 9
tags: [npu]
---

# The board that names the music it plays, now on Linux

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

## Situation

A few days earlier I had a demo I liked a lot on my Android 14 port: the ROCK 3A plays a song from the
YouTube app, listens to its own output and tells you what it hears. There's no microphone. Android's
AudioPolicy lets an app loop the mixed output back to itself (the remote-submix path), so my capture
app gets the same 48 kHz stereo that goes to the jack. A small daemon turns it into log-mel windows,
YAMNet INT8 runs on the RK3568's NPU, and the result drives the LED ring on the SoC's RISC-V core.
The AI part never touches the network.

That chain is very Android-shaped, though. The loopback needs a root app, the capture runs in Java
(124 to 132 MB of RSS for something that moves 10 ms blocks), and I had no idea how much of the NPU
timing was the NPU and how much was Android. So I wanted the same thing on plain Linux.

![The Android chain above, the Linux chain below]({{ '/assets/images/boards/rock3a/music_linux_chain.png' | relative_url }})

Top row: what I had on Android, with the 39.5 ms the loopback takes before my app even sees a block.
Bottom row: the Linux version from this post, six boxes and only one of them is my own program.

## Task

Rebuild the chain on a second ROCK 3A running Radxa's Debian 11 image (kernel 5.10.160, headless, eMMC).
The tap had to come from the sound server, the way remote-submix does on Android, not from a mic.
And I wanted numbers I could put next to the Android ones, so: the same `.rknn` file, the same
runtime version (librknnrt 2.5.0) and the same three test clips (piano, rock, a speech recording, all from
Wikimedia Commons).

## Action

The image ships PulseAudio 14.2. What I wanted was PipeWire, because of one property: a capture stream
with `stream.capture.sink=true` gets connected to a sink's monitor, which is just "whatever is being
played right now". Plain bullseye only has PipeWire 0.3.19, which is too old, so I asked for the backports
version and got this:

```
E: Failed to fetch https://deb.debian.org/debian/pool/main/p/pipewire/pipewire-pulse_0.3.65-2%7ebpo11%2b1_arm64.deb  404  Not Found
```

bullseye-backports isn't on deb.debian.org anymore; it moved to archive.debian.org. Its Release file is
old, so apt also needs `check-valid-until=no`. One line fixed it:

```
rock3a$ sudo sh -c 'echo "deb [check-valid-until=no] https://archive.debian.org/debian bullseye-backports main contrib non-free" \
          > /etc/apt/sources.list.d/bullseye-backports.list'
rock3a$ sudo apt-get update && sudo apt-get install -y -t bullseye-backports pipewire pipewire-pulse pipewire-alsa wireplumber
```

That gave me PipeWire 0.3.65 with WirePlumber 0.4.13. I masked the PulseAudio user service, turned on
lingering for my user so the audio stack runs without anyone logged in, and set the default sink to the
rk809 codec (the 3.5 mm jack).

The tap is one command. `pw-record` with `-` as the file name writes raw s16 to stdout (WAV can't go
through a pipe, its header needs a seek). So the whole demo is a pipe:

```
pw-record -P stream.capture.sink=true --rate 48000 --channels 2 --format s16 --latency 10ms - \
  | ./bin/yamnet_tap model/yamnet_rk3568_i8_normal.rknn model/yamnet_class_map.csv
```

`yamnet_tap` is about 300 lines of C, linked only against librknnrt and libm. Most of it I copied from my
Android code, on purpose: the 63-tap sinc resampler (48 to 16 kHz), the log-mel front end I had already
checked bit for bit against the reference, and the way the INT8 input goes in. That last one matters. With
librknnrt 2.5.0, feeding float NCHW into this INT8 model gives wrong classes, so I quantise the 96 x 64 patch
myself (zero point 22, scale 0.045939, read from the model) and pass it through untouched. The new part is
small: read 480 frames (10 ms) at a time, keep a ring of log-mel rows, and run a window when there are 96
rows and 48 of them are new. That's 0.975 s of audio every 0.48 s.

My first draft had a bug there. I subtracted 48 from the new-row counter instead of resetting it, so window 2
fired right after window 1 with only one new row in it. I caught it before the real runs.

The runtime is the Linux aarch64 `librknnrt.so` 2.5.0, fetched on the board from Rockchip's rknn-toolkit2 repo
at the same commit I pinned for Android. It lives next to the binary (rpath `$ORIGIN/../ext`), so nothing
gets installed system-wide. The model file is the one from the Android runs, and its sha256 matched on
the board. A smoke test with three seconds of zeros came first:

```
INIT api=2.5.0 (74ea630ce8@2026-09-30T09:41:17) drv=0.8.8 init_ms=45.9 input zp=22 scale=0.045939
WIN 0 t=0.02 npu_ms=5.16 fe_ms=0.14 Silence:1.00 Speech:0.00 Child speech, kid speaking:0.00 | avg3 Silence:1.00
```

Silence in, `Silence: 1.00` out. Then the three clips through `pw-play`, with the tap started first and the
start time of each clip saved so I could measure when the first real label came out:

```
piano : win=65 npu mean/min/max=5.05/4.92/5.35 ms | first non-silence +570 ms -> Music:0.95 | top1: Music 64, Silence 1
rock  : win=65 npu mean/min/max=5.00/4.48/5.18 ms | first non-silence +560 ms -> Music:0.93 | top1: Music 63, Silence 1, Buzz 1
speech: win=65 npu mean/min/max=5.04/4.54/5.39 ms | first non-silence +565 ms -> Speech:0.56 | top1: Speech 55, Eruption 5, Silence 2, Explosion 1
```

The labels were right, but look at `npu_ms`. Five milliseconds. On Android the same model took about 2 ms,
and for a while I thought the Linux NPU stack was just slower (it's an older driver, rknpu 0.8.8 on kernel
5.10 against 0.9.8 on 6.1). Then I read the NPU's devfreq node. This image's default governor is
`rknpu_ondemand`, and a job of a millisecond or so every half second never convinces it to clock up:
`cur_freq` showed anything from 200 to 900 MHz depending on when I looked. I set the governor to
`performance` for the measurement, and the same windows took 1.44 ms.

![Milliseconds per YAMNet window, five ways]({{ '/assets/images/boards/rock3a/music_linux_npu_ms.png' | relative_url }})

The same 0.975 s window five ways: 45.68 ms on one CPU thread, 23.93 ms on four, 5.0 ms on the NPU at the
default governor, 2.05 ms on Android and 1.44 ms on Linux with the NPU pinned at 900 MHz.

For the CPU side I ran the float ONNX version of the same patch model with onnxruntime 1.19.2 on the board:

```
RESULT cpu_onnx threads=1 ms mean=45.68 min=45.49 max=45.84 (input [1, 1, 96, 64])
RESULT cpu_onnx threads=4 ms mean=23.93 min=23.58 max=24.24
```

Afterwards I put the governor back to `rknpu_ondemand`. Five milliseconds out of a 480 ms budget is plenty.

## Result

**1.44 ms per window** on the NPU at 900 MHz (1.39 to 1.46), against 45.7 ms on one A55 thread: the NPU is
32 times faster, or 17 times against all four cores. All three clips came out right: piano gave Music in 64 of 65
windows with Piano and Keyboard in the top 3, rock gave Music in 63 of 65, and speech gave Speech in 55
of 63. YAMNet is better at instruments than at genres, by the way. On Android, "Rock music" also only reached
0.04 for that clip. The first label shows up 0.56 to 0.57 s after the clip starts. That's almost all window, since
the first one needs 0.975 s of audio.

| | Linux (Debian 11) | Android 14 |
|---|---|---|
| NPU, ms per window (set + run + get) | 1.44 at 900 MHz, 5.0 on `rknpu_ondemand` | 2.05 at 1 GHz (13-clip runner), 2.8 to 4.9 in the daemon |
| Capture | `pw-record` on the sink monitor, 6.8 % of a core | Java loopback app, 2 %, RSS 124 to 132 MB |
| Analysis process | `yamnet_tap`: 6.7 % of a core, RSS 14.9 MB | `r3a_musicd`: 7.2 %, RSS 15.3 MB |
| Stack | kernel 5.10.160, rknpu 0.8.8, librknnrt 2.5.0 | kernel 6.1.99, rknpu 0.9.8, librknnrt 2.5.0 |

The surprise is that Linux at 900 MHz beats Android at 1 GHz on the same file and the same runtime. I don't
know why yet. Android's own `rknn_benchmark` gets 1.41 ms for the bare run, so the NPU itself is the same, and
the extra half millisecond is somewhere in the call path. The older driver is the obvious difference, but I
haven't tested it. What I do know: on this image, the default governor is what made the NPU look slow.

## What I'd do next

I haven't plugged a speaker into the jack yet. Everything was measured through the monitor, which is the
point of the demo, but nobody has actually heard it play. The longest run was 70 seconds; the Android version
did a 10-minute soak, and this one hasn't. The 0.56 s figure is only accurate to the window. A proper
"sound leaves the sink, label printed" latency needs `pw_stream` timestamps from the C API instead of
`pw-record`. After that comes real music from an app through pipewire-pulse, and the class-to-LED-scene table
from the Android build so the ring can follow along on Linux too.

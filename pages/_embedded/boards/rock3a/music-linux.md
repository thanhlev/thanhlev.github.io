---
layout: default
title: "The board that names the music it plays, now on Linux"
short_description: "The YAMNet genre demo moved from Android 14 to Debian 11: a PipeWire monitor tap, one C program and the same INT8 model on the RK3568 NPU"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_music_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-24: the build in more depth (front end, INT8 input, tap)"
index: 17
publish: true
permalink: /embedded/boards/rock3a/music-linux
board_parent: rock3a
result: "1.44 ms per YAMNet window on the NPU at 900 MHz (Android: 2.05 ms), 32x faster than one CPU thread, piano, rock and speech all right"
edge_ai: true   # listed on /edge-ai/
edge_ai_index: 9
tags: [rockchip, arm, npu, edge-ai, linux]
---

# The board that names the music it plays, now on Linux

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![The music story in one picture]({{ '/assets/images/boards/rock3a/r3a_music_cover.jpg' | relative_url }})
*The whole story in one picture: 1.44 ms per YAMNet window on the NPU under Debian, 32 times one CPU thread and faster than the 2.05 ms I had on Android.*

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

### PipeWire on an old Debian

The image ships PulseAudio 14.2, and PulseAudio can record a monitor too. What I wanted from PipeWire was one
property: a capture stream with `stream.capture.sink=true` is connected to a sink's monitor by the session
manager, which is just "whatever is being played right now", from any application, without me naming the
source. That's the closest thing on Linux to Android's remote-submix path, and it's what the later LED version
builds on. Plain bullseye only has PipeWire 0.3.19, which is too old, so I asked for the backports version and
got this:

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

That gave me PipeWire 0.3.65 with WirePlumber 0.4.13. Three small things made it behave like a service rather
than a desktop toy. The PulseAudio user service is masked, so the two servers don't fight over the card.
`loginctl enable-linger` for my user keeps the user's audio stack running with nobody logged in, which matters
on a board I reach over ssh. And the default sink is set by name to the rk809 codec (card 0, the 3.5 mm jack),
not the HDMI card (card 1):

```
rock3a$ loginctl enable-linger radxa; systemctl --user mask pulseaudio
rock3a$ systemctl --user --now enable pipewire pipewire-pulse wireplumber
rock3a$ pactl set-default-sink alsa_output.platform-rk809-sound.HiFi__hw_rockchiprk809__sink
rock3a$ pw-cli info 0 | grep version
version: "0.3.65"
```

The NPU needed nothing. On this image it's a DRM render node (`/dev/dri/renderD129`, driver RKNPU) rather
than the `/dev/rknpu` I knew from newer kernels, and the default user is already in the `render` group, so
the classifier runs without root.

### The tap: one pipe, no WAV

`pw-record` with `-` as the file name writes raw s16 to stdout. WAV can't go through a pipe: its header has
the data length in it, and the writer has to seek back to fill that in at the end. Raw samples in a fixed
format avoid the question. So the whole demo is a pipe:

```
pw-record -P stream.capture.sink=true --rate 48000 --channels 2 --format s16 --latency 10ms - \
  | ./bin/yamnet_tap model/yamnet_rk3568_i8_normal.rknn model/yamnet_class_map.csv
```

I chose 48 kHz stereo because that's what the sink plays, so PipeWire doesn't have to convert anything on the
monitor; the program downmixes and resamples itself. `--latency 10ms` asks for 480-frame blocks, the same
cadence as the Android capture. I found out later that PipeWire runs its graph at whatever quantum the other
clients need (1024 frames once Firefox was playing), so the blocks arrive in pairs. For a classifier that
looks at almost a second at a time that doesn't matter. For the beat timing in the
[LED post]({{ '/embedded/boards/rock3a/music-leds' | relative_url }}) it did.

### From 48 kHz stereo to a 96 × 64 patch

`yamnet_tap` is about 300 lines of C, linked only against librknnrt and libm. Most of it I copied from my
Android code, on purpose, so the scores stay comparable. Each 10 ms block is downmixed (L + R) and resampled
to 16 kHz with a 63-tap Blackman-windowed sinc, cut-off 7.4 kHz, then decimated by 3. The cut-off sits just
above YAMNet's top mel band (7.5 kHz would be the edge) and below the new 8 kHz Nyquist, so nothing folds back
into the bands the model looks at.

The log-mel front end is YAMNet's own recipe in C: 400-sample frames (25 ms) every 160 samples (10 ms), a
periodic Hann window, a 512-point FFT, 64 HTK mel bands from 125 to 7500 Hz, and the log with a small offset.
When I wrote it for Android I compared it with a NumPy port of Google's feature code on 13 clips: the same
number of frames, and a maximum difference of 1.1·10⁻³ in the log values. Here's the end of one frame:

```c
/* yamnet_tap.c, fe_frame() (lines 99-104) */
for (int k = 0; k < NBIN; k++) mag[k] = sqrtf(re[k] * re[k] + im[k] * im[k]);
for (int j = 0; j < NMEL; j++) {
    float s = 0;
    for (int k = 1; k < NBIN; k++) s += mag[k] * mel[k][j];
    out[j] = logf(s + 0.001f);
}
```

Why not on the NPU too: the original graph starts with `tf.signal.stft`, and RKNN has no STFT operator. A DFT
as an INT8 matrix multiply would quantise the spectrum before the log and lose the quiet bands, and the front
end costs about 0.14 ms per 10 ms frame on one A55 when the CPU is busy (around 0.51 ms live, when the CPU
clocks down between blocks). That's about 1.4 to 5 % of a core; not worth fighting for.

The rows go into a ring of 96. I store every row twice, at `row` and at `row + 96`, so the 96 newest rows are
always one contiguous block of memory and the window can be handed over without a wrap-around copy. A window
runs when there are 96 rows and 48 of them are new: 0.975 s of audio every 0.48 s.

```c
/* yamnet_tap.c (lines 244-246) */
if (total_rows >= PATCH && since >= PATCH_HOP) {
    since = 0;
    /* contiguous 96 rows ending at `row`: rows [row, row+96) of the doubled buffer hold them in order */
```

My first draft had a bug there. I subtracted 48 from the new-row counter instead of resetting it, so window 2
fired right after window 1 with only one new row in it. I caught it before the real runs.

### The INT8 input, by hand

The model is INT8 with an input zero point of 22 and a scale of 0.045939, both read from the model at start-up.
I quantise the patch myself and hand it over with `pass_through = 1`, which tells the runtime the bytes are
already in the model's format:

```c
/* yamnet_tap.c (lines 248-253) */
for (int i = 0; i < PATCH * NMEL; i++) {
    float v = roundf(src[i] / ia.scale) + ia.zp;
    q[i] = (int8_t)(v < -128 ? -128 : v > 127 ? 127 : v);
}
rknn_input in = { .index = 0, .buf = q, .size = PATCH * NMEL, .pass_through = 1,
                  .type = RKNN_TENSOR_INT8, .fmt = ia.fmt };
```

The obvious way is to pass the float patch and let librknnrt quantise it. I did that first on Android, and the
board's top-1 class matched the float model in only 22 % of windows; it gave the same two classes for silence
and for rock music. The FP16 model with the same runner was right every time, so the model wasn't the
problem. With one input channel, NCHW and NHWC are the same bytes, yet librknnrt 2.5.0 still converts a float
NCHW input wrongly when the model is INT8. NHWC works, and quantising myself works and is cheaper
(`inputs_set` 0.10 ms instead of 0.37 ms). The [NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }})
has the full comparison. On Linux I didn't even try the float path.

### Runtime, model and a first smoke test

The runtime is the Linux aarch64 `librknnrt.so` 2.5.0, fetched on the board from Rockchip's rknn-toolkit2
repo at the same commit I pinned for Android, with its sha256 checked by the fetch script. It lives next to
the binary (rpath `$ORIGIN/../ext`), so nothing gets installed system-wide. There was an older 2.3.0 runtime
lying around, and I didn't use it: the model was converted with toolkit 2.5.0, and a different runtime would
have made the comparison with Android meaningless. The model file is the one from the Android runs, and its
sha256 matched on the board. A smoke test with three seconds of zeros came first:

```
INIT api=2.5.0 (74ea630ce8@2026-09-30T09:41:17) drv=0.8.8 init_ms=45.9 input zp=22 scale=0.045939
WIN 0 t=0.02 npu_ms=5.16 fe_ms=0.14 Silence:1.00 Speech:0.00 Child speech, kid speaking:0.00 | avg3 Silence:1.00
```

Silence in, `Silence: 1.00` out: the whole numeric chain was right before any real audio went through it.

### Three clips, and the time to the first label

Then the three clips through `pw-play`, with the tap started first and the start time of each clip saved so I
could measure when the first real label came out. The first run lost its start marks: I had appended them to
the same log file the pipeline was writing through its own `>` redirect, and the pipeline's file offset wrote
right over them. The marks now go to a separate file.

```
piano : win=65 npu mean/min/max=5.05/4.92/5.35 ms | first non-silence +570 ms -> Music:0.95 | top1: Music 64, Silence 1
rock  : win=65 npu mean/min/max=5.00/4.48/5.18 ms | first non-silence +560 ms -> Music:0.93 | top1: Music 63, Silence 1, Buzz 1
speech: win=65 npu mean/min/max=5.04/4.54/5.39 ms | first non-silence +565 ms -> Speech:0.56 | top1: Speech 55, Eruption 5, Silence 2, Explosion 1
```

The first windows of the piano clip show how the labels come in. Window 0 still holds mostly silence from
before the clip; in window 1 "Music" is already 0.96 and "Electric piano" shows up; by window 2 "Piano" and
"Keyboard (musical)" are in the top 3:

```
WIN 1 t=1.51 npu_ms=4.55 Music:0.96 Electric piano:0.09 Piano:0.06 | avg3 Silence:0.50
WIN 2 t=1.98 npu_ms=5.05 Music:1.00 Piano:0.61 Keyboard (musical):0.54 | avg3 Music:0.65
```

### The governor trap

The labels were right, but look at `npu_ms`. Five milliseconds. On Android the same model took about 2 ms,
and for a while I thought the Linux NPU stack was just slower (it's an older driver, rknpu 0.8.8 on kernel
5.10 against 0.9.8 on 6.1). Then I read the NPU's devfreq node, `/sys/class/devfreq/fde40000.npu`. This
image's default governor is `rknpu_ondemand`, and a job of a millisecond or so every half second never
convinces it to clock up: `cur_freq` showed anything from 200 to 900 MHz depending on when I looked. I set
the governor to `performance` for the measurement, and the same windows took 1.44 ms:

```
rock3a$ sudo sh -c 'echo performance > /sys/class/devfreq/fde40000.npu/governor'
900000000 · npu mean/min/max 1.44 / 1.39 / 1.46 ms
```

![Milliseconds per YAMNet window, five ways]({{ '/assets/images/boards/rock3a/music_linux_npu_ms.png' | relative_url }})

The same 0.975 s window five ways: 45.68 ms on one CPU thread, 23.93 ms on four, 5.0 ms on the NPU at the
default governor, 2.05 ms on Android and 1.44 ms on Linux with the NPU pinned at 900 MHz.

### The CPU fallback

To know what the NPU is worth, I needed the same work on the CPU. I ran the float ONNX version of the same
patch model (input `[1, 1, 96, 64]`, the same graph the `.rknn` was converted from) with onnxruntime 1.19.2 on
the board, once on one thread and once on all four A55 cores:

```
RESULT cpu_onnx threads=1 ms mean=45.68 min=45.49 max=45.84 (input [1, 1, 96, 64])
RESULT cpu_onnx threads=4 ms mean=23.93 min=23.58 max=24.24
```

Even 45.7 ms every 480 ms would work for this demo, about 10 % of one core. The NPU's value here isn't that
the job becomes possible, it's that it becomes almost free and leaves the CPU for the beat tracking and the
LEDs that came next. Afterwards I put the governor back to `rknpu_ondemand`. Five milliseconds out of a 480 ms
budget is plenty for labels in a terminal; once the LEDs needed tight timing I pinned the clock only while the
demo runs.

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_music_linux_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_music_linux_169.mp4' | relative_url }}" type="video/mp4"></video>

*90 s of the same YAMNet pipeline a few days later, inside the LED demo of the [next post]({{ '/embedded/boards/rock3a/music-leds' | relative_url }}), with the sound taken out (the music was a YouTube song): the NPU card's top-3 labels and the scene change with the music.*

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

That part is done now: [32 LEDs that follow the music]({{ '/embedded/boards/rock3a/music-leds' | relative_url }})
takes this tap, adds a beat tracker that schedules flashes ahead of the beat, and drives two LED rings
straight from Linux spidev.

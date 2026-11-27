---
layout: default
title: "32 LEDs that follow the music: genre on the NPU, beats on the CPU, SPI on Linux"
short_description: "Whatever the ROCK 3A plays goes through YAMNet on the NPU and a beat tracker on the CPU, and comes out on two WS2812 rings driven straight from Linux spidev, with a demo window on the board's own desktop"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_leds_cover.jpg"   # 2026-11-24 cover, story_cover.py r3a_leds_cover
latest_release: "2026-11-27: plain English pass"
index: 19
publish: true
permalink: /embedded/boards/rock3a/music-leds
board_parent: rock3a
result: "Predicted beats latch the LEDs +0.12 ms (computed) after the click on average (max 3.55 ms, 76 beats), against ~16 ms for the reactive version; rock clip 27 of 28 windows rock; 3 of 3 drops"
edge_ai: true   # listed on /edge-ai/
edge_ai_index: 12
tags: [rockchip, npu, edge-ai, linux, led]
description: "Whatever the ROCK 3A plays goes through YAMNet on the NPU and a beat tracker on the CPU, and comes out on two WS2812 rings driven straight from Linux spidev, with a demo window on the board's own desktop"
date: 2026-11-24
last_modified_at: 2026-11-27
---

# 32 LEDs that follow the music: genre on the NPU, beats on the CPU, SPI on Linux

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![ROCK 3A cover, "32 LEDs, on the beat": +0.12 ms late, genre on the NPU, beats on the CPU]({{ '/assets/images/boards/rock3a/r3a_leds_cover.jpg' | relative_url }})

*The demo window on the board's desktop, and the number I'm proudest of: on average, a predicted beat lights the LEDs 0.12 ms after the click. I computed it from the clocks; I have no photodiode yet.*

## Situation

The [first Linux post]({{ '/embedded/boards/rock3a/music-linux' | relative_url }}) ended with a board that
could name what it was playing. YAMNet (a small sound-recognition model) ran on the RK3568's NPU. It listened
to a PipeWire monitor tap and printed "Music", "Piano" or "Speech" in a terminal. Nobody could see that
across the room.

On Android I already had it all: the same model chose the colours, a beat tracker found the beats, and
the SoC's hidden RISC-V core drove a WS2812 ring ([that story]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }})).
My second ROCK 3A runs Radxa's Debian 11, and two things were missing there. The MCU path needs a block of DRAM
that this kernel gives to Linux. And the HDMI output showed only a console, so I had no desktop for a demo.

My goal: play anything on the board (a YouTube video in Firefox, a test clip), and have LED rings react as
you'd expect. Slow colours for a piano. Hits for drums. Nothing at all when it's quiet. And the flashes on
the beat, not a little after it.

![Data flow from the sink monitor to the rings and the UI]({{ '/assets/images/boards/rock3a/leds_flow.png' | relative_url }})
*The whole chain as it runs now: audio as the desktop user, one bridge process on the CPU and NPU, one root
daemon that owns the SPI pin, two rings in one chain of 32, and the UI reading two files.*

## Task

Build it on Debian 11 with what's already on the board, and keep it clean enough to measure:

- no microphone: the sound comes from the sink monitor, so the LEDs get exactly what's playing;
- the same analysis core as the Android build (16 bands, beat tracker, the YAMNet scene table), built in
  unchanged, so both boards look the same and one fix works on both;
- Linux drives the LEDs itself: no MCU, no `/dev/mem` on the data path;
- no network listener anywhere: the ring takes commands through a root-only FIFO, the UI reads files;
- a demo window on the board's own HDMI desktop showing the real thing, not a simulation.

The board has no speaker on the bench, so most measurements below use synthetic clips: a 120 BPM click, a
build-up/drop track and a drum loop. I know their beat and hit
times, and they play in real time through the same code. I never put copyrighted music in a test file.

## Action

### A desktop, and sound without a microphone

HDMI showed only a login console. X crashed with `Failed to create pixmap` right after glamor (its
GPU drawing layer) started on the Mali-G52. The apt and dpkg logs show why. Radxa's APT key expired on
2025-03-02, so apt silently dropped the Radxa repositories. Then a normal `apt upgrade` on 2025-06-14 replaced
Rockchip's X server with Debian's. It lacks the glamor/GBM patches that libmali needs. One script
installs the new keyring, puts Rockchip's `xserver-xorg-core` on hold and turns glamor back on. It
has a `revert`, because the Rockchip build misses Debian's newer security fixes (X runs with
`-nolisten tcp`). Ignoring a fake `DSI-1` from the 7" panel overlay and setting `FlipFB "never"` took windowed
glmark2 from 21 to 57.

For sound, `pw-record` with `stream.capture.sink=true`, run as the desktop user,
hears exactly what the codec plays. A microphone would add room noise to every timing test. The ring daemon
needs root for `/dev/spidev3.0`, so the start script opens a root-only FIFO and runs the capture with `runuser`.
The bridge writes only features into it, never audio. I asked PipeWire for 10 ms blocks, but it kept a
1024-frame quantum (its processing block size). So blocks arrive in pairs: gaps of 0 ms ×212 and 21 ms ×146.
The effects don't care; the beat prediction did.

### Genre on the NPU: a clock that read 0, and rock that looked like "music"

YAMNet gets a new 96 × 64 patch every 0.48 s in a worker thread. A window took 4.6 to 5.9 ms. The reason:
`rknpu_ondemand` never raises the clock for a short job every half second (the trap from the first post). The UI's NPU clock card never moved either: devfreq's `cur_freq` reads 0 on this kernel. Only
`trans_stat` showed the truth, with its `*` on the 900 MHz row. There's no `userspace` governor, so the start
script sets `min_freq` to `max_freq` and puts it back on stop. With the clock fixed, a window takes 2.2 to
2.5 ms and the SoC stays at 54.4 to 60.0 °C. I haven't measured why the standalone tool is faster (1.44 ms).

![The scene decision]({{ '/assets/images/boards/rock3a/leds_scene.png' | relative_url }})
*From scores to scene. I changed the two yellow-dot boxes in this project: the group score is now a sum,
and sound that no group claims falls back to music after 8 windows.*

The 521 scores become one of 7 scenes. It changes only when the same group wins 3 windows in a row
(about 1.4 s). The rock clip broke this. YAMNet gave "Music" 0.95 to 1.00 but "Rock music" only 0.03 to 0.10.
The rest went to Punk rock, Grunge, Progressive rock and Guitar. The old rule took the best single class of each
group and checked it against a 0.04 bar. So the scene jumped rock → music → drums. A lower bar would let one
random class take over a song; adding up the group's classes doesn't. With the sum, rock
sits at 0.08 to 0.30 against a bar of 0.06. Over 28 windows the rock clip was rock in 27, the piano calm in 25
and the speech clip speech in 25. The misses are the first windows, where the
in-a-row rule still holds the previous scene.

The 120 BPM click had the opposite problem. "Clicking" belongs to no group, so after the speech clip the ring
stayed in the dim speech scene forever. Now, after eight unclaimed windows (about 4 s), it falls back to music.
Real silence turns the ring off: dark 2090, 2070 and 2137 ms after the music stopped, lit again
518 ms after the next clip started.

### Beats on time, drums apart

The beat tracker is the one from the Android build. On the 120 BPM click it reported 120.00 in every
status line from 5 to 40 s. Flashing when it fired, the frame latched about 16 ms after the click.
9.9 ms of that was just waiting for the block.

![One beat on a millisecond axis]({{ '/assets/images/boards/rock3a/leds_beat_timing.png' | relative_url }})
*The predicted beat (green) is planned from the beat grid and latches with the click. The reactive path (red)
only reads the block 9.9 ms after the click.*

The tracker already predicts the grid, so I plan ahead. It fires 100 ms early. I work out when that
grid point will sound and send the beat so the LEDs latch then. The hard part is the clock. PipeWire
delivers blocks in bursts, so the bridge looks at "read time minus block end" over 2 s and keeps the lowest
values. It then adds one quantum (21.33 ms) and the codec's output delay from ALSA (8.28 to 8.89 ms live). In
the first run every target was exactly +10.0 ms after its click. The onset only shows up once the next block
arrives, so the grid belongs to the block before the one I used:

```c
/* per-block loop: which block the grid belongs to (- 1 here put every beat +10.0 ms late) */
int64_t gblk = (int64_t)g_blocks - 2 + g_beat.lead;
int64_t target = mx_clock_at(&g_clk, gblk * MD_HOP);
```

After that fix, the daemon's own latch times over 76 beats were +0.12 ms on average and 3.55 ms at most. Live
through PipeWire, 36 beats gave +0.28 ms and 3.61 ms. A click track jumping from 120 to 140 BPM showed the
risk. The tracker needs about 5.5 s to follow. Unchecked, it sent ten beats 67 to 214 ms off. So the
bridge now scores its predictions against real onsets and sends them only while at least half hit.
Otherwise the onsets flash the ring directly. On the jump, it held back 12 predictions, and 60 of the
62 sent beats landed within 20 ms.

For the drums I split the same FFT with median-filtering HPSS (Fitzgerald 2010). HPSS splits the sound into a
smooth part and a sharp, percussive part, without waiting for future samples. Kick, snare and
hi-hat detectors run on the percussive part. The first version found 40 kicks, 36 snares and 53 hats in a
piano-only clip. Piano "hits" have almost nothing above 6 kHz and a weak low end. Gates on the band
ratios left 1 false kick and 1 false hat. With drums plus pad chords, kick and hat score 1.00 / 1.00,
but the snare finds only 24 % of the real hits. A drop detector for electronic music finds 3 of 3 drops in my
test track and none in the other clips, but I tuned it on that one generated track.

### 32 LEDs straight from spidev

On Android the RISC-V MCU drove the ring. To load it from Debian, I'd need `/dev/mem` on DRAM that this kernel
gives to Linux, and the kernel has `CONFIG_STRICT_DEVMEM=y`. SPI3 was simpler: MOSI on header pin 19,
MISO on pin 21. Radxa has a spidev overlay, and my LED library had a spidev port from the NanoPi.

![WS2812 bits as SPI bytes and one transfer]({{ '/assets/images/boards/rock3a/leds_ws2812_spi.png' | relative_url }})
*One SPI byte for each LED bit: 0xC0 is a 0, 0xF8 is a 1. Each transfer starts with a reset and is padded to
4096 bytes. The next one follows right away.*

I asked for 6.0015 MHz and measured 5.743 MHz, still inside the WS2812 timing windows:

```
rock3a# ./board/ring status
  T0H 348 ns (2 slots, spec 273..393)  T1H 870 ns (5 slots + gaps, spec 773..893)
  period on the wire 1400 ns (spec 1033..1633), of which 8 slots are 1393 ns
fps 60 target, 162.9 measured, 0 late; render 10 us (max 130), frame on the wire 6391 us (384 bytes)
```

The ring's DO (data out) goes back to pin 21, so I can check what the last LED passed on. The first checks were
almost all bad. The first ring board pulls DI up through about 1.3 kΩ. Between two `ioctl`s the pad floats
high. LED 0 reads an extra "1", and every frame lands one bit late. A reset of zero bytes at the start of
each transfer throws the extra bit away. Without it, 2328 of 2400 test bytes came back wrong; with
800 µs, only 2 to 7. A second problem I never explained: after 12 ms of idle line, the next two frames were
lost. So the stream never stops now. LED 0 still pulsed in brightness. A GPIO guard fixed that, but then the
same board held DO high almost all the time. A WCMCU 2812B-16 module with no pull-up gave 12000 of 12000 bytes
right over 500 checks at full brightness, and the flicker was gone.

Both rings run from the header's 3.3 V pin, out of spec for 5 V parts. On the old ring the errors grew
with brightness: 1038, 89 and 2 wrong bytes of 2400 at 64, 32 and 16. I estimate full white on 32 LEDs at about
1.9 A, so the daemon scales down any frame whose estimate goes over 500 mA. That cap made the first kick flash
look dim. A pastel colour lights all three channels, so the frame got scaled down: the drum ring was lit
only 30 to 60 ms per beat at about 28 %. A strong, pure colour and a slower fade brought it to about 150 ms per
beat. I also limit full-ring flashes to three a second, following WCAG 2.3.1. I chose that limit; I didn't measure it.

The second ring sits on the same chain. In the default `split` layout, ring A shows the scene's effect. I
rewrote the effects from how WLED, LedFx and scottlawsonbc's effects behave (no code copied). And ring B shows
only the drums: a piano keeps B dark, a drum loop flashes it on every kick.

### A demo window that shows the wire

The UI is one GTK3 window drawn with cairo on the board's XFCE desktop: one card per stage, reading two
files, no sockets. My first LED card drew the effect's pixels and didn't look like the rings. So
the daemon now writes its wire buffer: the bytes after brightness, gamma, the power cap and the GRB order.
`ring mirror` decodes the SPI stream it just sent to check it. It got 48 of 48 bytes in three runs out of
three (one ring). At 20 fps the window uses 25 to 27 % of a core.

![The demo UI during a piano clip]({{ '/assets/images/boards/rock3a/leds_ui_music.png' | relative_url }})
*The UI with the piano clip and a YouTube tab behind it: Music 1.00 / Piano 0.47, scene "Êm (piano)" (calm),
NPU 1.95 ms per window at 900 MHz, LED-to-predicted-beat +0.2 ms. The BPM and "phản xạ" (reactive) show that the
tracker isn't sure about solo piano.*

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_music_leds_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_music_leds_169.mp4' | relative_url }}" type="video/mp4"></video>

*The demo on the bench: the first 2:13 of one take, no edits. Music plays on the board and the UI shows each stage live (the tempo card reads 120.0 on the click track). The two rings follow: one shows the genre effect, the other the drum flashes.*

The rings follow the music. The number I care about most is the timing: on average a predicted beat latches
the LEDs **0.12 ms** after the click (max 3.55 ms over 76 beats). The reactive version was about 16 ms late.
Through live PipeWire, with the computed sound clock, it's +0.28 ms on average and 3.61 ms max over 36 beats.

| What | Measured |
|---|---|
| Tempo on a 120 BPM click | 120.00 in every status line 5 to 40 s; median beat gap 500.0 ms (74 beats) |
| LED latch vs click | reactive ~+16 ms → predicted +0.12 ms mean, 1.49 ms mean abs, 3.55 ms max (76) |
| Tempo jump 120 → 140 BPM | 12 predictions held; 60 of 62 sent beats within 20 ms |
| Scene, 28 windows per clip | rock 27 rock (was flipping), piano 25 calm, speech 25 speech |
| Click after speech | stayed "speech" forever → music after ~4 s, ring B flashes every 0.5 s |
| Drops in the test track | 3 of 3 (+20, +40, +250 ms); decoy 0; piano / rock / speech / clicks 0 |
| Drum hits, drums + pad | kick 1.00 / 1.00, hat 1.00 / 1.00, snare 0.57 / 0.24 |
| Silence | ring off 2.07 to 2.14 s after the music stops, on again 518 ms after it starts |
| Beat flash on ring B | 30 to 60 ms at ~28 % → about 150 ms per beat |
| NPU per window | 4.6 to 5.9 ms (governor) → 2.2 to 2.5 ms pinned at 900 MHz, SoC 54 to 60 °C |
| WS2812 from spidev | old ring LED 0: 43 / 64 stray highs per 10 s → new module 0; 12000 / 12000 bytes right |
| UI mirror | 48 of 48 bytes = the SPI stream just sent (3 of 3) |
| CPU | bridge 13.7 to 14.3 %, ring daemon ~5 %, UI 25 to 27 % at 20 fps |
| Desktop | glmark2 windowed 21 → 57, 1080p30 H.264 on the VPU at 9.1 % CPU |

![The UI in silence with both rings]({{ '/assets/images/boards/rock3a/leds_ui_silence.png' | relative_url }})
*Silence: Silence 1.00 on the NPU, the scene pill reads "Im lặng" and the LED card "LED tắt" (ring off). Both
rings are drawn from the wire bytes, at about 32 mA.*

What I didn't prove. Every timing above is computed. The sound time comes from the graph clock, one quantum and
the ALSA delay; the LED time from the daemon's own record of each transfer. There's no photodiode on a
LED and no microphone on the jack, so I haven't measured light against real sound. The snare is weak: 24 %
recall with a pad playing, and I haven't tested it on real music. I tuned the drop detector on one generated
track. No colour check used a camera. The proof is the DO readback and the wire bytes. They prove the
data, but say nothing about how a 3.3 V-fed LED shows blue. The single module passed the 500-run check; the
32-LED chain hasn't had it yet. And it all runs on Radxa's Debian 11; I haven't finished the port to my
own Debian 13 image.

## What I'd do next

I'd put a photodiode on one LED and the jack into a logic analyser, and play the 120 BPM click. That would make
the 0.12 ms a measured number, or show what my clock misses. A 74AHCT125 and a 5 V supply would fix the
3.3 V problem and let me drop the 500 mA cap. The snare needs a better feature than a band ratio. Then I'll move
to Debian 13: the same build script, with spidev on SPI3 in my own device tree instead of Radxa's overlay.

---
layout: default
title: "32 LEDs that follow the music: genre on the NPU, beats on the CPU, SPI on Linux"
short_description: "Whatever the ROCK 3A plays goes through YAMNet on the NPU and a beat tracker on the CPU, and comes out on two WS2812 rings driven straight from Linux spidev, with a demo window on the board's own desktop"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_leds_cover.jpg"   # 2026-11-24 cover, story_cover.py r3a_leds_cover
latest_release: "2026-11-24: two rings, predicted beats, drum layer, demo UI"
index: 19
publish: true
permalink: /embedded/boards/rock3a/music-leds
board_parent: rock3a
result: "Predicted beats latch the LEDs +0.12 ms after the click on average (max 3.55 ms, 76 beats), against ~16 ms for the reactive version; rock clip 27 of 28 windows rock; 3 of 3 drops"
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
*The demo window on the board's desktop next to the number I'm proudest of: a predicted beat lights the LEDs 0.12 ms after the click on average.*

## Situation

The [first Linux post]({{ '/embedded/boards/rock3a/music-linux' | relative_url }}) ended with a board that
could name what it was playing. YAMNet ran on the RK3568's NPU, fed from a PipeWire monitor tap, and printed
"Music", "Piano" or "Speech" into a terminal. Nobody could see that from across the room.

On Android I'd already had the full show: the same model choosing colours, a beat tracker, and a WS2812 ring
driven by the SoC's hidden RISC-V core ([that story]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }})).
The second ROCK 3A runs Radxa's Debian 11 instead, and two things were missing there. The MCU path needs a
block of DRAM that this kernel hands to Linux, and the HDMI output showed nothing but a console, so there was
no desktop to put a demo window on.

What I wanted in the end: play anything on the board (a YouTube video in Firefox, a test clip), and have LED
rings react to it the way a person would expect. Slow colours for a piano, hits for drums, nothing at all
when it's quiet, and the flashes on the beat, not a little after it.

![Data flow from the sink monitor to the rings and the UI]({{ '/assets/images/boards/rock3a/leds_flow.png' | relative_url }})
*The whole chain as it runs now: audio as the desktop user, one bridge process on the CPU and NPU, one root
daemon that owns the SPI pin, two rings in one chain of 32, and the UI reading two files.*

## Task

Build it on Debian 11 with what's already on the board, and keep it honest enough to measure:

- no microphone: the sound comes from the sink monitor, so what the LEDs see is exactly what's playing;
- the same analysis core as the Android build (16 bands, beat tracker, the YAMNet scene table), compiled in
  unchanged, so both boards look the same and a fix lands on both;
- the LEDs driven from Linux itself, no MCU, no `/dev/mem` on the data path;
- no network listener anywhere. The ring takes commands through a root-only FIFO, the UI reads files;
- a demo window on the board's own HDMI desktop that shows the real thing, not a simulation of it.

The board itself sits on the bench without a speaker. Most measurements below use synthetic clips (a
120 BPM click, a build-up/drop track, a drum loop) played in real time through the same code, because those
have known beat and hit times. Copyrighted music never went into a test file.

## Action

### 1. A desktop first: why X didn't start, and the glamor fix

The HDMI output showed a login console and lightdm kept restarting. The X log ended with
`(EE) modeset(0): Failed to create pixmap`, right after glamor had initialised on the Mali-G52. The quick way
out is `AccelMethod none`, which works with the CPU drawing everything, but the demo needs the GPU for the
video in Firefox and for the UI, so I went looking for what had changed.

The apt and dpkg logs told the story. Radxa's APT key from 2023 expired on 2025-03-02. From then on apt
silently dropped both Radxa repositories (`NO_PUBKEY`), so the pin that kept Rockchip's own X server in place
(`rockchip-bullseye`, priority 1001) had nothing left to pin. On 2025-06-14 a routine `apt upgrade` by the
board's previous owner replaced Rockchip's X with Debian's `2:1.20.11-1+deb11u15`. The Debian build doesn't
have the glamor/GBM patches libmali needs, so it falls over when it allocates its first pixmap.

```
rock3a$ gpg --show-keys /usr/share/keyrings/radxa-archive-keyring.gpg
pub   rsa3072 2023-03-03 [SC] [expired: 2025-03-02]
rock3a$ zcat -f /var/log/dpkg.log* | grep xserver-xorg-core
2025-06-14 10:35:16 upgrade xserver-xorg-core:arm64 2:1.20.11-1+deb11u3 2:1.20.11-1+deb11u15
```

The fix is three steps in one script: install `radxa-archive-keyring` 0.2.2 (its sha256 checked against the
entry in Radxa's own Packages file before `dpkg -i`), reinstall `xserver-xorg-core` 2:1.20.11-1 from the Radxa
repo with `apt-mark hold`, and put `AccelMethod glamor` back. There's a trade-off and I wrote it into the
script: the Rockchip build is older than Debian's security updates of the X server. X runs with
`-nolisten tcp` here, so only local clients talk to it, and the script has a `revert` that brings Debian's
build back if I ever want those fixes more than the GPU.

After that, GLES ran on the Mali (`GL_RENDERER: Mali-G52`) but windowed glmark2 scored 72, then 21, with 40
"flip timeout" lines in the X log. The image had the Raspberry Pi 7" display overlay enabled with no panel
attached, so X drove a second CRTC for a `DSI-1` that never finished a flip. `Option "Ignore"` on that monitor
stopped it (`"Enable" "false"` parsed and did nothing). Then every test sat at exactly 29 to 30 fps: the
modesetting driver's `FlipFB "always"` was pinning the GL clients to half of 59.8 Hz. With `FlipFB "never"`
windowed glmark2 went to 57, one frame per vsync. Off-screen it scores 537.

While I was there I measured the video decoder, because the demo plays YouTube in the background:

| 1080p30 playback | CPU (400 % = 4 cores) | fps |
|---|---|---|
| H.264, `mppvideodec` (VPU) | 9.1 % | 29.3 |
| H.264, `avdec_h264` (software) | 162.5 % | 28.8 |
| HEVC, `mppvideodec` (VPU) | 9.7 % | 29.5 |
| HEVC, `avdec_h265` (software) | 162.5 % | 12.1, can't keep up |

The panel overlay caused one more problem later. A reboot hung right after `panel disable` with an RCU stall,
and only the 10-minute hardware watchdog brought the board back. When I switched on the SPI overlay for the
LEDs (section 9) I switched the panel overlay off in the same step, and the next reboot took about 66 s.

### 2. Audio without a microphone

The capture is the same idea as in the first post: `pw-record` with `stream.capture.sink=true` gets connected
to the sink's monitor, which is whatever the rk809 codec is playing, from any application. It writes raw s16
to stdout and my bridge reads it from stdin. The other way would be a microphone in front of a
speaker. That adds the room (and my voice) to every test, and the speaker and the air to the beat timing, so I
never tried it.

There's a permission split to sort out. PipeWire runs per user, so the capture has to run as the desktop user.
The ring daemon needs root for `/dev/spidev3.0`. So the start script opens the root-only FIFO as root and runs
the pipeline under `runuser`:

```sh
# start script: PipeWire capture piped into music_ring
"pw-record -P stream.capture.sink=true --rate 48000 --channels 2 --format s16 --latency 10ms - \
 | exec '$HERE/bin/music_ring' --dir '$HERE/model' $MR_ARGS" >"$F" 2>"$L"
```

`--latency 10ms` asks for one 480-frame block per wake-up, the hop my DSP wants. PipeWire didn't give it to
me. `pw-dump` reported `clock.quantum` 1024, because Firefox had asked for `node.latency` 3600/48000 and the
ALSA period was 1024. The blocks still arrive in 480-frame pieces, but in pairs: over 400 blocks the gap
histogram was 0 ms ×212, 21 ms ×146, 22 ms ×30. For the LEDs this doesn't matter much, the effects run on their
own clock. For the beat prediction it matters a lot, and section 5 shows how I turned that into a correction
instead of fighting it.

What the bridge writes is only features, never audio: one `audio` line per 10 ms block (16 band levels,
beat flags, drum hits, energy, the scene colours, a timestamp, build/drop state), an `fx` line when the
scene changes, and `beat <flags> <target_ns>` lines from a scheduler thread. A line that doesn't fit into the
FIFO (daemon stuck) is dropped and counted. A stale LED block is worth nothing, and blocking there would stall
the audio read. In the runs I logged, `dropped=0`.

### 3. The NPU: one worker thread, and a clock I couldn't read

The YAMNet part is the first post's code moved into a thread. Every 0.48 s the log-mel front end has a new
96 × 64 patch; the main loop hands it to the NPU worker unless the worker is still busy, in which case the
patch is skipped and counted (newest window wins, the same rule as on Android). The worker quantises the patch
itself and passes it through, because this runtime gives garbage for float input on an INT8 model (the details
are in the [NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }})):

```c
/* npu_thread(): quantise the patch to INT8 */
for (int i = 0; i < MD_PATCH * MD_NMEL; i++) {          /* q = round(x / scale) + zp, clamped */
	float v = roundf(src[i] / ia.scale) + ia.zp;
	q[i] = (int8_t)(v < -128 ? -128 : v > 127 ? 127 : v);
}
...
rknn_input in = {.index = 0, .buf = q, .size = sizeof q, .pass_through = 1, .type = RKNN_TENSOR_INT8,
		 .fmt = ia.fmt};
```

Skipped windows stayed at 0 in every run, and the NPU took 4.6 to 5.9 ms per window. That's the governor trap
from the first post again: `rknpu_ondemand` never clocks up for a 2 ms job every half second. The new twist
came from the UI. I had a card that showed the NPU clock, and the number in it never moved. It couldn't: on this kernel `/sys/class/devfreq/fde40000.npu/cur_freq` reads 0. The
driver's debugfs `rknpu/freq` showed 198 MHz at rest and then also 0 once I had pinned the clock. The one
reading that told the truth was devfreq's `trans_stat`, with its `*` on the 900 MHz row and 925 mV.

There's no `userspace` governor on this kernel, so the start script pins the clock by raising `min_freq` to
`max_freq` and puts the old value back on stop:

```sh
# start script: pin the NPU clock, restore it on stop
[ -f "$NPUSAVE" ] || cat "$NPU/min_freq" > "$NPUSAVE"
cat "$NPU/max_freq" > "$NPU/min_freq" 2>/dev/null || true
...
[ -f "$NPUSAVE" ] && cat "$NPUSAVE" > "$NPU/min_freq" 2>/dev/null && rm -f "$NPUSAVE"
```

Pinned, a window takes 2.2 to 2.5 ms instead of 4.6 to 5.2, and the SoC stays at 54.4 to 60.0 °C with the UI and
a video running. After `stop`, `min_freq` was back at 200000000. A small root sampler writes the clock source,
load and temperature to `/run/r3a_npu` twice a second, because the UI runs as a normal user and can't read
debugfs. I don't know why the bridge needs 2.2 ms when the standalone tool from the first post did 1.44 ms at
the same clock; the bridge's other threads are busy at the same moment, but I haven't measured that.

### 4. From 521 classes to 7 scenes

YAMNet gives 521 AudioSet scores per window. The LEDs need one decision that doesn't flicker. The scene logic
lives in the shared core and has four stages: average the scores over the last 3 windows, map classes into
groups (22 ranges of class ids: percussion and drum classes to *drums*, guitars and rock genres to *rock*,
synthesizer and house/techno/EDM to *electronic*, piano, organ, strings and classical to *calm*, singing and pop
to *vocals*, speech classes to *speech*), apply a short list of rules, and only switch when the same new group
wins 3 windows in a row (about 1.4 s).

![The scene decision]({{ '/assets/images/boards/rock3a/leds_scene.png' | relative_url }})
*Scores to scene. The two yellow-dot boxes changed during this project: the group score is now a sum, and
unclaimed sound falls back to music after 8 windows.*

The interesting part was the rock clip. YAMNet is good at instruments and weak at genres, and on this board it
gave "Music" 0.95 to 1.00 for the whole clip but "Rock music" only 0.03 to 0.10. The rest of the rock evidence was
spread thinly over Punk rock, Grunge, Progressive rock and Guitar, 0.02 to 0.06 each. The old rule took the best
single class of each group and needed 0.04, so the best rock class sat right on the line, and the scene flipped
rock → music → drums. In the demo that looked like "I play rock and the NPU says generic music".

I thought about lowering the threshold, but 0.04 is already tiny, and a lower bar would let one stray class
take over a song. A group, though, is a set of related classes, and their scores add up. So the group score is
now the sum of its members:

```c
/* md_scene_push(): a group scores the best of its members */
float best_member[MG_COUNT];
for (int g = 0; g < MG_COUNT; g++) best_member[g] = 0;
for (int k = 0; k < MD_NCLS; k++) {
	int g = class_group(k);
	if (g == MG_NONE) continue;
	s->group_score[g] += s->avg[k];
	if (s->avg[k] > best_member[g]) { best_member[g] = s->avg[k]; topc[g] = k; }
}
```

Summed, the rock group is 0.08 to 0.30 for the whole clip, and the bar moved to 0.06 on the sum. Over 28 windows
the rock clip was rock in 27, the piano calm in 25 and the speech clip speech in 25. The windows that missed are
the first ones of each clip, where the hysteresis still holds the previous scene. That's by design. The best
member is still kept, because the UI and the log show the most specific class.

The second fix came from the 120 BPM click. A click is "Clicking" or "Tick" to YAMNet, no group claims it and
Music stays under 0.3, so the old code kept whatever scene was on before, forever. After the speech clip that
meant the speech scene: a dim VU, drum layer off, and a ring that didn't react to a perfectly clean beat. Now
eight unclaimed windows in a row (about 4 s) fall back to the generic music scene:

```c
/* md_scene_push(): fall back to the music scene */
if (win == MG_NONE) {
	if (++s->none_n >= 8) win = MG_MUSIC;
} else {
	s->none_n = 0;
}
if (win == MG_NONE || win == MG_SILENCE) { s->cand_n = 0; return 0; }
```

Silence still keeps the scene, since a pause between two songs shouldn't reset the colours. It does turn the
ring off, though. The bridge sets an off flag after 2 s with the block energy under its floor *and* YAMNet's top
class being Silence. The daemon fades to black in about 0.2 s and keeps sending black frames. Measured three
times, the ring went dark 2090, 2070 and 2137 ms after the music stopped, and lit again 518 ms after the next
clip started.

### 5. Beats: a tracker, a sound clock and a scheduler

The beat tracker is the one I wrote for the Android build. Every 10 ms block goes through a 1024-point FFT;
the positive spectral flux above its slow mean is the onset curve. Every 250 ms an autocorrelation of the last
8 s of that curve (with a gentle prior around 120 BPM) gives the period, and every frame a comb over the next
8 periods finds the phase of the beat grid. Downbeats come from where the bass onsets pile up in the bar. On the
120 BPM click it reports `bpm=120.00` in every 5-second status line from 5 to 40 s, with the median gap
between beats at 500.0 ms over 74 beats:

```
[ 4511.702] BEAT 1 down=1 bpm=120.00 t_ns=4511701874852
[ 4512.202] BEAT 2 down=0 bpm=120.00 t_ns=4512202217246
[ 4517.282] STAT t=10 s bpm=120.00 conf=0.90 beats=12 (+10) scene=music fx=audio_spectrum windows=19 skipped=0 npu_ms=4.68 cpu=5.6% lines=985 dropped=0
```

On a live YouTube remix it settled at 129.0 to 130.7 BPM. I have no ground truth for that one, so it only
says the tracker locks onto something steady.

The first version flashed when the tracker fired. I measured that chain in file mode: the bridge reads the
block holding the click 9.9 ms after the click (mean of 68 beats, max 11.4), the daemon has parsed the line
3.5 to 4.6 ms later, and the frame carrying the flash latches about 16 ms after the click. Sixteen
milliseconds sounds small, but next to a kick drum you can feel it, and on Android the same design had been
much worse (around 50 ms through the MCU).

![One beat on a millisecond axis]({{ '/assets/images/boards/rock3a/leds_beat_timing.png' | relative_url }})
*The anticipated beat (green) is scheduled from the predicted grid and latches with the click; the reactive
path (red) only reads the block 9.9 ms after the click.*

Since the tracker already predicts the grid, the obvious idea is to stop reacting and schedule: fire the
tracker 100 ms ahead of each grid point, work out when that grid point will actually come out of the jack,
and send the beat so the LEDs latch at that moment. It works like a software PLL, with the tracker as the
oscillator and the onsets as the phase detector. The hard part is the clock. I need the wall time at which a
given audio sample *sounds*, and PipeWire hands me blocks in bursts. The bridge takes the lower envelope of
"read time minus block end" over 2 s, which removes the burst jitter, and adds two delays: one capture quantum
(21.33 ms at 1024 frames) and the codec's output delay, read from the ALSA status file and smoothed (8.28 to
8.89 ms live).

```c
/* mx_clock_push() / mx_clock_at(): sample clock against wall clock */
c->env[c->n % 200] = read_ns - end_sample * 1000000000LL / MD_RATE;
c->n++;
int64_t m = c->env[0];
int lim = c->n < 200 ? (int)c->n : 200;
for (int i = 1; i < lim; i++) if (c->env[i] < m) m = c->env[i];
c->a_ns = m + c->qoff_ns + c->dout_ns;
...
return c->a_ns + sample * 1000000000LL / MD_RATE;
```

A scheduler thread holds up to 16 pending beats and sleeps on a condition variable until 5 ms before each
target, 5 ms being the measured "line to latch" time of the daemon. It counts a send as late when it wakes more
than 2 ms after its time. That counter stayed at 0.

The first anticipating run put every target exactly +10.0 ms after its click. Exactly one block, every beat.
The tracker's grid frame is the block *after* the onset block, because the onset's flux only shows once the
next block is in, and I had taken the grid block itself. One `- 2` instead of `- 1`:

```c
/* per-block loop: which block the grid belongs to */
int64_t gblk = (int64_t)g_blocks - 2 + g_beat.lead;
int64_t target = mx_clock_at(&g_clk, gblk * MD_HOP);
```

After that the predicted times were +0.08 ms from the clicks on average, all 68 within 10 ms. The daemon then
measures where its frame actually latched (transfer start + lead + data + 280 µs). Over 76 beats: mean +0.12 ms,
mean absolute error 1.49 ms, max 3.55 ms. Live through PipeWire, with the real quantum and ALSA delay in the
clock, 36 beats gave +0.28 ms mean and 3.61 ms max.

A prediction is only as good as the tempo, so I had to decide what happens when the music changes speed. I
made a click track that jumps from 120 to 140 BPM at 20 s. The tracker needs about 5.5 s to follow. Without any
check it kept sending 120 BPM beats until 25.8 s, ten of them 67 to 214 ms off, which looks worse than
reacting late. So the bridge scores its own predictions against the onsets that really happen (±35 ms,
exponential average 0.3) and only sends while that score is at least 0.5:

```c
/* locked(): send beats only while the grid hits onsets */
static int locked(void) { return g_beat.conf >= g_conf_min && g_beat.period > 0 && g_hit >= 0.5f; }
...
			if (g_onset_t[k] && llabs(g_onset_t[k] - g_chk[i]) <= 35000000LL) hit = 1;
		g_hit += ((float)hit - g_hit) * 0.3f;
```

While it isn't locked, the percussive onsets flash the ring directly (reactive, a few ms late, but at least on
a real hit). On the tempo jump, 12 predictions were held back, and of the 62 beats that were sent 49 landed within
10 ms and 60 within 20 ms. Two were 142.8 ms off; I haven't looked at which ones.

One more case I only noticed by looking: on the 120 BPM click the ring didn't flash at all. The click has no kick and no
snare, and by then predicted beats were only sent when drums were present (the drum layer, section 6), so
nothing was sent. A locked beat without drums now goes out as a soft pulse (level 170 instead of 255), except in
the calm and speech scenes, where the piano test must stay without flashes.

### 6. Drums apart from the melody: HPSS and three bands

What I wanted next was a combined effect: when there are drums, the LEDs go on and off with them, and another
effect follows the rest of the music. That needs the drums separated from everything else, every 10 ms, with no
look-ahead. I used median-filtering HPSS (Fitzgerald 2010) on the same FFT the DSP already computes: for each
bin, the median over the last 17 frames (170 ms) is the harmonic estimate, the median over 17 neighbouring
bins (800 Hz) in this frame is the percussive one, and a soft mask P² / (H² + P²) splits the power. The time
median is causal, so it adds no delay, at the cost of seeing note attacks as percussive for a few frames.

The percussive power is then summed in three bands with their own onset detectors: kick below 150 Hz (bins 1
to 3), snare 150 Hz to 2 kHz, hi-hat above 6 kHz. A hit is a jump of 6 dB (hat 5 dB) over the last two frames,
within 35 dB of the band's slow peak, with a refractory time of 100 / 80 / 50 ms. The base effect gets the
other half: each of the 16 band levels times the square root of its harmonic share.

The first version fired 40 kicks, 36 snares and 53 hats on a clip with only a piano in it. I logged the band
ratios of every hit and found that piano "hits" have almost nothing above 6 kHz (snare/hat ≥ 7·10⁴) and a weak
low end, while real kicks have kick/snare ≥ 0.6. The gates in the code are those measurements:

```c
/* mx_hpss_push(): the kick and snare gates */
const float ks = db3[0] / (db3[1] + 1e-20f), sh = db3[1] / (db3[2] + 1e-20f);
const int gate[3] = {ks >= 0.7f, sh >= 1.0f && sh <= 1000.0f && ks <= 3.0f, sh <= 1000.0f};
```

With the gates, the piano clip gives 1 false kick, 0 snares and 1 false hat. I scored three generated 20 s
clips at 110 BPM with a ±40 ms window:

| Clip | kick P / R | snare P / R | hat P / R |
|---|---|---|---|
| piano only | 1 false kick | none reported | 1 false hat |
| drum loop | 1.00 / 1.00 | 0.57 / 0.76 | 1.00 / 1.00 |
| drums + pad chords | 1.00 / 1.00 | 0.57 / 0.24 | 1.00 / 1.00 |

P is how many reported hits were real, R how many real hits were found. The snare is the weak one, and with a
pad playing it misses three out of four. Kick-only beats have kick/snare ratios of 2.2 to 6.6 and true snares
0.6 to 3.3, so the bands overlap and any threshold trades one error for the other: ≤ 3.0 gave 23 snares on the
drum loop and 7 on the mix (17 true), ≤ 4.0 gave 30 and 11. I left it at 3.0 and haven't measured the snare on
real music at all.

When the beat is locked and drums are present (at least 2 kick or snare hits in the last 2 s), the kick bit is
dropped from the line: the predicted beat *is* the kick flash then, on time instead of ~16 ms late.

### 7. Build-up and drop

For electronic music I wanted the moment everyone waits for. A build-up here means treble rising by at least
4 dB over about 3 s while the kick is gone (bass below 30 % of its 8 s level). A drop is a percussive onset with
the bass back at least 4 times (6 dB) over its minimum of the last second, during a build or up to 3 s after,
at most once every 6 s. On the ring a build dims the effect to 40 % with a white dot running round faster and
faster, and the drop is a white flash fading through a spinning rainbow over about 1.5 s.

The first detector found all 3 drops in my test track, but it also found 3 builds and a drop in the Beethoven
piano clip (bass notes after a bright passage) and one of each in a speech recording. Two conditions fixed
that. A build also needs the sound to be at least 30 % percussive over 1 s, because risers and snare rolls are
noise and hits while a crescendo on a piano is harmonic; the builds in my track measured 0.35 to 0.36. And a
drop needs a percussive onset within 5 frames:

```c
/* mx_drop: the drop detector */
const int kick_gone = x->bass_s < 0.3f * x->bass_base;
if (x->rise_db >= 4 && kick_gone && x->perc_share >= 0.30f) {
	...
if (after_build && x->frame - x->build_since >= 150 && x->frame - x->drop_last > 600 && x->since_onset <= 5 &&
    x->bass_s > 4 * bmin && x->bass_s > 0.5f * x->bass_base) {
```

Now it finds 3 of 3 drops, 20, 40 and 250 ms after the real ones, and 0 on a decoy section that gets 9 dB louder
without a build. The piano, rock and speech clips and both click tracks give 0 builds and 0 drops. All of this
is tuned on one generated track, so I'd call it "works on my test", not "detects drops".

### 8. Layers, effects and a flash limit

The ring daemon is the one from my NanoPi 2 Fire, with the four music effects of the MCU build ported into it
behind a compile flag, so the other boards' builds don't change. Its frame loop sends a frame every ~5.7 ms,
which would make every "per frame" decay of the MCU effects 3.5 times faster and turn fades into flicker. So
the state steps once per 20 ms of wall time, and each frame only draws the current state.

Each frame has two layers. The base layer is the scene's effect, fed by the harmonic band levels. The drum
layer goes on top: a kick lights the whole ring in the scene colour, a snare every other LED in the opposite
hue, a hat three white LEDs. The two are combined channel by channel with a max, and the daemon keeps base,
drums and the composite apart so the output layout can put them on different rings (section 11).

The base effects came from a research pass over open-source music-reactive LED projects. Only three survived
verification against their code: WLED's audio-reactive effects, LedFx and scottlawsonbc's audio-reactive-led-strip.
They are EUPL-1.2, GPL-3.0 and MIT, so I read how each effect behaves and wrote it again in the daemon's integer
style; no code was copied. Each scene now has its own base effect:

```c
/* kSceneFx: the base effect of each scene */
[MG_DRUMS] = "fx_ripple",       /* hits ripple round the ring */
[MG_ROCK] = "fx_grav",          /* a loud VU with a falling peak */
[MG_ELECTRONIC] = "fx_bar",     /* a beat-locked wipe */
[MG_CALM] = "audio_wave",       /* slow wave (piano, strings) */
[MG_VOCALS] = "fx_energy",      /* bass / mid / treble bars */
[MG_MUSIC] = "fx_power",        /* spectrum + bass bar + sparks */
[MG_SPEECH] = "audio_vu",       /* dim white VU */
```

*fx_ripple* follows WLED's Ripple Peak: each hit starts a ripple at a random LED that spreads both ways and
wraps round the ring. *fx_grav* is WLED's Gravcenter, a VU bar mirrored about the centre with a peak dot that
jumps up and falls back one LED at a time. *fx_bar* is LedFx's Bar, a 4-LED wipe per beat whose position comes
from the beat phase through an ease-out curve, not from loudness. *fx_energy* is scottlawsonbc's Energy, red,
green and blue bars from bass, mid and treble, blurred with [1 2 1]. *fx_power* is LedFx's Power: a dim
spectrum, a bass bar and sparks on hats and snares. LedFx computes its spark count as pixels / 20, which is zero
on 16 LEDs, so mine fires 2 per hit. Two more (a scrolling three-band history after WLED's DJ Light, and LedFx's
BPM Strobe) are there but only on request. All level-driven values use a fast-attack, slow-release filter (rise
0.8, decay 0.1 per 20 ms tick), and drawing a frame takes 2 to 5 µs.

A ring that flashes in full on every kick at 180 BPM is the kind of thing that can trigger a photosensitive
seizure. The usual guideline is no more than three flashes a second (WCAG 2.3.1); my research pass didn't verify a
source for that number, so it's a cap I chose, not one I measured. Every full-ring flash goes through one gate:

```c
/* afxFullFlashOk(): at most three full flashes a second */
bool afxFullFlashOk(uint32_t now)
{
    if (g_full_ms && now - g_full_ms < 333) { g_full_refused++; return false; }
    if (g_full_ms && now - g_full_ms < g_full_min_gap) g_full_min_gap = now - g_full_ms;
    g_full_ms = now;
    g_full_n++;
    return true;
}
```

A refused kick becomes a snare-style flash on every other LED, so the beat still shows.

Even with the soft beats, the flashes on the 120 BPM click were hard to see. I sampled the wire bytes during the
click and the drum ring was lit for 30 to 60 ms per beat at about 28 % of full. Two reasons. The decay took the
kick from 255 to 0 in about 80 ms, barely a blink. And the kick colour was a pastel (half
saturation), which lights all three channels; 16 LEDs of that went over the 500 mA power cap (section 10), and
the library then scaled the whole frame down. Now the kick decays by 24 per step (about 210 ms to zero, still
well inside a 500 ms beat), the colour is fully saturated (roughly a third of the current), and each beat also
starts a ripple on the base ring, which had stayed almost dark on a click track. The drum ring now lights about 150 ms
per beat.

### 9. The WS2812 signal straight from Linux spidev

On Android the ring ran on the RISC-V MCU. Loading that MCU from Debian needs `/dev/mem` access to DRAM at
0x30E00000, and this kernel has `00200000-efffffff` as System RAM with `CONFIG_STRICT_DEVMEM=y`, so the load is
refused. A reserved-memory overlay would fix it, but it also takes memory away from Linux and adds a boot
change for a 16-LED job. The other way was the SPI controller: SPI3 on the M1 pins has MOSI on header pin 19
and MISO on pin 21, Radxa ships a spidev overlay for it, and my own LED strip library already had a spidev port
from the NanoPi. I went that way.

Radxa switches overlays by file name: `u-boot-update` puts every `/boot/dtbo/*.dtbo` on the `fdtoverlays` line
and skips `*.dtbo.disabled`. My script renames two files (SPI3 spidev on, the phantom 7" panel off), keeps a copy
of `extlinux.conf` and has a `revert` that renames back and diffs against the copy.

![WS2812 bits as SPI bytes and one transfer]({{ '/assets/images/boards/rock3a/leds_ws2812_spi.png' | relative_url }})
*One SPI byte per LED bit: 0xC0 is a 0, 0xF8 a 1. A transfer always starts with a reset and is padded to 4096
bytes, and the next one follows right away.*

A WS2812 bit is a short high pulse (a 0) or a long one (a 1); the windows my daemon checks against are 273 to
393 ns, 773 to 893 ns and a period of 1033 to 1633 ns. At roughly 6 MHz, eight SPI bits make one LED bit, so each LED bit becomes one byte: `0xC0` (2 high slots) or `0xF8`
(5 high slots). I asked for 6.0015 MHz; the clock measured 5.743 MHz, and the daemon's status shows what that
means on the wire:

```
rock3a# ./board/ring status
spec custom on spidev: asked 6001500 Hz, clock 5742910 Hz measured, 8 slots of 174127 ps per LED bit, 8 bits per SPI word
  T0H 348 ns (2 slots, spec 273..393)  T1H 870 ns (5 slots + gaps, spec 773..893)
  period on the wire 1400 ns (spec 1033..1633), of which 8 slots are 1393 ns
fps 60 target, 162.9 measured, 0 late; render 10 us (max 130), frame on the wire 6391 us (384 bytes), 3968 transfers
```

With a plain rainbow the daemon showed 0.0 % CPU in `top` at 162.9 frames/s; in music mode it's about 5 %.

The first verifies were almost all wrong. The ring's DO goes back to pin 21, so I can read what the last LED
forwarded and compare it with what I sent. A scan of pin 19 with a small register prober showed the line 100 %
high whenever no transfer ran: that first ring board pulls DI up through about 1.3 kΩ. Between two `ioctl`s the
controller lets go of the pad, the gap is a high pulse, LED 0 reads it as one extra "1" and every following
frame lands one bit late. The fix went into my library as an option: start every transfer with a reset of zero
bytes, in the same `ioctl`, so the stray bit is followed by a reset and thrown away.

```cpp
// SpidevBus transfer: reset bytes in front of the data
size_t lead = m_cfg.lead_reset ? resetBytes() : 0;
...
memset(m_tx, 0, lead);
memcpy(m_tx + lead, tx, len);
memset(m_tx + lead + len, 0, pad);
...
tr.len = static_cast<uint32_t>(lead + len + pad);
```

With no lead, 2328 of 2400 test bytes came back wrong; with 300 µs, 15; with 800 µs, 2 to 7. It's off by
default, so the NanoPi and DragonBoard builds keep their waveform byte for byte.

The second trap I never explained. After the line had been idle (high) for 12 ms or more, the next two frames
were lost: at a 10 ms pause 1 of 100 frames, at 12 ms all 100. It wasn't CPU idle (same with a busy-wait) and it
wasn't SPI runtime power management (same with it off). I'd need a logic analyser on DI and VDD during the gap.
The workaround is to never let the stream stop. The daemon pads every transfer to 4096 bytes of driven-low line
and sends the next one at once, and "off" or "fill red" are running effects that keep sending, not held frames.

The readback is what I trust instead of my eyes. Each sampled SPI byte with at least 4 high slots is a 1; I
checked that threshold on a histogram of the high times on DO, and a threshold of 5 instead gave 590 of 2400
bytes wrong, so the 4-slot pulses really are 1s. `ring verify 8 100` sends 100 frames and
compares; `ring probe` sends numbered pixels and counts how many come back to find the chain length.

Then came LED 0. One LED wasn't steady: its brightness kept going up and down, so it looked like it was
flashing. On that first ring board the pull-up still made each gap a high pulse, and with the
lead reset LED 0 now *latched* that stray bit until the real frame arrived. The prober counted 43 and 64 high runs
per 10 s, the longest 345 µs and 1.9 ms. I wrote a line guard: between transfers pin 19 is switched to a GPIO
driven low, and a second SCHED_FIFO thread switches it back to SPI halfway through the leading reset (the
frame thread is stuck inside the `ioctl`, so it can't do it itself). With the guard the high runs went to 0 and
0, with 4 late switches out of 4857. But the same ring then showed DO stuck high 99.98 to 100 % of the time,
1200 of 1200 bytes wrong even on black frames, and with a separate test tool too. That's that board's hardware.

I swapped it for a WCMCU 2812B-16 module. No pull-up: 0 high runs in 5 s with the guard off, 12000 of
12000 bytes right over 500 verify runs at full brightness on 3.3 V, and by eye the flicker was gone. The guard is now off by default (with it on, one 500-run batch had 48 wrong bytes from a rare late
switch) and `ring guard on` is there for the old board.

### 10. Power: a 3.3 V rail and a 500 mA cap

Both rings are powered from the header's 3.3 V pin. WS2812s are 5 V parts, so this is out of spec, and it
showed. On the first ring the errors on DO grew with LED current: 1038, 89 and 2 wrong bytes out of 2400 at
brightness 64, 32 and 16. That points at the supply sagging under load rather than at the timing; I didn't
measure the rail. The new module was clean at full brightness with 16 LEDs.

With 32 LEDs the library's per-channel estimate for full white is about 1.9 A, far more than that pin should
give. The daemon starts with `limit 500`: the library estimates each frame's current and scales the frame down
only when the estimate passes 500 mA, so normal frames keep full brightness and only big white flashes get
trimmed. The UI shows the estimate and says when the cap is cutting. That cap is also why the pastel kick
flash looked dim (section 8).

Running the rings at 5 V isn't just a matter of a bigger supply. At 5 V the LED's input high threshold is
0.7 × 5 = 3.5 V, and I had measured pin 19's high level at 3.39 to 3.51 V on my other ROCK 3A (the Android one).
That's below or right at the threshold, and a ring at 5 V there showed random colours. The clean fix is a
74AHCT125 buffer, which takes 3.3 V as high and drives 5 V. A cheaper idea is to feed the rings 5 V through a
diode, about 4.3 V, which puts the threshold near 3.0 V. I haven't tried either; the buffer is on my shopping list.

### 11. Two rings in one chain

Halfway through, I chained a second ring onto the first: 32 LEDs, one data line. I could have stretched
one effect over 32 pixels, but two rings side by side invite a split, so the daemon got a `layout` command. In
`split` (the default) ring A (LEDs 0 to 15) shows the genre effect alone and ring B (16 to 31) the drum layer
alone; `mirror` shows the composite on both; `chain` stretches it over all 32.

```cpp
// afxDraw(): what each ring shows in split layout
else if (g_alayout == 0) c = i < kAfxBands ? base_only[i] : (i < 2 * kAfxBands ? drum_only[i - kAfxBands] : 0);
```

With the split you can see the music's two halves apart: a piano keeps ring B dark while ring A waves slowly,
and a drum loop flashes ring B on every kick while ring A follows the chords. The cost on the wire is small,
768 data bytes instead of 384 in a transfer that is 4096 bytes anyway.

### 12. The demo window

The UI is one GTK3 window drawn with cairo, on the board's XFCE desktop, with one card per stage: source (what
the sink is playing), PipeWire (level, rate, blocks per second), NPU (top 3 classes, scene, ms per window,
clock, temperature), beat (BPM, confidence, LED-to-beat error) and LED (both rings). It runs as the desktop user
and only reads two files: the bridge's state, written 20 times a second, and the daemon's frame file, written
up to 30 times a second. No sockets.

The first LED card drew the effect's pixels and scaled them by the brightness itself, and side by side with the
rings it simply didn't look like them. So the daemon now writes the
strip's *wire buffer*, the bytes it just encoded and sent (after brightness, gamma, the power cap and the GRB
order), and the UI draws those. To prove the file really is the wire, `ring mirror` decodes the last SPI stream
back into bytes and compares:

```cpp
// cmdMirror(): decode the sent SPI stream back into bytes
for (unsigned b = 0; b < 8; b++) v = v << 1 | (__builtin_popcount(sb.stream[i * 8 + b]) >= 4 ? 1u : 0u);
```

```
rock3a# ./board/ring mirror
ok: mirror: 48 of 48 bytes in /run/r3a_ring.frame = the SPI stream just sent
```

Three runs, three times 48 of 48 (that was still one ring of 16).

The brightness slider didn't work at first either: GtkScale swallowed the button-release event, and the root
helper wanted a password each time. Now the slider's value-changed signal, debounced by 80 ms, writes one line
`bright N` into a file in the desktop user's own runtime directory, and the bridge, which already holds the FIFO's
write end, forwards it. It accepts nothing else from that file. The daemon logged the new value within 0.5 s.

The look took a few rounds. The background is a perspective floor of soft discs with three drifting glows,
modelled on the background of one of my video posters; it takes its hue from the mean colour of the bytes just sent and pulses
on drum hits. The scene name sits in a pill in the scene's colour that pops and flashes when the genre changes,
and the NPU card says "Im lặng" (silence) when the ring is off for silence instead of the scene it's holding. A
mouse click anywhere starts a water ripple in the LEDs' colour, which is pure fun for the video.

The cost was real. At 30 fps the window used 26 % of a core, so I dropped it to 20 fps. By the time the
backdrop and the extra cards were in, 20 fps cost 25 to 27 % again; the backdrop itself made no measurable
difference (27.4 / 25.0 % before it, 27 / 26 % after), because the dot floor is rendered once per window size and
hue and only blended per frame. The X server sat at 119 to 139 %, mostly the YouTube video behind it.

![The demo UI during a piano clip]({{ '/assets/images/boards/rock3a/leds_ui_music.png' | relative_url }})
*The UI with the piano clip and a YouTube tab behind it: Music 1.00 / Piano 0.47, scene "Êm (piano)" (calm),
NPU 1.95 ms per window at 900 MHz, LED-to-predicted-beat +0.2 ms. The BPM and "phản xạ" (reactive) show the
tracker isn't confident on solo piano.*

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_music_leds_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_music_leds_169.mp4' | relative_url }}" type="video/mp4"></video>

*The demo on the bench, the first 2:13 of one take with no edits: music plays on the board, the UI shows each stage live (the tempo card reads 120.0 on the click track), and the two rings follow, one with the genre effect, the other with the drum flashes.*

The rings follow the music, and the number I care most about is the timing: a predicted beat latches the LEDs
**0.12 ms** after the click on average (max 3.55 ms over 76 beats), where the reactive version was about 16 ms
late. Through live PipeWire, with the computed sound clock, it's +0.28 ms mean and 3.61 ms max over 36 beats.

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
| NPU per window | 4.6 to 5.2 ms (governor) → 2.2 to 2.5 ms pinned at 900 MHz, SoC 54 to 60 °C |
| WS2812 from spidev | old ring LED 0: 43 / 64 stray highs per 10 s → new module 0; 12000 / 12000 bytes right |
| UI mirror | 48 of 48 bytes = the SPI stream just sent (3 of 3) |
| CPU | bridge 13.7 to 14.3 %, ring daemon ~5 %, UI 25 to 27 % at 20 fps |
| Desktop | glmark2 windowed 21 → 57, 1080p30 H.264 on the VPU at 9.1 % CPU |

![The UI in silence with both rings]({{ '/assets/images/boards/rock3a/leds_ui_silence.png' | relative_url }})
*Silence: Silence 1.00 on the NPU, the scene pill reads "Im lặng" and the LED card "LED tắt" (ring off), both
rings drawn from the wire bytes at about 32 mA.*

What I didn't prove. Every timing above is computed: the sound time comes from the graph clock, one quantum and
the ALSA delay, and the LED time from the daemon's transfer bookkeeping. There's no photodiode on a LED and no
microphone on the jack, so light against real sound is not measured. The snare is weak, 24 % recall with a
pad playing, and untested on real music. The drop detector is tuned on one generated track. None of the colour
checks used a camera; the evidence is the DO readback and the wire bytes, which prove the data and say nothing
about how a 3.3 V-fed LED renders blue. The 32-LED chain hasn't been through the 500-run verify that the single
module passed. And the whole thing runs on Radxa's Debian 11; the port to my own Debian 13 image isn't done.

## What I'd do next

A photodiode on one LED and the jack into a logic analyser, with the 120 BPM click, would turn the 0.12 ms into
a measured number or show me what my clock misses. The 74AHCT125 and a 5 V supply would end the 3.3 V
compromise and let me drop the 500 mA cap. The snare needs a better feature than a band ratio. Then the move to
Debian 13: the same build script, with spidev on SPI3 in my own device tree instead of Radxa's overlay.

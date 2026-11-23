---
layout: default
title: "The RK3568 NPU: what Radxa's docs say, and what it did on my boards"
short_description: "Radxa's RKNN guide for the ROCK 3A read side by side with my own runs: converting with rknn-toolkit2, calling librknnrt from C, NPU against CPU and GPU, and the traps the docs don't mention"
status: "Done"
picture: "assets/images/boards/rock3a/npu_flow.png"
latest_release: "2026-11-23: docs read, three models compared on NPU, CPU and GPU"
index: 18
publish: true
permalink: /embedded/boards/rock3a/npu-rknn
board_parent: rock3a
result: "NPU INT8 32x one CPU thread on YAMNet (1.44 vs 45.68 ms), 6.5x four threads on Real-ESRGAN (219.2 vs 1433.0 ms); about 0.49 TOPS of real work"
edge_ai: true   # listed on /edge-ai/
edge_ai_index: 10
tags: [rockchip, arm, npu, edge-ai, linux, android]
---

# The RK3568 NPU: what Radxa's docs say, and what it did on my boards

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

## Situation

By now the NPU in my ROCK 3A has shown up in three of my posts about the board. It finds faces in my stereo webcam's picture on a
[bare FreeRTOS core]({{ '/embedded/boards/rock3a/rtos-face-detect' | relative_url }}), it names the
music the board is playing on [Linux]({{ '/embedded/boards/rock3a/music-linux' | relative_url }}), and it
runs YOLOv5s on my [Android 14 port]({{ '/embedded/boards/rock3a/android14-port' | relative_url }}). Every
time, the NPU part was a few lines in the middle of a longer story. I'd never sat down and written out
how the toolchain works, or checked what I did against Radxa's own guide.

So this post does that. Radxa's ROCK 3A docs have an "Artificial Intelligence" section. I read it, and
the pages it pulls in, and then put my own runs next to it.

![Convert on the PC, run on the board]({{ '/assets/images/boards/rock3a/npu_flow.png' | relative_url }})

The flow both of us follow. Left: rknn-toolkit2 turns a model into a `.rknn` file on an x86 PC. Right:
the board loads it through the runtime and the `rknpu` driver. The blocks with a yellow marker are the
path I took: the C API, not the Python one the docs use, and an NPU clock I pin before I measure anything.

## Task

Two things. First, sum up what the docs actually tell you: the tools, the versions, the examples, and
what they say about the RK3568. Second, write down what I really did with this NPU, with the code that
does it and the numbers I measured, and say plainly where the two don't agree.

## Action

### What Radxa's docs say

The section is six guides plus fourteen model pages. The install guide lays out four pieces:
**RKNN-Toolkit2** on an x86 PC converts, quantises and simulates; **RKNN-Toolkit-Lite2** is a Python API
on the board for inference only; the **RKNN Runtime** (`librknnrt`) is the C/C++ API on the board; and the
**RKNPU kernel driver** talks to the hardware. You convert on the PC and run on the board. That part is
simple and it matches what I do.

The versions don't agree with each other. The install page clones rknn-toolkit2 at `v2.3.2` and has a
table of Python versions per Ubuntu release (3.8 or 3.9 on 20.04, 3.10 or 3.11 on 22.04). The quick-start
page clones `v2.3.0`, and the YOLOv5 guide clones rknn_model_zoo at `v2.3.0` too. The board-side example
in the quick start prints a runtime log from somewhere else entirely:

```
I RKNN: [14:34:53.240] RKNN Runtime Information: librknnrt version: 1.5.2 (c6b7b351a@2023-08-23T15:28:22)
I RKNN: [14:34:53.242] RKNN Driver Information: version: 0.8.2
I RKNN: [14:34:53.250] RKNN Model Information: version: 6, toolkit version: 1.5.2-source_code(...), target: RKNPU v2, target platform: rk3588, ...
```

That's runtime 1.5.2 on an RK3588, on the ROCK 3A page. The YOLOv5 guide's output is also an RK3588
(the prompt reads `rock@rock-5b-plus`). For the RK3568 itself the docs say two useful things. On RK356X
you first turn the NPU on with `sudo rsetup`, Overlays, "Enable NPU", and reboot. And the driver on RK356X
systems "may be 0.8.8", while they recommend 0.9.2 or newer. The model pages use rknn_model_zoo's
`convert.py` with `TARGET_PLATFORM=rk356x`, then build the C demo with `build-linux.sh` and copy it over:

```
python3 convert.py <onnx_model> <TARGET_PLATFORM> <dtype> <output_rknn_path>
bash build-linux.sh -t ${TARGET_PLATFORM} -a aarch64 -d yolov8
```

The model pages ask you to set up rknn_model_zoo by following an "RKNN Model Zoo" page, and that page
isn't in the ROCK 3A section. There's also no RKLLM page there. The custom-YOLO guide has the only
speed numbers in the section, a YOLO11n going from 268.8 ms on the CPU to 18.74 ms as INT8 on the
NPU, but it doesn't say which board that was. Its pictures sit in the ROCK 5B folder. And the PC
simulator, the docs say, "only simulates NPU computation; actual performance and accuracy are
determined by inference on the target board". That turned out to be the most accurate sentence in the
section.

### Converting, for real

My conversions are short scripts around the same three calls the docs use. This is the one I wrote for
the Real-ESRGAN x4 upscaler (`upscale/tools/convert_rknn.py`):

```python
def build(onnx, out, quant):
    from rknn.api import RKNN
    r = RKNN(verbose=False)
    r.config(mean_values=[[0, 0, 0]], std_values=[[255, 255, 255]], target_platform='rk3568',
             quantized_dtype='asymmetric_quantized-8', quantized_algorithm=os.environ.get('QALG', 'normal'),
             optimization_level=3)
    assert r.load_onnx(model=onnx) == 0
    ds = os.path.join(ROOT, 'build', 'calib.txt')
    with open(ds, 'w') as f:
        f.write('\n'.join(sorted(glob.glob(os.path.join(ROOT, 'frames', 'calib', '*.png')))) + '\n')
    assert r.build(do_quantization=quant, dataset=ds) == 0
    assert r.export_rknn(out) == 0
    return r
```

`mean 0 / std 255` moves the divide-by-255 into the model, so the board hands over plain uint8 RGB and the
CPU never touches a float. `do_quantization=False` gives an FP16 model, which the RK3568 NPU runs
natively, and the toolkit then ignores the calibration list. With `True`, the list is a text file of image
paths. For the upscaler that was 17 frames taken from the two games I tested on. After `build`, the same
script calls `init_runtime()` with no target, which is the PC simulator, and scores PSNR against the float
ONNX model. That check told me the conversion was right before anything touched the board. On the board,
the FP16 output came within 1 to 2 grey levels of the simulator.

YAMNet, the audio classifier, needed one more decision. Google's model starts from the waveform with
`tf.signal.stft`, and RKNN has no STFT operator. Doing the DFT as an INT8 matmul on the NPU would quantise
the spectrum before the log, so I cut the network at the log-mel patch and run the front end in C on one
A55 core. The input is `[1, 1, 96, 64]`. With one channel, NCHW and NHWC are the same bytes, which I
thought would spare me any layout trouble. It didn't, see below. Calibration was 110 patches from
recordings that aren't in the test set. Over 734 test windows the INT8 model on the board picked the same
top class as Google's float model 98.2 % of the time; FP16 got 100 %.

### Running it from C

The docs run everything through Lite2 in Python. I've only used the C API: the programs around the model
(a log-mel front end, a JPEG decoder, an Android app) are all C. Loading is two calls in
`linux_music/src/yamnet_tap.c`:

```c
    if (rknn_init(&ctx, mbuf, (uint32_t)msz, 0, NULL) < 0) { fprintf(stderr, "rknn_init failed\n"); return 1; }
    rknn_sdk_version ver;
    rknn_query(ctx, RKNN_QUERY_SDK_VERSION, &ver, sizeof ver);
    rknn_tensor_attr ia = { .index = 0 };
    rknn_query(ctx, RKNN_QUERY_INPUT_ATTR, &ia, sizeof ia);
```

The input attribute carries the zero point and scale the toolkit picked, and the program prints them at
start-up. It's the first thing I check on a new board:

```
INIT api=2.5.0 (74ea630ce8@2026-09-30T09:41:17) drv=0.8.8 init_ms=45.9 input zp=22 scale=0.045939
```

Then every 0.48 s the program quantises the 96 x 64 patch itself and runs it:

```c
                float v = roundf(src[i] / ia.scale) + ia.zp;
                q[i] = (int8_t)(v < -128 ? -128 : v > 127 ? 127 : v);
```

```c
            rknn_input in = { .index = 0, .buf = q, .size = PATCH * NMEL, .pass_through = 1,
                              .type = RKNN_TENSOR_INT8, .fmt = ia.fmt };
            rknn_output out = { .want_float = 1, .is_prealloc = 1, .index = 0, .buf = sc, .size = sizeof sc };
            double a = now_ms();
            if (rknn_inputs_set(ctx, 1, &in) < 0 || rknn_run(ctx, NULL) < 0 ||
                rknn_outputs_get(ctx, 1, &out, NULL) < 0) { fprintf(stderr, "rknn failed\n"); return 1; }
            rknn_outputs_release(ctx, 1, &out);
```

`pass_through = 1` tells the runtime the bytes are already in the model's own format, so it copies them
and does no conversion. The output goes the other way: `want_float = 1` lets the runtime dequantise the
521 scores into my preallocated array. The upscaler does both ends differently, because its output is 3.7
million values per frame. It feeds uint8 NHWC RGB and lets the runtime quantise, then fetches the INT8
output raw (`want_float = 0`) and maps every code through a 256-entry table built once from the output's
zero point and scale.

### The traps

**Float input into an INT8 model.** The first YAMNet run on the board agreed with the float model on only
22 % of windows, and it gave the same classes (382 and 498) for silence and for rock music. FP16 on the
same runner was 100 % right, and the INT8 simulator was 98.8 % right. So I fed one rock clip three ways:

| INT8 model, input given as | top-5 for the clip | `inputs_set` |
|---|---|---|
| float, `fmt = NCHW` | 382:0.348 498:0.158 390:0.128 ... (wrong) | 0.37 ms |
| float, `fmt = NHWC` | 132:0.909 214:0.039 135:0.036 ... | 0.37 ms |
| own INT8, `pass_through = 1` | 132:0.908 214:0.039 135:0.037 ... | 0.10 ms |

With one channel those two float layouts are the same bytes, and librknnrt 2.5.0 still gets NCHW wrong on
the INT8 model. I quantise in C now, which is also 0.27 ms cheaper. The docs don't mention any of this.

**The governor.** On Radxa's Debian 11 image the NPU was already up when I first looked (`rknpu` 0.8.8, a
devfreq node going 200 to 900 MHz). But its default governor is
`rknpu_ondemand`, and a 1.4 ms job every half second never makes it clock up. YAMNet took 5.0 ms per
window like that, and 1.44 ms with the governor set to `performance`. The
[music post]({{ '/embedded/boards/rock3a/music-linux' | relative_url }}) has the whole story. Any number
measured without pinning the clock first says more about the governor than about the NPU.

**The clock itself.** 900 MHz isn't the top. Rockchip's own tables go to 1 GHz, so I enabled that OPP in
my Android kernel (0.95 V for this chip's bin, at 40 °C). Eleven percent more clock bought 2 to 5 %:
YOLOv5s went from 35.91 to 34.58 ms, RetinaFace 320 from 2.91 to 2.76 ms, FaceMesh 192 from 2.28 to 2.24
ms. I'd guess memory and the CPU-NPU handshake are the rest, but I haven't measured that. On my own
Debian 13 image the NPU had been left at 594 MHz, and setting the CRU's `CLK_NPU` did nothing. The rate
belongs to the SCMI clock that BL31 owns. Asking for that one at 1 GHz (1.0 V), with the CPU also raised
from 816 to 1992 MHz, took YOLOv5s from 50.5 to 36.0 ms. That run's boxes and scores on `bus.jpg`
(`person @ (209 243 286 510) 0.880`, `bus @ (91 129 555 464) 0.692`, ...) are exactly the ones in Radxa's
RK3588 log. Same model, converted for a different chip, same answer.

**What INT8 costs.** On YAMNet, almost nothing. On the upscaler, it shows. The INT8 output scale came out
at 0.00756, so one INT8 step is 1.9 grey levels, and the code range covers about -0.6 to +1.33 because the
quantiser keeps the overshoot of the network's final add. On a smooth gradient sky in my first test frames
that showed as light banding; FP16 was clean. On real game screenshots, PSNR against the game's own
1280 x 960 frame was 23.34 dB for INT8 and 23.82 for FP16 on Shattered Pixel Dungeon, 25.94 and 26.43 on
SuperTux. Plain bicubic scored 25.60 and 27.10. So the AI draws sharper outlines but scores lower than
bicubic on both games. I tried the slower `mmse` quantiser and stopped it: about 270 s per iteration on my
PC, so more than an hour for one model.

**Versions.** Rockchip's Android tree already ships librknnrt 2.3.0 as a prebuilt module, and adding my
2.5.0 copy next to it failed the build ("module prebuilt_librknnrt already defined"). I had to feed 2.5.0
through Rockchip's own module. Then my Android app couldn't load it ("library librknnrt.so not found ...
namespace clns-6") until the manifest declared `<uses-native-library android:name="librknnrt.so">`, which an
app targeting API 31 or later needs for a vendor library. On Linux I keep `librknnrt.so` 2.5.0 next to the
binary (rpath `$ORIGIN/../ext`) and install nothing system-wide. Every number here ran on runtime 2.5.0.
YAMNet was converted with toolkit 2.5.0, and the upscaler with 2.3.2, which runs fine on the 2.5.0
runtime. I haven't tried the other direction.

## Result

**The NPU is 32 times faster than one A55 thread on YAMNet** (1.44 against 45.68 ms per window) and
**6.5 times faster than all four cores on Real-ESRGAN** (219.2 against 1433.0 ms per frame). The Mali-G52
GPU was the slowest option I tried, slower even than one CPU thread.

![ms per inference on NPU, CPU and GPU]({{ '/assets/images/boards/rock3a/npu_ms_models.png' | relative_url }})

Log scale, so every bar fits: YAMNet from 1.44 ms on the NPU to 45.68 ms on one thread; Real-ESRGAN from
219.2 ms as INT8 to 3.5 s on the GPU; YOLOv5s only gains 1.3 ms from the 1 GHz overclock.

| Model, one run | NPU | CPU | GPU (Mali-G52) | Where |
|---|---|---|---|---|
| YAMNet, 0.975 s window | 1.44 ms INT8 pinned at 900 MHz, 5.0 ms on `rknpu_ondemand` | 23.93 ms 4 threads, 45.68 ms 1 thread (onnxruntime, float) | not measured | Radxa Debian 11 |
| YAMNet, same file | 2.05 ms INT8, 3.51 ms FP16, at 1 GHz | not measured | not measured | my Android 14 |
| Real-ESRGAN x4, 320 x 240 | 219.2 ms INT8, 634.2 ms FP16 | 1433.0 ms 4 threads, 3271.0 ms 1 thread (ncnn) | 3522.9 ms (Vulkan) | my Android 14 |
| YOLOv5s 640 | 34.58 ms INT8 at 1 GHz | not measured | not measured | my Android 14 |
| RetinaFace 320 | 2.76 ms INT8 at 1 GHz | not measured | not measured | my Android 14 |

How close is that to the spec? Rockchip quotes 0.8 or 1 TOPS depending on the document. The upscaler is
easy to count by hand: 47.55 GMAC per frame, done in the 192.6 ms of `rknn_run`. That's 247 GMAC/s, or
0.49 TOPS, about half the advertised number, on a model that is nothing but 3 x 3 convolutions. The
bigger variant with twice the layers reached 300 GMAC/s, so longer graphs keep the NPU busier.

As for the docs: the flow they describe is right, and the C demos they build are the same ones I started
from. But their versions disagree with each other, the logs on the ROCK 3A pages come from RK3588 boards,
and none of the three things that cost me the most time is in there: the float-NCHW bug, the governor and
the SCMI clock.

## What I'd do next

The NCHW bug isn't reported to Rockchip yet, and I haven't checked whether other runtime versions have
it. For the upscaler, `mmse` on a faster machine and a hybrid model (a few layers kept in FP16) are both
untried, and nobody has looked at the INT8 banding on a camera yet. I'd also like to measure the NPU's
real clock, from its PVTM counters or by timing a layer I know, instead of trusting what the clock
framework reports.

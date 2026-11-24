---
layout: default
title: "Porting Android 14 to the ROCK 3A myself"
short_description: "Radxa ships Android 14 for the ROCK 3C only: a new product from its tree, 13 kinds of build failure, a DDR blob that hangs on reboot"
status: "Done"
picture: "assets/images/boards/rock3a/r3a_a14_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-19: services in the image, /dev/mem gone"
index: 14
publish: true
permalink: /embedded/boards/rock3a/android14-port
board_parent: rock3a
result: "Android 14 + kernel 6.1.99 + GApps booting; warm reboot back in 36 s; YOLOv5s 34.58 ms on the NPU at 1 GHz"
edge_ai: true   # 2026-11-22: listed on /edge-ai/ (user «Thêm 1 page là Edge AI … gom các project có liên quan đến AI»)
edge_ai_index: 1
tags: [rockchip, arm, edge-ai, npu, linux, android]
---

# Porting Android 14 to the ROCK 3A myself

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![The Android 14 port in one picture]({{ '/assets/images/boards/rock3a/r3a_a14_cover.jpg' | relative_url }})
*The whole story in one picture: Android 14 with GApps on the ROCK 3A, a warm reboot back in 36 s, and YOLOv5s in 34.58 ms on the NPU at 1 GHz.*

![Android 14 home screen on the ROCK 3A]({{ '/assets/images/boards/rock3a/android14_home.png' | relative_url }})

That's a screen capture from the board, a few days later, after I'd given it my own wallpaper.

## Situation

I'd built Android 11 with the Play Store for this board in October. It worked, but Android 11 is old.
When I looked for something newer, Radxa's Android 14 (their `rkr6` release, kernel 6.1) exists only for
the ROCK 3C. Same RK3568, different board.

## Task

Make a ROCK 3A product out of Radxa's ROCK 3C tree, with HDMI, Ethernet, GApps and the NPU working, built
from scratch by scripts I keep in git, so I can rebuild it later without remembering anything.

![The build chain, script by script]({{ '/assets/images/boards/rock3a/a14_build_chain.png' | relative_url }})

The chain the scripts ended up as, with what broke at each step: 1236 projects sorted by `fix_manifest.py`, the 134-byte LFS pointer at 60 %, eight patch files to turn the ROCK 3C product into a ROCK 3A, and the DDR blob swap from v1.23 to v1.26.

## Action

The chain ended up as `fetch.sh` → `fix_manifest.py` → `make_target.sh` + `apply.sh` → `build.sh` (Docker,
Ubuntu 22.04, 12 jobs) → flash over Maskrom with `rkdeveloptool`. The build ran on my desktop: 62 GB of
RAM matters, since AOSP 14 wants about 2 GB per link job. The `.repo` alone is 180 GB.

The source was the hardest part. Radxa's manifest points at a GitLab mirror where projects have
other names and many pinned SHAs simply aren't there. I gave up on fixing it by hand and wrote
`fix_manifest.py`, which looks up each of the 1236 projects in turn: the mirror with the upstream ref
first, then the mirror with only Radxa's branch, then plain AOSP at Google, then the AOSP base tag. Almost
all of them were on the mirror; one exists nowhere and got dropped.

Then the build failed in 13 different ways. The ones worth knowing if you try this:

| Symptom | Cause |
|---|---|
| `/usr/bin/env: 'python': No such file or directory` | kernel 6.1 pack scripts call `python`; the container only had `python3` |
| `Chromium.apk: error: failed opening zip: Invalid file.` at 60 % | a 134-byte Git LFS pointer: `repo sync` doesn't fetch LFS. `git lfs pull` brought it to 259 MB |
| `unrecognized property "preprocessed"` | MindTheGapps' head needs a newer soong; pinned it to a Feb 2024 commit |
| `module "prebuilt_librknnrt" already defined` | the tree already ships librknnrt 2.3.0; fed my 2.5.0 through Rockchip's own module |
| build stopped, disk 100 % | Rockchip's `build.sh` keeps every image copy (7 to 8.5 GB each); now it keeps the newest only |

Then the reboot hang. Cold boots were fine. A warm reset (`rkdeveloptool rd`, `adb reboot`) hung, twice in a row, right after the line
`LP4/4x derate en, other dram:1x trefi`. The DDR blob in Radxa's tree is v1.23; on a warm reset it never
comes back. v1.26 from rkbin (the one I'd used for everything else on this board) fixed it. I also tried
going back to v1.23 once more to be sure, and undid it.

Codec2 next. The Rockchip codec limits were below what the RK3568 datasheet allows, so I raised them
(4K, up to 240 Mbit/s for AVC). In buffer mode the decoder leaked one 4 MB DMA-BUF per frame: on the
RK3568 the source buffer sits above 4 GB, RGA2's 32-bit MMU refuses it, and the early return never released
the destination handle it had already imported.

After the port, everything I'd been starting by hand after each boot (stats daemon, music daemon,
the LED ring bridge) went into the vendor image as init services; three boots in a row started them by
themselves, and init restarted one 8 s after a `kill -9`. One more surprise: the "There's an internal
problem with your device" dialog at boot came from `CONFIG_DEVMEM=y`, which I'd turned on for the MCU and
which fails Android's VINTF check. The MCU now goes through two UIO devices instead, no `/dev/mem`.

![Android System: There's an internal problem with your device]({{ '/assets/images/boards/rock3a/a14_devmem_dialog.jpg' | relative_url }})

The dialog every boot greeted me with (HDMI screencap, 7:52 PM on 2026-11-19, before the fix). It's `CONFIG_DEVMEM=y` failing the VINTF check, nothing to do with the hardware.

```
~/$ adb shell 'getprop ro.build.version.security_patch; getprop ro.build.version.release; uname -r'
2025-01-05
14
6.1.99
```

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_android14_boot_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_android14_boot_169.mp4' | relative_url }}" type="video/mp4"></video>

*One minute of the port on the bench, filmed with the camera: power on, the Rockchip kernel logo, the Android boot animation, then the launcher and the app drawer on the HDMI screen.*

Android 14 (UQ1A.240205.004.B1, security patch 2025-01-05, kernel 6.1.99, userdebug) runs on the
ROCK 3A with HDMI, Ethernet and GApps. Warm reboot works again: `adb reboot` is back in **36 s** with DDR
blob v1.26.

![Home screen after the fix, no dialog]({{ '/assets/images/boards/rock3a/a14_no_dialog.jpg' | relative_url }})

First boot with the UIO kernel: home screen at 8:04 PM, no dialog. Boots 2 and 3 (8:11 and 8:13 PM) had no dialog either.

With the NPU clocked to 1 GHz in the DTS (0.95 V from the chip's bin, 40 °C), YOLOv5s went from
35.91 to **34.58 ms** and RetinaFace 320 runs in 2.76 ms. On the CPU, llama.cpp with 4 threads runs
Qwen3-0.6B Q4_0 at **12.56 tok/s** generation and 59.90 tok/s on the prompt.

The Codec2 leak fix, A/B on the board over 3 decodes: the stock library climbs from 199 to 842 DMA-BUFs,
the patched one stays at 20 (104 MB) and is faster too (about 121 fps against 100 to 110).

## What I'd do next

The Codec2 fix was tested with a bind mount only; it isn't in a flashed image yet. And the Mali-G52 is a
disappointment for compute: in ncnn it's slower than a single CPU thread, and llama.cpp's Vulkan backend
failed with a GPU fault. I'd like to know whether that's the driver or me.

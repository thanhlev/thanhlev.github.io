---
layout: default
title: "My own Debian 13 on the eMMC, next to FreeRTOS on core 3"
short_description: "Mainline Linux 7.2.11 and a self-built Debian 13 on cores 0-2, booted by U-Boot from the NOR chain that already gave core 3 to FreeRTOS, and Rockchip's NPU driver ported to it"
status: "Done"
picture: "assets/images/boards/rock3a/rock3a_debian13_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-27: plain English pass"
index: 12.5
publish: true
permalink: /embedded/boards/rock3a/debian13-emmc
board_parent: rock3a
result: "Debian 13 on cores 0-2 with FreeRTOS on core 3 the whole time; eMMC written in 60.4 s (rockusb: 16 % in 8 min); YOLOv5s on the NPU 50.5 ms, RTOS 1 kHz task max 4.7 µs late"
tags: [rockchip, arm, linux, freertos, npu, bare-metal]
description: "Mainline Linux 7.2.11 and a self-built Debian 13 on cores 0-2, booted by U-Boot from the NOR chain that already gave core 3 to FreeRTOS, and Rockchip's NPU driver ported to it"
date: 2026-11-23
last_modified_at: 2026-11-27
---

# My own Debian 13 on the eMMC, next to FreeRTOS on core 3

![Debian 13 next to FreeRTOS on the ROCK 3A]({{ '/assets/images/boards/rock3a/rock3a_debian13_cover.jpg' | relative_url }})
*Debian 13 runs on cores 0-2 and FreeRTOS keeps core 3. Its 1 kHz task is never more than 4.7 µs late.*

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![Power-on to a Debian login, core 0 path and core 3 path]({{ '/assets/images/boards/rock3a/debian_boot_chain.png' | relative_url }})

*One boot of the finished image. Core 0 goes along the top row, from the BootROM (the code built into
the chip) to Debian. Core 3 leaves before the DDR blob runs and never goes back to Linux. With no `extlinux.conf`
on the eMMC, U-Boot waits in fastboot mode, and that is how I write the eMMC in 60 seconds.*

## Situation

By late October my ROCK 3A booted well from its 16 MiB SPI NOR (a small flash chip on the board).
A 1 kHz loop ran on core 3 from 174 µs after my first instruction. FreeRTOS ran on that core at
0.154 s, and a small Linux on the other three cores at 2.49 s (its own story:
[FreeRTOS on core 3 at 154 ms]({{ '/embedded/boards/rock3a/rtos-before-linux' | relative_url }})).
But that Linux was a toy: a `tinyconfig` kernel (the smallest config) with a BusyBox initramfs (a tiny
root filesystem in RAM), read from the NOR by my own 3 KB loader. Nothing was on the eMMC, and it had
no package manager and no NPU. If I left its shell, the kernel panicked.

For a robot I want both halves for real: one hard real-time core that ignores Linux, and a normal
distribution on the other cores. There I can `apt install` things, ssh in, and run models on the NPU
(the chip's neural network unit). Radxa's images start all four cores from their own boot chain and
don't expect an RTOS to be running already.

A few limits shaped every choice below:

- No root on the PC I build on. Without `sudo` I had no loop mounts, no `chroot` and no qemu-user
  binfmt.
- No hands on the board, only a USB-UART and one USB A-A cable to the PC. I couldn't press the
  Maskrom button (Maskrom is the chip's USB recovery mode) or move a jumper. If I broke the boot, I had to get back to
  Maskrom from software.
- The RTOS boot must not change. The NOR chain up to BL31 (the Arm Trusted Firmware part that stays
  in memory), the core 3 handover and the reserved memory were measured and working. Linux had to fit
  around them.
- Mainline, not the vendor kernel. My AMP driver and patches were for mainline. So I gave up
  Rockchip's BSP drivers, including the NPU one.

## Task

Done meant all of this, measured on the board:

1. FreeRTOS still owns core 3 from the BootROM on. Its 1 kHz task keeps running with 0 missed
   periods while U-Boot, the kernel and Debian start next to it.
2. A full Debian 13 (trixie, arm64, console only) on the eMMC, with systemd, ssh, apt and my AMP
   tools. It runs on a mainline kernel (7.2.11) that sees only cores 0 to 2.
3. The NPU works under that mainline kernel, end to end: driver, Rockchip's runtime and a real model.
4. Writing a new image to the eMMC is fast enough that I want to do it often, with no root on the PC.

![What sits on the NOR, the eMMC and the DRAM]({{ '/assets/images/boards/rock3a/debian_memory_map.png' | relative_url }})

*The three storage layers of the finished image (not to scale). The NOR now keeps only the boot chain
and U-Boot. The kernel moved to the eMMC. In DRAM, FreeRTOS and its 1 MiB shared window are cut out
with `no-map`, and the fastboot buffer sits well below them.*

## Action

### 1. U-Boot after BL31, and Linux kept off core 3

I couldn't use U-Boot's own chain (TPL, SPL, TF-A). My stages already give core 3 to FreeRTOS before
the DDR blob runs, and SPL would want to do those same steps. So U-Boot takes the place of the small
Linux, and my `nsloader` reads it from NOR in 226 ms. The kernel moved to the eMMC, so the NOR image
dropped to about 2 MB instead of carrying a 6.5 MB kernel.

Three things keep Linux away from core 3. First, `maxcpus=3` means Linux never starts that core.
Second, the DT overlay from the AMP work reserves the RTOS's 16 MiB and its 1 MiB shared window as
`no-map`. A plain reservation only keeps the memory allocator out. The pages stay in the kernel's
linear map, and an A55 may read them early, on a guess. With `no-map`, cores 0 to 2 have no mapping
for them at all. The first boot showed both:

```
[    0.000000] OF: reserved mem: 0x0000000031000000..0x00000000310fffff (1024 KiB) nomap non-reusable amp-shm@31000000
[    0.000000] OF: reserved mem: 0x0000000030000000..0x0000000030ffffff (16384 KiB) nomap non-reusable amp-rtos@30000000
```

The third is the kernel config. It has no cpuidle, because a cluster power-down would turn off core 3
too. Also no CPU hotplug and no suspend; the build stops if `select` turns one back on. The four
A55s share one clock, so the only cpufreq governor is `performance`. `total_trans` reads 1.

U-Boot (mainline 2026.07) has one boot command: `sysboot` the `extlinux.conf` on eMMC partition 1,
or else become a fastboot device. The rock-3a defconfig leaves `sysboot` out; the
fallback showed me that on the first boot. The fastboot buffer needed care, because U-Boot
doesn't know FreeRTOS is running in DRAM. It is 256 MiB at `0x10000000`, so it ends 256 MiB below the
RTOS. A download over `0x30000000` would kill core 3 with no error at all.

### 2. A Debian rootfs built without root

Without root I have no chroot and no qemu, but debootstrap (Debian's tool that builds a root
filesystem) comes in two parts by design. With `--foreign` it only downloads and unpacks. Under
`fakeroot -s` it records the root ownership it would have set. Then `mke2fs -d` builds the
ext4 image in the same session. So every file belongs to root, though no process of mine ever was.

The second part runs arm64 code, so it runs on the board. The image boots once with a shell script
as `init=`, which runs `debootstrap --second-stage`, sets up the system, switches
`extlinux.conf` to the normal Debian label and reboots. The A55s set up the base system in about
ten minutes. The image is a 2 GiB partition, because every byte has to go over USB. On the first
boot, `sfdisk` grows it to 14.4 GiB.

My first script ended with `reboot -f`, which asks systemd to reboot, but under `init=` there is no
systemd. PID 1 exited and the kernel panicked. Now the script ends with `echo b > /proc/sysrq-trigger`.
Growing the filesystem there failed too; I did it by hand once.

### 3. Writing the eMMC in 60 seconds instead of 8 minutes for 16 %

![rockusb against fastboot with a sparse image]({{ '/assets/images/boards/rock3a/debian_emmc_write.png' | relative_url }})

*I measured both on the board. rockusb from Maskrom reached 16 % in about eight minutes, and I stopped
it. The dashed part is my estimate at that speed (never run). Fastboot with my sparse image
wrote the whole thing in 60.4 s. Only 403.6 MiB of it went over the cable.*

The Rockchip way is `rkdeveloptool wl` from Maskrom. It moves 64 KiB per USB command, about 0.7 MB/s. After eight minutes it showed 16 %, and I stopped it. So I gave U-Boot fastboot,
which takes Android sparse images. In a sparse image, a run of zero blocks costs 16 bytes
instead of the zeros themselves. My 2 GiB image is mostly empty ext4. The PC had no `img2simg` and I
couldn't install it, so I wrote a 42-line converter. It reads the image in 4 KiB blocks and writes the
data runs as RAW chunks.

The one real choice was the zero runs. A DONT_CARE chunk is faster, but it keeps what an earlier
image wrote there. ext4 expects its inode tables and journal to start as zeros. So zero runs
are FILL chunks with value 0. U-Boot writes the zeros on the board, and the eMMC ends up the same as
the raw image, block for block.

```
disk.simg: 528640 blocks, 27 chunks, 403.6 MiB of data (1661.4 MiB of zeros left to U-Boot)
Sending sparse 'mmc0' 1/2 (262140 KB)              OKAY [ 15.735s]
Writing 'mmc0'                                     OKAY [  5.087s]
Sending sparse 'mmc0' 2/2 (151128 KB)              OKAY [  7.567s]
Writing 'mmc0'                                     OKAY [ 30.484s]
Finished. Total time: 60.369s
```

### 4. The NPU under mainline: four errors, each hiding the next

![The NPU stack and where each error came from]({{ '/assets/images/boards/rock3a/debian_npu_fixes.png' | relative_url }})

*Top to bottom: what one inference goes through. The red badges show where each probe error came from.
The green lines on the right show the fixes. Errors 2 and 3 came from the same boot.*

Mainline's NPU driver (`rocket`) supports only the RK3588. Rockchip's closed runtime only talks to
their GPL driver, `rknpu`. So I built rknpu 0.9.8 out of tree against 7.2.11. I fixed a few moved kernel APIs
and left out the vendor devfreq (clock scaling). I wrote its DT node with no IOMMU on purpose,
because Rockchip's IOMMU driver isn't in mainline. The buffers come from `cma=256M`, a fixed memory
pool. Then the driver failed to probe (start up on the device) four times:

| # | What dmesg said | What was really wrong | Fix |
|---|---|---|---|
| 1 | `probe with driver RKNPU failed with error -110` | mainline's `rk356x-base.dtsi` has no `PD_NPU` power domain | add the domain in the overlay |
| 2 | `failed to get ack on domain 'npu'`, then an external abort | genpd powers the domain before rknpu turns on `vdd_npu` | `vdd_npu` `regulator-always-on` |
| 3 | `error -ENXIO: IRQ npu_irq not found` | the driver asks for its interrupt by name | `interrupt-names = "npu_irq"` |
| 4 | `failed to get pm runtime for rknpu, ret: -95` | without devfreq, the runtime-PM stubs return `-EOPNOTSUPP` | stubs return 0 (my patch) |

The second error was the scary one. The power-off path read the NPU's QoS registers on a bus with no
power. That caused an external abort, a bus fault that stops the CPU. Mainline takes no
`domain-supply` for RK3568 domains, so the rail is on from boot. The fourth error can only happen
outside Rockchip's kernels, because they always build devfreq. A failed probe also leaves runtime PM
out of balance, so every retry needed a reboot.

After fix 4 the probe was clean. Rockchip's YOLOv5 demo found four people and a bus in `bus.jpg` in
50.5 ms. It gave the same boxes as the PC simulator (bus 0.692 on the board, 0.693 simulated). That
was at 594 MHz. At 1 GHz the next day it took 36.0 ms (see
[the NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }})). The number I cared about
more: during five runs the NPU used the DRAM hard, and core 3 shares that DRAM. Still, the 1 kHz task
woke at most 4.7 µs late.

### 5. The traps

**`2207:350a` doesn't mean Maskrom.** After a reset, my NOR flasher waits for the Maskrom USB ID.
U-Boot's fastboot gadget uses the same vendor and product IDs, so `lsusb` can't tell them apart.
`fastboot devices` can. It lists the board only when U-Boot is running.

**Getting back to Maskrom from Debian.** I wrote the BootROM's "stay in Maskrom" word and did a
CRU reset (through the chip's clock and reset unit) from Linux. No USB device ever showed up. Once the
board stayed silent until a power cycle. U-Boot's reset goes through BL31 and keeps that word. So a
script waits for U-Boot's prompt and types `mw.l` and `reset`, one character every 2 ms. That takes me from
Debian to Maskrom to a verified NOR, and a login prompt 12.4 s after the reset, without touching the board.

**A board that resets itself while booting.** After two 1280x720 webcams ran at once, the
kernel died at 0.74 s or 3.39 s on every boot, while U-Boot alone stayed up for 240 s. Booting by hand
from U-Boot with services masked didn't stop it. I think it's the power supply, but I haven't measured it.

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_debian13_npu_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_debian13_npu_169.mp4' | relative_url }}" type="video/mp4"></video>

*From my facecam film (Vietnamese narration, 76 s): Debian 13 written to the eMMC next to FreeRTOS on core 3, the NPU driver's four errors, the clock fix (YOLOv5s 50.5 → 36.0 ms) and the last model layers moved off the CPU.*

Debian 13 runs from the eMMC on cores 0 to 2 under mainline 7.2.11. FreeRTOS gets core 3
from the NOR chain at 0.154 s (timed on the earlier build, not again with U-Boot after it) and never
notices Linux starting. Debian came up the first time on the board:

```
Debian GNU/Linux 13 rock3a ttyS2
rock3a login:
```

(I changed the host name for the post. The kernel's clock said 13.1 s at that prompt.)

| Measured on the board | Value |
|---|---|
| Writing the whole eMMC image (fastboot + my sparse image) | **60.4 s**, 403.6 MiB over USB, 1661.4 MiB of zeros written by U-Boot |
| Same image over rockusb from Maskrom | 16 % after about 8 minutes (stopped) |
| debootstrap second stage on the A55s | about 10 minutes, once |
| U-Boot reading the kernel from the eMMC | 40 073 728 B in 310 ms (123.3 MiB/s) |
| `systemctl reboot` to the next `login:` on the console | 17.6 s |
| YOLOv5s INT8 on the NPU, one frame | **50.5 ms** at 594 MHz, 36.0 ms at 1 GHz the next day |
| RTOS 1 kHz task from its start through the Debian boot and after (first 51.8 s) | 51 814 periods, 0 overruns, max 17.5 µs late |
| RTOS 1 kHz task during 5 NPU runs | max **4.7 µs** late, 0 overruns of 5958 periods |
| RTOS 1 kHz task during 60 s of NPU runs, CPU at 1992 MHz | max 12.6 µs late, 0 overruns of 61 525 |

The NPU part, which I wasn't sure about at all, works without any vendor kernel. It uses an out-of-tree GPL driver with one patch, a 77-line DT overlay, and Rockchip's own runtime and
demo on top. The detections match their tools.

What it doesn't do:

- Console only. This image has no desktop and no display stack. I haven't tried the Mali-G52 or the
  video codecs on this kernel.
- No IOMMU for the NPU. Its buffers come from a fixed 256 MiB CMA pool. Big models, or several at
  once, will run out of that pool before they run out of RAM.
- One fixed NPU clock. There's no devfreq, so the NPU runs at the rate the DT sets through BL31's SCMI
  clock (1 GHz now). The CRU's `CLK_NPU` has no effect on this chain.
- I grew the filesystem by hand once. Its systemd unit exists but hasn't run on the board yet.
- I can't explain the reset loop after the two-webcam run yet.

## What I'd do next

The change from 50.5 to 36.0 ms tells me the CPU side and the memory path matter for the NPU here.
I haven't measured where the rest of the time goes. I'd also like to put the eMMC driver into
`nsloader`. Then the small Linux and this Debian could share one kernel on the eMMC. The reset loop needs a meter on the 5 V rail, and that means hands on the board.

This split also costs Linux one of its four Cortex-A55 cores. The RK3568 has another place for a
real-time job: its own small RISC-V MCU core. Later I tried that way, with FreeRTOS on the RV32 core
and Linux keeping all four A55 cores, in
[A WS2812 ring from the RK3568's RISC-V MCU, with Android on all four A55s]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }}).
After that I had it watch a webcam on its own while the A55s are powered off, in
[The RISC-V MCU keeps watch]({{ '/embedded/boards/rock3a/mcu-camera-wake' | relative_url }}).

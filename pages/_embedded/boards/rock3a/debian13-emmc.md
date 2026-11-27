---
layout: default
title: "My own Debian 13 on the eMMC, next to FreeRTOS on core 3"
short_description: "Mainline Linux 7.2.11 and a self-built Debian 13 on cores 0-2, booted by U-Boot from the NOR chain that already gave core 3 to FreeRTOS, and Rockchip's NPU driver ported to it"
status: "Done"
picture: "assets/images/boards/rock3a/rock3a_debian13_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-27: Action shortened"
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
*Debian 13 on cores 0-2 while FreeRTOS keeps core 3, its 1 kHz task never more than 4.7 µs late.*

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![Power-on to a Debian login, core 0 path and core 3 path]({{ '/assets/images/boards/rock3a/debian_boot_chain.png' | relative_url }})

*One boot of the finished image. Core 0 walks the top row from the BootROM to Debian; core 3 drops out
before the DDR blob runs and never comes back to Linux. If the eMMC has no `extlinux.conf`, U-Boot
waits in fastboot instead, which is how I write the eMMC in 60 seconds.*

## Situation

By late October the ROCK 3A booted from its 16 MiB SPI NOR in a way I liked a lot: a 1 kHz loop on
core 3 from 174 µs after my first instruction, FreeRTOS on that core at 0.154 s, and a small Linux on
the other three cores at 2.49 s (that part is its own story,
[FreeRTOS on core 3 at 154 ms]({{ '/embedded/boards/rock3a/rtos-before-linux' | relative_url }})).
But that Linux was a toy. A `tinyconfig` kernel with a BusyBox initramfs, read from the NOR by my own
3 KB loader, nothing on the eMMC, no package manager, no NPU. Leaving its shell meant a kernel panic.

What I actually want on a robot is both halves for real: a hard real-time core that doesn't care what
Linux is doing, and a normal distribution on the other cores where I can `apt install` things, ssh in,
and run models on the NPU. Radxa's images boot their own chain and bring up all four cores; nothing in
them expects an RTOS to be running already.

There were a few constraints that shaped every decision below:

- No root on the PC I build on. No `sudo`, so no loop mounts, no `chroot`, no qemu-user binfmt.
  Anything that normally needs root during an image build had to be done some other way.
- No hands on the board. It sat on the bench with a USB-UART and one USB A-A cable to the PC. No
  pressing the Maskrom button, no moving a jumper. If I bricked the boot, I had to get back to Maskrom
  from software.
- The RTOS boot must not change. The NOR chain up to BL31, the handover of core 3 and the reserved
  memory were measured and working. Linux had to fit around them, not the other way round.
- Mainline, not the vendor kernel. My AMP driver and patches were written against mainline, and I
  wanted to stay there. That meant giving up Rockchip's BSP drivers, including the NPU one.

## Task

Concretely, done meant all of this, measured on the board:

1. FreeRTOS still owns core 3 from the BootROM on, and its 1 kHz task keeps running with 0 missed
   periods while U-Boot, the kernel and Debian come up next to it.
2. A full Debian 13 (trixie, arm64, console only) on the eMMC, with systemd, ssh, apt and my AMP
   tools, on a mainline kernel (7.2.11) that sees only cores 0 to 2.
3. The NPU working under that mainline kernel, end to end: driver, Rockchip's runtime, a real model.
4. Writing a new image to the eMMC fast enough that I'd actually iterate on it, without root on the PC.

![What sits on the NOR, the eMMC and the DRAM]({{ '/assets/images/boards/rock3a/debian_memory_map.png' | relative_url }})

*The three storage layers of the finished image (not to scale). The NOR keeps only the boot chain and
U-Boot now; the kernel moved to the eMMC. In DRAM, FreeRTOS and its 1 MiB shared window are carved out
with `no-map`, and the fastboot buffer sits well below them.*

## Action

### 1. U-Boot after BL31, and Linux kept off core 3

U-Boot's own chain (TPL, SPL, TF-A) wasn't an option: my stages already give core 3 to FreeRTOS
before the DDR blob runs, and SPL would want those exact steps. So U-Boot goes where the small Linux
used to be, as the payload my `nsloader` reads from NOR in 226 ms. The kernel moved to the eMMC, and the
NOR image dropped to about 2 MB instead of carrying a 6.5 MB kernel.

Three things keep Linux away from core 3. `maxcpus=3` means it never brings the core online. The DT
overlay from the AMP work reserves the RTOS's 16 MiB and its 1 MiB shared window as `no-map`, which
matters more than it looks: a plain reservation only keeps the allocator out, while the pages stay in
the linear map where an A55 may fetch from them speculatively. With `no-map` cores 0 to 2 have no
mapping for them at all. The first boot showed both:

```
[    0.000000] OF: reserved mem: 0x0000000031000000..0x00000000310fffff (1024 KiB) nomap non-reusable amp-shm@31000000
[    0.000000] OF: reserved mem: 0x0000000030000000..0x0000000030ffffff (16384 KiB) nomap non-reusable amp-rtos@30000000
```

The third is the kernel config: no cpuidle (a cluster power-down would take core 3 with it), no CPU
hotplug, no suspend, and the build stops if `select` drags one back. The four A55s share one clock, so
the only cpufreq governor is `performance`; `total_trans` reads 1.

U-Boot (mainline 2026.07) runs one boot command: `sysboot` the `extlinux.conf` on eMMC partition 1,
or else become a fastboot device. The rock-3a defconfig leaves `sysboot` out, which the fallback told
me on the first boot. Its fastboot buffer needed care, because U-Boot doesn't know FreeRTOS is alive in
DRAM: 256 MiB at `0x10000000`, ending 256 MiB below the RTOS. A download over `0x30000000` would kill
core 3 without a word.

### 2. A Debian rootfs built without root

Without root there's no chroot and no qemu, but debootstrap splits in two by design. `--foreign`
only downloads and unpacks; under `fakeroot -s` it records the root ownership it would have set, and
`mke2fs -d` builds the ext4 image in the same session, so every file belongs to root although no
process of mine ever did.

The second half has to run arm64 code, so it runs on the board: the image boots once with a shell
script as `init=`, which runs `debootstrap --second-stage`, configures the system, flips
`extlinux.conf` to the normal Debian label and reboots. The A55s configured the base system in about
ten minutes. The image itself is a 2 GiB partition, because every byte has to cross USB, and the first
boot grows it to 14.4 GiB with `sfdisk`.

My first script ended with `reboot -f`, which asks systemd to reboot, and under `init=` there is no
systemd: PID 1 exited and the kernel panicked. It now ends with `echo b > /proc/sysrq-trigger`. Growing
the filesystem there failed too; I did it by hand once, and its systemd unit hasn't run yet.

### 3. Writing the eMMC in 60 seconds instead of 8 minutes for 16 %

![rockusb against fastboot with a sparse image]({{ '/assets/images/boards/rock3a/debian_emmc_write.png' | relative_url }})

*Both measured on the board. rockusb from Maskrom reached 16 % in about eight minutes and I stopped it;
the dashed part is that pace continued (my estimate, never run). Fastboot with my sparse image wrote
the whole thing in 60.4 s, and only 403.6 MiB of it went over the cable.*

The Rockchip way, `rkdeveloptool wl` from Maskrom, moves 64 KiB per USB command and crawled at about
0.7 MB/s. After eight minutes it said 16 %, and I stopped it. That's why U-Boot got fastboot: it takes
Android sparse images, where a run of zero blocks costs 16 bytes instead of the zeros themselves, and
my 2 GiB image is mostly empty ext4. There was no `img2simg` on the PC and I couldn't install one, so
I wrote a 42-line converter that walks the image in 4 KiB blocks and emits data runs as RAW chunks.

The one real decision was the zero runs. A DONT_CARE chunk would be faster still, but it leaves
whatever an earlier image wrote, and ext4 expects its inode tables and journal to start as zeros. So
zero runs are FILL chunks with value 0: U-Boot writes the zeros on the board, and the eMMC ends up
equal to the raw image block for block.

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

*Top to bottom, what one inference goes through. The red badges are where each probe error came from;
the green lines on the right are what fixed it. Errors 2 and 3 came out of the same boot.*

Mainline's NPU driver (`rocket`) covers only the RK3588, and Rockchip's closed runtime only talks to
their GPL `rknpu`. So I built rknpu 0.9.8 out of tree against 7.2.11 (a few moved kernel APIs, vendor
devfreq left out) and wrote its DT node with no IOMMU on purpose, since Rockchip's IOMMU driver isn't
in mainline; buffers come from `cma=256M`. Then it failed to probe four times:

| # | What dmesg said | What was really wrong | Fix |
|---|---|---|---|
| 1 | `probe with driver RKNPU failed with error -110` | mainline's `rk356x-base.dtsi` has no `PD_NPU` power domain | add the domain in the overlay |
| 2 | `failed to get ack on domain 'npu'`, then an external abort | genpd powers the domain before rknpu turns on `vdd_npu` | `vdd_npu` `regulator-always-on` |
| 3 | `error -ENXIO: IRQ npu_irq not found` | the driver asks for its interrupt by name | `interrupt-names = "npu_irq"` |
| 4 | `failed to get pm runtime for rknpu, ret: -95` | without devfreq, the runtime-PM stubs return `-EOPNOTSUPP` | stubs return 0 (my patch) |

The second was the scary one: the power-off path read the NPU's QoS registers on an unpowered bus and
took an external abort. Mainline takes no `domain-supply` for RK3568 domains, so the rail is on from
boot. The fourth can only exist outside Rockchip's kernels, which always build devfreq. A failed probe
also leaves runtime PM unbalanced, so every retry had to be a reboot.

After fix 4 it probed clean. Rockchip's YOLOv5 demo found four people and a bus in `bus.jpg` in
50.5 ms, the same boxes as the PC simulator (bus 0.692 on the board, 0.693 simulated). That was at
594 MHz; at 1 GHz the next day it took 36.0 ms (see
[the NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }})). The number I cared about
more: during five runs, with the NPU hammering the DRAM core 3 shares, the 1 kHz task woke at most
4.7 µs late.

### 5. The traps

**`2207:350a` doesn't mean Maskrom.** My NOR flasher waits for the Maskrom ID after a reset, and U-Boot's
fastboot gadget uses the same vendor and product IDs, so `lsusb` can't tell them apart.
`fastboot devices` can: it lists the board only when it's U-Boot.

**Getting back to Maskrom from Debian.** A CRU reset from Linux after writing the BootROM's "stay in
Maskrom" word never showed a USB device, and once left the board silent until a power cycle. U-Boot's
reset goes through BL31 and keeps that word, so a script catches U-Boot's prompt and types `mw.l` and
`reset` one character every 2 ms. Debian to Maskrom to a verified NOR, and a login prompt 12.4 s
after the reset, without touching the board.

**A board that resets itself while booting.** After two 1280x720 webcams ran at once, the kernel died
at 0.74 s or 3.39 s on every boot while U-Boot alone stayed up for 240 s. Booting by hand from U-Boot
with services masked didn't stop it; I suspect the supply but haven't measured it.

## Result

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/rock3a/r3a_debian13_npu_169_poster.jpg' | relative_url }}" style="width:100%;max-width:720px"><source src="{{ '/assets/videos/boards/rock3a/r3a_debian13_npu_169.mp4' | relative_url }}" type="video/mp4"></video>

*From my facecam film (Vietnamese narration, 76 s): Debian 13 written to the eMMC next to FreeRTOS on core 3, the NPU driver's four errors, the clock fix (YOLOv5s 50.5 → 36.0 ms) and the last model layers moved off the CPU.*

Debian 13 runs from the eMMC on cores 0 to 2 under mainline 7.2.11, while FreeRTOS keeps core 3 from
the NOR chain that hands it over at 0.154 s (timed on the earlier build; I didn't re-time it with
U-Boot behind it) and never notices Linux arriving. Debian came up the first time on the board:

```
Debian GNU/Linux 13 rock3a ttyS2
rock3a login:
```

(host name changed for the post; the kernel's clock said 13.1 s at that prompt.)

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

The NPU part, the one I wasn't sure about at all when I started, works without any vendor kernel: an
out-of-tree GPL driver with one patch, a 77-line DT overlay, and Rockchip's own runtime and demo on
top, giving the same detections as on their tools.

What it doesn't do, plainly:

- Console only. No desktop, no display stack in this image. I haven't tried the Mali-G52 or the
  video codecs on this kernel, so I can't say how far mainline gets with them here.
- No IOMMU for the NPU. Its buffers come from a fixed 256 MiB CMA pool. Big models, or several at
  once, will run out of it before they'd run out of RAM.
- One fixed NPU clock. No devfreq: the NPU sits at whatever rate the DT assigns through BL31's SCMI
  clock (1 GHz now). The CRU's `CLK_NPU` has no effect on this chain.
- The filesystem grow step has been done by hand once; its systemd unit exists but hasn't run on
  the board yet.
- The reset loop after the two-webcam run is not explained yet.

## What I'd do next

The 50.5 to 36.0 ms change says the CPU side and the memory path matter for the NPU here, and I haven't
measured where the remaining time goes. I'd also like to put the eMMC driver into `nsloader`, so the
small Linux and this Debian can share one kernel on the eMMC instead of one on the NOR. And the reset
loop needs a meter on the 5 V rail, which means hands on the board.

This split also costs Linux one of its four Cortex-A55 cores. The RK3568 has another place to put a
real-time job: its own small RISC-V MCU core. I took that route later, with FreeRTOS on the RV32 core
and Linux keeping all four A55 cores, in
[A WS2812 ring from the RK3568's RISC-V MCU, with Android on all four A55s]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }}),
and later had it watch a webcam on its own while the A55s are powered off, in
[The RISC-V MCU keeps watch]({{ '/embedded/boards/rock3a/mcu-camera-wake' | relative_url }}).

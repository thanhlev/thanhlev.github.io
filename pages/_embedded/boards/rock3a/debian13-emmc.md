---
layout: default
title: "My own Debian 13 on the eMMC, next to FreeRTOS on core 3"
short_description: "Mainline Linux 7.2.11 and a self-built Debian 13 on cores 0-2, booted by U-Boot from the NOR chain that already gave core 3 to FreeRTOS, and Rockchip's NPU driver ported to it"
status: "Done"
picture: "assets/images/boards/rock3a/rock3a_debian13_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-24: NPU probes clean under mainline 7.2.11, YOLOv5s runs next to the RTOS"
index: 12.5
publish: true
permalink: /embedded/boards/rock3a/debian13-emmc
board_parent: rock3a
result: "Debian 13 on cores 0-2 with FreeRTOS on core 3 the whole time; eMMC written in 60.4 s (rockusb: 16 % in 8 min); YOLOv5s on the NPU 50.5 ms, RTOS 1 kHz task max 4.7 µs late"
tags: [rockchip, arm, linux, freertos, npu, bare-metal]
---

# My own Debian 13 on the eMMC, next to FreeRTOS on core 3

![Debian 13 next to FreeRTOS on the ROCK 3A]({{ '/assets/images/boards/rock3a/rock3a_debian13_cover.jpg' | relative_url }})
*The result first: Debian 13 on cores 0-2 while FreeRTOS keeps core 3, its 1 kHz task never more than 4.7 µs late.*

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![Power-on to a Debian login, core 0 path and core 3 path]({{ '/assets/images/boards/rock3a/debian_boot_chain.png' | relative_url }})

One boot of the finished image. Core 0 walks the top row from the BootROM to Debian; core 3 drops out
before the DDR blob runs and never comes back to Linux. If the eMMC has no `extlinux.conf`, U-Boot
waits in fastboot instead, which is how I write the eMMC in 60 seconds.

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

The three storage layers of the finished image (not to scale). The NOR keeps only the boot chain and
U-Boot now; the kernel moved to the eMMC. In DRAM, FreeRTOS and its 1 MiB shared window are carved out
with `no-map`, and the fastboot buffer sits well below them.

## Action

### 1. The boot chain: U-Boot goes after BL31, not before it

The obvious way to boot Debian on an RK3568 is U-Boot's own chain: TPL (the DDR blob), SPL, then
TF-A and U-Boot proper. I couldn't use it. FreeRTOS has to get core 3 before anything else runs, and
the stages that do that are mine: `rt_init` starts the core 3 loop in PMU SRAM and then runs Rockchip's
DDR blob, `tramp` places the RTOS image at `0x30000000`, and a patched BL31 hands core 3 over.
U-Boot's SPL would want to own exactly those steps.

So U-Boot comes in where Linux used to: as the payload my `nsloader` (BL33) reads from NOR
`0x100000`. All U-Boot has to do now is find a kernel. `nsloader` copies the payload raw to an
address and jumps there, and the Makefile points it at U-Boot's `CONFIG_TEXT_BASE`. It reads U-Boot
in 226 ms:

```
NOTICE:  BL31: core 3 runs rt_sram's loop, left on; Group 1 NS forwarded
NOTICE:  BL31: core 3 asked to start the RTOS at 0x30000000
nsloader: read 226 ms (4782 KB/s), CRC ok; U-Boot
[    0.000000] Kernel command line: root=/dev/mmcblk0p1 rootwait rw console=ttyS2,1500000 maxcpus=3 clk_ignore_unused cma=256M panic=10 nokaslr
```

The kernel no longer lives on the NOR at all. That's a nice side effect: the NOR image is now about
2 MB (idblock plus U-Boot) instead of carrying a 6.5 MB kernel, and the kernel can change without
rewriting the NOR.

On the Linux side, three things keep it away from core 3. `maxcpus=3` on the command line, so Linux
never brings core 3 online. The DT overlay from the AMP work, which reserves the RTOS and its window
as `no-map`:

```dts
/* amp/linux/dts/rock3a-amp.dtso:29-38 */
			amp_image: amp-rtos@30000000 {
				compatible = "rock3a,amp-image";
				reg = <0x0 0x30000000 0x0 0x01000000>;
				no-map;
			};
			amp_shm: amp-shm@31000000 {
				compatible = "rock3a,amp-shm";
				reg = <0x0 0x31000000 0x0 0x00100000>;
				no-map;
			};
```

`no-map` matters more than it looks. A plain reservation only keeps the allocator away; the pages
would still sit in Linux's linear map, and an A55 is allowed to fetch speculatively from anything
mapped as normal memory. With `no-map` cores 0 to 2 have no mapping at all for FreeRTOS's 16 MiB, so
they can't touch it even by accident. The first boot confirmed both regions:

```
[    0.000000] Machine model: Radxa ROCK 3A
[    0.000000] OF: reserved mem: 0x0000000031000000..0x00000000310fffff (1024 KiB) nomap non-reusable amp-shm@31000000
[    0.000000] OF: reserved mem: 0x0000000030000000..0x0000000030ffffff (16384 KiB) nomap non-reusable amp-rtos@30000000
```

The third thing is the kernel config. The Debian kernel is arm64 `defconfig` plus a fragment of mine,
and the fragment's job is mostly to switch things off: no cpuidle (a cluster power-down would take
core 3 with it), no CPU hotplug (nobody may `CPU_ON` core 3), no suspend. Kconfig has a habit of
dragging these back in through `select` (ACPI selects CPU_IDLE, PM_SLEEP_SMP selects HOTPLUG_CPU), so
the Makefile refuses to build if any of them sneaks back:

```make
# debian/Makefile:41-43
	@for c in CPU_IDLE HOTPLUG_CPU SUSPEND ACPI CPU_FREQ_GOV_SCHEDUTIL CPU_FREQ_GOV_ONDEMAND CPU_FREQ_GOV_USERSPACE; do \
	    ! grep -q "^CONFIG_$$c=y" $@ || { echo "$$c is on"; exit 1; }; done
	@grep -q '^CONFIG_CPU_FREQ_DEFAULT_GOV_PERFORMANCE=y' $@ || { echo "cpufreq governor is not performance"; exit 1; }
```

The cpufreq lines are there for the same reason. The four A55s share one clock, set by BL31 over
SCMI. A governor that follows Linux's load would also move the clock under the RTOS. With only
`performance`, the clock goes to the top OPP once at boot and stays there; I checked
`total_trans` and it reads 1.

Everything the board needs to reach a root filesystem (eMMC host, ext4, the 8250 UART, the RK809
regulators, the power domains) is built in, so there's no initramfs.

### 2. U-Boot 2026.07: sysboot, and fastboot when there's nothing to boot

U-Boot is mainline 2026.07 with `rock-3a-rk3568_defconfig` plus a small fragment. The boot command
is one line: try the eMMC, and if that fails, say why and become a fastboot device on the OTG port.

```
# debian/uboot.config:6-9
CONFIG_BOOTDELAY=0
# sysboot reads extlinux.conf (the defconfig leaves the command out: bootstd does it its own way)
CONFIG_CMD_SYSBOOT=y
CONFIG_BOOTCOMMAND="sysboot mmc 0:1 any ${scriptaddr} /boot/extlinux/extlinux.conf; echo 'no Debian on mmc 0: fastboot (fastboot flash mmc0 disk.simg)'; fastboot usb 0"
```

I chose `sysboot` over bootstd's bootflow scan on purpose. The scan walks every boot device it knows,
PCIe included, and I only ever want one: partition 1 of the eMMC. `sysboot` reads the
`extlinux.conf` from there and nothing else. The catch was that the rock-3a defconfig leaves the
command out, which I found the first time the board booted the image:

```
Hit any key to stop autoboot: 0
Unknown command 'sysboot' - try 'help'
no Debian on mmc 0: fastboot (fastboot flash mmc0 disk.simg)
```

The fallback did exactly what it was there for, at least. `CONFIG_CMD_SYSBOOT=y`, NOR written again,
and it booted. Reading from the eMMC is not where the time goes: an `ext4load` of the 40 073 728-byte
kernel takes 310 ms (123.3 MiB/s), the DTB 15 ms.

The fastboot part needed more thought, because U-Boot runs with FreeRTOS already alive in DRAM:

```
# debian/uboot.config:17-27
# fastboot: a 256 MiB download buffer at 0x10000000 (below the RTOS at 0x30000000 and its window),
# sparse images, the whole eMMC user area as "mmc0"
CONFIG_USB_FUNCTION_FASTBOOT=y
CONFIG_CMD_FASTBOOT=y
CONFIG_FASTBOOT_BUF_ADDR=0x10000000
CONFIG_FASTBOOT_BUF_SIZE=0x10000000
CONFIG_FASTBOOT_FLASH=y
CONFIG_FASTBOOT_FLASH_MMC=y
CONFIG_FASTBOOT_FLASH_MMC_DEV=0
CONFIG_FASTBOOT_MMC_USER_SUPPORT=y
CONFIG_FASTBOOT_MMC_USER_NAME="mmc0"
```

The download buffer is 256 MiB at 256 MiB, which ends at `0x20000000`, a clean 256 MiB below the
RTOS. A bigger buffer means fewer round trips (the PC split my image into two), but it must never
grow into `0x30000000`: U-Boot doesn't know the RTOS is there, and a fastboot download over FreeRTOS
would kill core 3 mid-loop with no message at all. Naming the whole user area `mmc0` lets me write
one disk image with its GPT, instead of partition by partition.

U-Boot's DTB needed a patch too. Its OTG controller node lists the USB 3 combo PHY, and with that in
`phys` the gadget never connected to the PC. The Makefile rewrites the DTB that gets appended to
U-Boot: device mode, high speed, USB 2 PHY only, and the blue LED disabled because it belongs to the
RTOS (it's how core 3 tells me it's alive):

```make
# debian/Makefile:180-187
$(B)/u-boot-amp.bin: $(B)/u-boot/u-boot.bin
	cp $(B)/u-boot/u-boot.dtb $(B)/u-boot-amp.dtb
	fdtput -t s $(B)/u-boot-amp.dtb /usb@fcc00000 dr_mode peripheral
	fdtput -t s $(B)/u-boot-amp.dtb /usb@fcc00000 maximum-speed high-speed
	fdtput -t x $(B)/u-boot-amp.dtb /usb@fcc00000 phys $$(fdtget -t x $(B)/u-boot-amp.dtb /usb2phy@fe8a0000/otg-port phandle)
	fdtput -t s $(B)/u-boot-amp.dtb /usb@fcc00000 phy-names usb2-phy
	fdtput -t s $(B)/u-boot-amp.dtb /leds status disabled
	cat $(B)/u-boot/u-boot-nodtb.bin $(B)/u-boot-amp.dtb > $@
```

### 3. A Debian rootfs with no root: debootstrap in two halves

Normally you build an arm64 rootfs on x86 with `debootstrap` plus `qemu-user-static` in a chroot.
Without root I had neither. What I could do is split debootstrap the way it was designed to be split.
`--foreign` only downloads and unpacks the packages, which needs no emulation, and `fakeroot -s`
records the ownership it would have set (everything root-owned) in a state file:

```make
# debian/Makefile:115-117
	fakeroot -s $(B)/fakeroot.state debootstrap --foreign --arch=arm64 --variant=minbase \
	    --keyring=$(B)/keyring/x/usr/share/keyrings/debian-archive-keyring.gpg --include=$(PKGS) \
	    trixie $(B)/rootfs http://deb.debian.org/debian > $(B)/debootstrap.log 2>&1
```

Then the kernel's `modules_install`, my modules, the NPU runtime and my tools go into the same tree
inside the same fakeroot session, and `mke2fs -d` builds the ext4 image from the directory, still in
that session, so the files in the image are owned by root even though no process of mine ever was.
The keyring comes from Debian's pool as a `.deb`, unpacked with `dpkg-deb -x`; no system keyring
needed either.

The second half, which runs the package maintainer scripts, has to execute arm64 code, so it runs on
the board. The image boots once with `init=/sbin/rock3a-firstboot`, a shell script as PID 1:

```sh
# debian/files/rock3a-firstboot:11
/debootstrap/debootstrap --second-stage || { echo "SECOND STAGE FAILED: /debootstrap/debootstrap.log"; exec /bin/sh; }
# ...
# debian/files/rock3a-firstboot:31-36
printf ', +\n' | sfdisk -N 1 --no-reread /dev/mmcblk0
systemctl enable rock3a-growfs.service
sed -i 's/^DEFAULT firstboot/DEFAULT debian/' /boot/extlinux/extlinux.conf
rm -rf /debootstrap
sync
echo "rock3a-firstboot: done, rebooting into Debian"
# ...
# debian/files/rock3a-firstboot:40
echo b > /proc/sysrq-trigger
```

The A55s configured the whole base system natively in about ten minutes (I never had qemu to
compare with). After that, the script writes the host name, fstab,
apt sources, a user, locales and a networkd config, runs `depmod` and `ldconfig`, and enables ssh and
my AMP unit.

`extlinux.conf` has two labels for this. The image ships with `DEFAULT firstboot`, which adds the
`init=`; the script flips it to `debian` before it reboots:

```sh
# debian/Makefile:156-160 (the lines that write extlinux.conf)
	    { echo "DEFAULT firstboot"; echo "TIMEOUT 0"; \
	      echo "LABEL debian"; echo "  KERNEL /boot/Image-$$rel"; echo "  FDT /boot/rk3568-rock-3a-amp.dtb"; \
	      echo "  APPEND root=/dev/mmcblk0p1 rootwait rw console=ttyS2,1500000 maxcpus=3 clk_ignore_unused cma=256M panic=10 nokaslr"; \
	      echo "LABEL firstboot"; echo "  KERNEL /boot/Image-$$rel"; echo "  FDT /boot/rk3568-rock-3a-amp.dtb"; \
	      echo "  APPEND root=/dev/mmcblk0p1 rootwait rw console=ttyS2,1500000 maxcpus=3 clk_ignore_unused cma=256M panic=10 nokaslr init=/sbin/rock3a-firstboot"; \
```

Two more details in that `APPEND` line. `cma=256M` is where the NPU driver gets its buffers, since it
runs without an IOMMU (more below). `clk_ignore_unused` stops Linux from switching off clocks it has
no driver for: clocks it doesn't know about stay running.

The image is small on purpose: a 2 GiB root partition at sector 32768 (16 MiB, room for the GPT and
then some), because every byte of it has to cross USB. On the first boot `sfdisk` grows partition 1 to
the end of the eMMC:

```
Old situation:
/dev/mmcblk0p1 32768 4227071 4194304   2G Linux filesystem
New situation:
/dev/mmcblk0p1 32768 30310366 30277599 14.4G Linux filesystem
```

That last line of the script, `echo b > /proc/sysrq-trigger`, is the second version. The first one
said `reboot -f`, which under `init=` asks systemd to reboot, and systemd isn't running. `reboot`
returned, the script ended, PID 1 exited, and the kernel did what it always does then:

```
rock3a-firstboot: done, rebooting into Debian
+ reboot -f
[  643.353616] Kernel panic - not syncing: Attempted to kill init! exitcode=0x00000000
```

`panic=10` rebooted it anyway, so no harm done, but the sysrq reset is the kernel resetting itself
with nobody else involved, which is what I meant in the first place. Growing the filesystem inside the
script failed too: `resize2fs` complained about a missing mtab, and the kernel still had the old
partition size (the table was busy). That step moved to a one-shot systemd unit for the next boot.
To be straight about it: I grew the filesystem by hand once with `resize2fs`, and the unit that should
do it has been written but has never run on the board yet.

One more build bug worth a line, because it's the kind that hides. When I later rebuilt the image on a
second machine, debootstrap stopped with `E: No such script`. The package list had been written as
`a,b,\` over three lines, make turned each backslash-newline into a space, and debootstrap read the
second half of the list as the suite name. The list is now plain words, joined with commas by make
itself:

```make
# debian/Makefile:104-108
PKGS_LIST := systemd systemd-sysv systemd-timesyncd systemd-resolved udev dbus kmod iproute2 iputils-ping netbase \
	ca-certificates openssh-server sudo less nano procps psmisc file wget curl i2c-tools usbutils pciutils \
	python3 python3-numpy locales bash-completion e2fsprogs fdisk
comma := ,
PKGS := $(subst $() $(),$(comma),$(strip $(PKGS_LIST)))
```

### 4. Writing the eMMC: my own sparse image, 60 seconds

![rockusb against fastboot with a sparse image]({{ '/assets/images/boards/rock3a/debian_emmc_write.png' | relative_url }})

Both measured on the board. rockusb from Maskrom reached 16 % in about eight minutes and I stopped it;
the dashed part is that pace continued (my estimate, never run). Fastboot with my sparse image wrote
the whole thing in 60.4 s, and only 403.6 MiB of it went over the cable.

I first wrote the image the Rockchip way, `rkdeveloptool wl` from Maskrom. It moves 64 KiB per USB
command (its default of 128 sectors), and it crawled at about 0.7 MB/s. After eight minutes it said
16 %. I stopped it there.

That's why U-Boot got fastboot. Fastboot takes Android sparse images, and a sparse image can say
"this run of blocks is all zeros" in 16 bytes instead of sending the zeros. My 2 GiB disk image is
mostly empty ext4, so that matters. The PC has no `img2simg` and I couldn't install one, so
I wrote the converter. It's 42 lines; the core is this:

```python
# debian/mksparse.py:23-40
chunks, i = [], 0
while i < nblk:
    z = data[i * BLK:(i + 1) * BLK] == zero
    j = i + 1
    while j < nblk and (data[j * BLK:(j + 1) * BLK] == zero) == z:
        j += 1
    chunks.append((z, i, j))
    i = j
with open(dst, 'wb') as o:
    o.write(struct.pack('<IHHHHIIII', 0xED26FF3A, 1, 0, 28, 12, BLK, nblk, len(chunks), 0))
    raw = 0
    for z, a, b in chunks:
        if z:
            o.write(struct.pack('<HHII', FILL, 0, b - a, 12 + 4) + b'\0\0\0\0')
        else:
            o.write(struct.pack('<HHII', RAW, 0, b - a, 12 + (b - a) * BLK))
            o.write(data[a * BLK:b * BLK])
            raw += b - a
```

It walks the image in 4 KiB blocks and groups them into runs of "all zero" or "has data". The header
is the one from AOSP's `sparse_format.h`: magic `0xED26FF3A`, version 1.0, a 28-byte file header,
12-byte chunk headers. Data runs go out as RAW chunks.

The one real decision is the zero runs. Sparse images also have a DONT_CARE chunk, which means "skip
these blocks". It would be faster still, but it leaves whatever an earlier image wrote on the eMMC,
and ext4 expects its inode tables and journal to start as zeros. So zero runs are FILL chunks with the
value 0: U-Boot writes the zeros itself, on the board, and the eMMC ends up equal to the raw image
block for block.

The result, from the real run:

```
disk.simg: 528640 blocks, 27 chunks, 403.6 MiB of data (1661.4 MiB of zeros left to U-Boot)
Sending sparse 'mmc0' 1/2 (262140 KB)              OKAY [ 15.735s]
Writing 'mmc0'                                     OKAY [  5.087s]
Sending sparse 'mmc0' 2/2 (151128 KB)              OKAY [  7.567s]
Writing 'mmc0'                                     OKAY [ 30.484s]
Finished. Total time: 60.369s
```

The first send is 262 140 KB, just under the 256 MiB buffer, the second takes the rest. The second
write is the long one; my guess is that it carries most of the FILL runs, 1.6 GiB of zeros that the
eMMC still has to store even though they never touched the USB cable. I didn't time the chunks one by
one.

### 5. Talking to the RTOS from Debian

The AMP kernel module (`amp_ctl.ko`) is the only bridge between the two worlds, and it doesn't start
or stop anything. It checks that both reserved regions are there and `no-map`, then attaches to
the RTOS that is already running and exposes the shared window as `/dev/amp`. A systemd unit loads it
early, before `sysinit.target`.

The RTOS has a shell of its own on core 3, and from Debian I reach it with a small console tool, through two byte rings in the shared window. One ring
carries bytes from Linux to the RTOS, the other back; each is 32 KiB, and the tool maps them from
`/dev/amp`. On the RTOS side one task owns the console: it reads the incoming ring, feeds the line
editor, and writes the command's output into the outgoing ring. Because a single task owns all of it,
nothing on that side needs a lock.

What travels over the rings isn't raw keystrokes. It's a framed send/receive protocol I wrote myself
earlier, and its link layer is abstract: the protocol code doesn't care whether the bytes go over a
UART, SPI, I2C or, as here, shared memory. For this board I only had to write a new link, the two rings
in the window; the protocol itself didn't change. A command that prints more than the RTOS's output
buffer holds simply waits for room on the link instead of dropping text. The link also has a reset
line: a session counter in the Linux half of the window. When the console tool starts, it bumps the
counter, and the RTOS restarts its end of the link when it sees a new value. That's what lets the
tool come and go as often as I like, in any terminal Linux gives it (the UART, an ssh session), with
no state left over from the last run. It has three modes: interactive, where the terminal goes raw and
every key goes to the RTOS shell until Ctrl-] drops me back to bash; `-c "<cmd>"`, which types one
command, prints the answer up to the next prompt and exits (that's what my scripts use); and `-s`,
which prints the link's counters.

The first time I tried it as my normal user, it failed with `Permission denied`: the module creates
`/dev/amp` as 0600. A one-line udev rule gives it to `dialout`, the group that already means "may
talk to serial ports" on Debian:

```
# debian/files/60-rock3a-amp.rules:7
KERNEL=="amp", SUBSYSTEM=="misc", GROUP="dialout", MODE="0660"
```

### 6. The NPU under mainline: four errors, each hiding the next

![The NPU stack and where each error came from]({{ '/assets/images/boards/rock3a/debian_npu_fixes.png' | relative_url }})

Top to bottom, what one inference goes through. The red badges are where each probe error came from;
the green lines on the right are what fixed it. Errors 2 and 3 came out of the same boot.

Mainline has an NPU driver now, but only for the RK3588 (`rocket`). For the RK3568 there is nothing
upstream. What exists is Rockchip's `rknpu`, which is GPL source in their kernel tree, and the
`librknnrt.so` runtime, which is a closed binary. Apps talk to the runtime, the runtime talks to the
driver through DRM ioctls, and the runtime only works with Rockchip's driver. So the plan was: take
the newest `rknpu` (0.9.8 from the `develop-6.12` branch; the version number hasn't moved since
August 2024, but the branch still gets fixes), build it out of tree against 7.2.11, and give it a
device tree node, since mainline's RK3568 DT has none.

Building it was ordinary porting work, the kind where each error is one kernel API that moved:
`drm_driver.date` is gone in 6.14, `hrtimer_init()` became `hrtimer_setup()` in 6.15, module
namespaces became strings in 6.13, and two vendor-only helpers (an nvmem reader and devfreq's private
`governor.h`) don't exist in mainline. The three API changes are guarded by kernel version checks,
so the same source still builds on older kernels; the two missing helpers are simply stubbed out. I left the vendor devfreq code out completely and
put a few compat headers next to the driver for the Rockchip includes it expects.

I wrote the DT node from Rockchip's `rk356x.dtsi` with mainline's names, and made one choice there on
purpose: **no IOMMU**. Rockchip's node points at their IOMMU driver, which isn't in mainline. Without
an `iommus` property the driver falls back to physically contiguous buffers from CMA, hence the
`cma=256M`. None of its IOMMU code runs.

Then it didn't probe, four times in a row, each time for a different reason, and each fix only
uncovered the next one:

| # | What dmesg said | What was really wrong | Fix |
|---|---|---|---|
| 1 | `probe with driver RKNPU failed with error -110` | mainline's `rk356x-base.dtsi` has no `PD_NPU` power domain, so genpd has no provider and deferred probe times out | add `power-domain@RK3568_PD_NPU` in the overlay |
| 2 | `failed to get ack on domain 'npu', val=0x1fe`, then a synchronous external abort | genpd powers the domain on before rknpu's probe turns on `vdd_npu`, so the NPU's bus has no power to answer | `vdd_npu` `regulator-always-on` |
| 3 | `error -ENXIO: IRQ npu_irq not found` | the driver asks for its interrupt by name | `interrupt-names = "npu_irq"` |
| 4 | `failed to get pm runtime for rknpu, ret: -95` | without Rockchip's devfreq, the runtime-PM stubs return `-EOPNOTSUPP` | stubs return 0 (in my patch) |

The first one was a gap in mainline's DT: the power controller driver (`pm-domains.c`) knows the NPU
domain, but the dtsi never lists it, so nothing could ever provide it. I copied the node from
Rockchip's tree:

```dts
/* debian/dts/rock3a-npu.dtso:24-31 */
&power {
	power-domain@RK3568_PD_NPU {
		reg = <RK3568_PD_NPU>;
		clocks = <&cru ACLK_NPU_PRE>, <&cru HCLK_NPU_PRE>, <&cru PCLK_NPU_PRE>;
		pm_qos = <&qos_npu>;
		#power-domain-cells = <0>;
	};
};
```

The second one was the interesting one, and the scariest, because it ended in an external abort
inside `regmap_mmio_read32le`. The order of events: when the device is attached to its power domain,
genpd switches the domain on and waits for the NPU's bus to acknowledge. Only later does rknpu's own
probe enable its supply, `vdd_npu`. So the domain was powered with its rail still off, the handshake
timed out, and the power-off path then read the NPU's QoS registers on a bus with no power behind it.
The clean fix would be a `domain-supply` on the power domain, but mainline's `pm-domains.c` doesn't
take one for any RK3568 domain (`need_regulator` is false). So the rail is simply on from boot:

```dts
/* debian/dts/rock3a-npu.dtso:45-50 */
&vdd_npu {
	regulator-always-on;
	regulator-boot-on;
	regulator-min-microvolt = <1000000>;
	regulator-max-microvolt = <1000000>;
};
```

The driver still enables the supply itself; `always-on` only makes sure it's already on when genpd
gets there. (At the time it was 0.9 V; it went to 1.0 V a day later with the clock change below.)

The third one showed up in the same boot as the second, a few lines further down the log. Rockchip's
dtsi uses `interrupts` and the driver uses `platform_get_irq_byname()`, so the name has to be there:

```dts
/* debian/dts/rock3a-npu.dtso:56-63 */
	rknpu: npu@fde40000 {
		compatible = "rockchip,rk3568-rknpu", "rockchip,rknpu";
		reg = <0x0 0xfde40000 0x0 0x10000>;
		interrupts = <GIC_SPI 151 IRQ_TYPE_LEVEL_HIGH>;
		/* 2026-10-24: the driver asks for it by name ("error -ENXIO: IRQ npu_irq not found") */
		interrupt-names = "npu_irq";
		clocks = <&scmi_clk SCMI_CLK_NPU>, <&cru CLK_NPU>, <&cru ACLK_NPU>, <&cru HCLK_NPU>;
		clock-names = "scmi_clk", "clk", "aclk", "hclk";
```

The fourth one was in the driver, and it's a bug that can only exist outside Rockchip's kernels.
rknpu's runtime-PM callbacks call into its devfreq code. When devfreq isn't built, they're inline
stubs that return `-EOPNOTSUPP`. Rockchip always builds devfreq, so nobody ever ran those stubs. I
did, and every `pm_runtime_get_sync()` failed with -95. With no devfreq there's nothing to save or
restore, so success is the honest answer:

```c
/* debian/rknpu/src/include/rknpu_devfreq.h, from mainline-7.2.patch:23-33 */
 static inline int rknpu_devfreq_runtime_suspend(struct device *dev)
 {
-	return -EOPNOTSUPP;
+	return 0;
 }
 
 static inline int rknpu_devfreq_runtime_resume(struct device *dev)
 {
-	return -EOPNOTSUPP;
+	return 0;
 }
```

One thing slowed this down more than it should have. After a failed probe, reloading the module is
no shortcut: the failed attempt leaves runtime PM unbalanced, and the next `insmod` only says
`Unbalanced pm_runtime_enable!` and fails with -22, a fifth error that isn't real. Every test after a
failure has to be a reboot. The boot after fix 4 probed clean:

```
[    5.762541] rknpu: loading out-of-tree module taints kernel.
[    5.765528] RKNPU fde40000.npu: RKNPU: rknpu iommu device-tree entry not found!, using non-iommu mode
[    5.801834] [drm] Initialized rknpu 0.9.8 for fde40000.npu on minor 0
```

"iommu device-tree entry not found" is the line I wanted: no IOMMU on purpose, CMA buffers. To test
the whole stack I cross-built the YOLOv5 C demo from Rockchip's model zoo with GCC 14 (its older C
needed three warnings turned back from errors), put it with an INT8 YOLOv5s model in the image, and
ran it on the standard `bus.jpg`:

```
D RKNN: [09:52:50.257] Total Operator Elapsed Per Frame Time(us): 50508
person @ (209 243 286 510) 0.880
person @ (479 238 560 526) 0.871
person @ (109 238 231 534) 0.840
bus @ (91 129 555 464) 0.692
person @ (79 353 121 517) 0.301
```

Four people and a bus, the same boxes the toolkit's PC simulator had given for this model (bus 0.692
on the board, 0.693 in the simulator). The NPU was running at 594 MHz at that point, though, and the
CPU at U-Boot's 816 MHz. Setting the CRU's `CLK_NPU` did nothing: on this chain the NPU's rate is an
SCMI clock owned by BL31, so the DT asks for that one instead. The day after, at 1 GHz (1.0 V) and with
the CPU at 1992 MHz, the same frame took 36.0 ms. That tuning, and how the NPU compares with Radxa's
images, is in [the NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }}).

The number I cared about most wasn't the inference time, though. The NPU hammers the DRAM, and core 3
shares that DRAM. So I reset the RTOS's latency counters, ran YOLOv5s five times, and read them back:

```
  rt task: period 1000 us, 5958 samples, wake-up latency min 1166 avg 1424 max 4708 ns, 0 overruns
    <=    2000 ns: 5932
    <=    5000 ns: 26
```

Under the NPU's memory traffic the 1 kHz task woke up at most 4.7 µs late, and 5932 of 5958 wake-ups
were under 2 µs.

### 7. The traps

A few things cost me more time than the real work, and they're all the kind that would bite again.

**`2207:350a` doesn't mean Maskrom.** The flasher I use for the NOR waits for the RK3568's Maskrom ID,
`2207:350a`, to come back after a reset. U-Boot's USB gadget is configured with the same vendor and
product IDs (`CONFIG_USB_GADGET_VENDOR_NUM=0x2207`, `PRODUCT_NUM=0x350a` in my config), so when
U-Boot fell through to fastboot, `lsusb` showed exactly the same device. The tell is `fastboot devices`: it lists the board only when it's U-Boot.

**Getting back to Maskrom from Debian.** With no hands on the board, a bad NOR write has to be fixed
from software. My first idea was a tiny tool on Debian that writes the BootROM's boot-mode word
(`0xEF08A53C` at `0xFDC20200`, "stay in Maskrom") and resets through the CRU. The board did reset, but
the PC never saw a USB device. A second attempt switched the OTG VBUS off first (under Debian the port
is a host, and the GPIO driving its VBUS sits in the PMU domain, which a CRU reset leaves alone) and
put the PLLs into slow mode the way BL31's own reset does. That one left the board completely silent,
and it needed a power cycle. I dropped the tool. What works is going through U-Boot, whose reset is
BL31's PSCI reset and keeps that word: a script reboots Debian, sends Ctrl-C every 20 ms until it sees
U-Boot's prompt, then types the two commands one character every 2 ms (U-Boot's console has no FIFO
to spare at 1.5 Mbaud):

```python
# debian/to_maskrom.py:44-47
for c in b'mw.l 0xfdc20200 0xef08a53c; reset\r':
    s.write(bytes([c]))
    time.sleep(0.002)
for _ in range(30):
```

```
to_maskrom: Maskrom: Bus 003 Device 112: ID 2207:350a Fuzhou Rockchip Electronics Company
-- program ......... 2098338 bytes  (8197 ms)
-- [  OK  ] read back 0x000000..0x209000: image at 0x008000, 0xff elsewhere
```

Debian to Maskrom to a verified NOR, and back to a login prompt 12.4 s after the reset, without
touching the board.

**A board that resets itself while booting.** Later, after running two 1280x720 webcams at once, the
board went into a reset loop: the kernel died at 0.74 s or 3.39 s on every boot, no panic message,
while U-Boot alone stayed up for 240 s without one reset. A misbehaving service you can't log in to
fast enough is normally a reflash, so I wrote a script that catches U-Boot and boots the kernel by
hand, the way `sysboot` would, with extra arguments like `systemd.mask=facecam.service` or
`initcall_blacklist=rockchip_thermal_driver_init`. Neither stopped it, the PMIC logged no power-off
reason, and the cause is still open (I suspect the supply, but I haven't measured it). The escape
hatch stays, though. It works for any boot loop that comes from Linux.

## Result

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
[FreeRTOS on RISC-V MCU, Linux on full 4 Cortex-A55 cores]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }}).

## Skills this project used

- Boot chain and firmware: reading the RK3568 boot flow (BootROM idblock, DDR blob, TF-A BL31,
  BL33), fitting U-Boot in as a raw BL33 payload behind my own loader, getting back to Maskrom
  through the boot-mode word and PSCI reset (section 1, traps).
- Device tree: writing overlays against mainline's labels (`-@`), `reserved-memory` with
  `no-map` and why it matters for speculation, a power-domain node from a vendor tree, patching
  U-Boot's DTB with `fdtput` (sections 1, 2, 6).
- Kernel configuration for AMP: keeping CPU idle, hotplug and suspend off despite Kconfig selects,
  a single fixed cpufreq governor for a clock shared with the RTOS, a build that checks itself
  (section 1).
- Driver porting: an out-of-tree vendor module across five kernel API changes, and debugging
  genpd, regulators and runtime PM from dmesg alone, including an external abort (section 6).
- U-Boot: Kconfig fragments, `sysboot`/extlinux, the fastboot gadget, a DRAM layout that stays
  clear of a running RTOS (section 2).
- Build systems without root: debootstrap split across PC and board, fakeroot state carried into
  `mke2fs -d`, make quoting bugs (section 3).
- Tools and formats: the Android sparse format from its header, written in 42 lines of Python;
  UART automation that types into U-Boot reliably at 1.5 Mbaud (sections 4, 7).
- Linux/RTOS IPC: a console carried over shared-memory rings, a session reset so the Linux side can
  come and go, udev permissions (section 5).
- Measuring instead of guessing: every number on this page comes from a log on the board,
  including the RTOS latency while the NPU loads the memory bus.

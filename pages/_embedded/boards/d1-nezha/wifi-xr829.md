---
layout: default
title: "XR829 Wi-Fi on mainline Linux 6.8: 2 to 22 Mbit/s once the console went quiet"
short_description: "A community port of the vendor driver, booted through my own FEL chain, five bugs before a ping, then one printk"
status: "Done"
picture: "assets/images/boards/d1-nezha/d1_wifi_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-01: 22 Mbit/s both ways"
index: 50
publish: true
permalink: /embedded/boards/d1-nezha/wifi-xr829
board_parent: d1-nezha
result: "WPA2 + DHCP + TCP on mainline 6.8; PC -> board 2.1 -> 22 Mbit/s once the console went quiet"
tags: [allwinner, risc-v, bare-metal, linux, boot, wifi]
---

# XR829 Wi-Fi on mainline Linux 6.8: 2 to 22 Mbit/s once the console went quiet

[Back to the D1 Nezha hub]({{ '/embedded/boards/d1-nezha/' | relative_url }}) · measured 2026-10-01

![The result first]({{ '/assets/images/boards/d1-nezha/d1_wifi_cover.jpg' | relative_url }})
*The result first: TCP from the PC to the board went from 2.1 to 22 Mbit/s once the console went quiet. Chip photo: [Popolon](https://commons.wikimedia.org/wiki/File:AllWinner_D1.jpg), CC BY-SA 4.0.*

![TCP from the PC to the board, before and after]({{ '/assets/images/boards/d1-nezha/d1_wifi_mbit.png' | relative_url }})

## Situation

I'd started Wi-Fi on FreeRTOS: SDIO up, the XR829 firmware downloaded, and both passive and active
scans worked. Joining a network was next, and that's a lot of code to write blind. I wanted a
reference first: the same chip, working, on a Linux I control, so I could compare against it. The
XR829 driver only exists in Allwinner's Tina tree, but someone in the community had ported it to Linux
6.8.

## Task

Get the XR829 associated with WPA2, DHCP and ping on a mainline kernel, booted through my own chain
over FEL (my boot0, OpenSBI, U-Boot), without touching the NAND. Then see what throughput it gets.

![Boot chains, the FEL row is this story]({{ '/assets/images/boards/d1-nezha/d1_boot_chains.png' | relative_url }})
*The bottom row is this story: everything written over FEL, my boot0 setting MAEE before OpenSBI, U-Boot unzipping the kernel, Linux 6.8.12 with the XR829. The NAND stays as it is.*

## Action

**Kernel version.** I tried the port against 6.18 first. Too far: after fixing the include path there
were still 62 cfg80211 errors. 6.8.12, the kernel the port targeted, already has the D1 and the Nezha
device tree. The port's last commit was half done; about 25 changes to make it build, each marked in
the source.

**Five bugs before a shell had Wi-Fi.** First, nothing after "Starting kernel". With `earlycon=sbi`
it showed: the mainline DTB has no `/memory` node (the Nezha's own U-Boot adds one, the generic U-Boot
doesn't). The Makefile now adds 1 GiB at `0x40000000` with `fdtput`, and boots with `panic=5` so a
panic resets the board back to my NAND CLI.

Then every `/proc` entry had an empty name and `/proc/keys` couldn't be created. I'd built 6.8 with
GCC 15, a year newer than the kernel. Rebuilt with GCC 13.3: gone. (The cause is my inference; the
fix worked.) U-Boot's `booti` refused to decompress at every address, so `Image.gz` (8 MB instead of
22 MB at 315 KB/s over FEL) gets unzipped by U-Boot's `unzip` first.

The fourth one took longest. No `wlan0`, and every MMC *data* transfer hung on both controllers while
commands without data worked. 6.8 marks DMA-coherent memory (the SD controller's descriptors)
non-cacheable with T-Head's own page-table bits, and those only take effect when M-mode has set
`mxstatus.MAEE`. My boot0 never did. Setting MAEE (bit 21) and THEADISAEE (bit 22) before OpenSBI:
firmware loads, `wlan0` exists.

Last, the AP authenticated us and even started the 4-way handshake, so it had accepted the
association, but cfg80211 was never told. The port called `cfg80211_rx_assoc_resp()` with an empty
struct. Passing the frame, its length, the request IEs, the BSS and the status (as the 5.15 driver
did) fixed it. WPA2-PSK, DHCP, ping.

**Then iperf3.** About 21 Mbit/s from the board, about 2 to it. Every encrypted frame also logged
`Slowpath: tailroom is not big enough. Req: 8`. I suspected the radio, then the SDIO interrupt. About 7000
interrupts for 3 MB, only 2 missed. UDP from the PC at 20 Mbit/s: 0 % loss. So receive was fine and
only TCP was slow, and TCP needs the board to send ACKs. Power save off: no change (2.37 Mbit/s).

The thing I kept looking past was that WARN line. printk to the serial console is synchronous: a
70-character line at 115200 baud takes about 6 ms. One per frame. With the console quiet:
**2.4 -> 20.3 Mbit/s**. Made permanent (warning lowered to a debug level, tailroom reserved in the
driver), three runs per direction after a clean boot: 22 Mbit/s both ways, steady.

![A console line per frame costs 6 ms]({{ '/assets/images/boards/d1-nezha/d1_console_cost.png' | relative_url }})
*Why one WARN line mattered: at 115200 baud a 70-character line is about 6 ms of synchronous printk, once per frame. Blue is the driver's actual work.*

## Result

The XR829 works on **mainline Linux 6.8.12**: WPA2-PSK, DHCP, ping, TCP, booted over FEL through my
own boot0, OpenSBI and U-Boot, with the NAND never touched. TCP PC -> board went **2.1 -> 22 Mbit/s**,
board -> PC is **~22 Mbit/s**.

Now it's CPU-bound: the single 1 GHz core is **~95 % busy**, mostly in the driver's bottom half,
which does one SDIO transaction per frame. The link reports MCS 7 (65 Mbit/s PHY), so the radio has
headroom. The lesson I'll keep: a log line per packet on a 115200 console is a 6 ms sleep per packet.

## What I'd do next

Back to the FreeRTOS port with this as the reference: join, association, the WPA2 handshake, then
ARP/DHCP. On Linux, batching SDIO transfers in the driver is the obvious next win, but I couldn't
profile it: Alpine's `perf` pulls in libLLVM and Python (177 MB), which I didn't want on a FEL-loaded
initramfs.

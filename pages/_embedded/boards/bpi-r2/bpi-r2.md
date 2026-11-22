---
layout: default
title: "Banana Pi R2 (MT7623N): a router board I've only read so far"
short_description: "Five Ethernet jacks on two MACs, a quad Cortex-A7, and nothing measured on the board yet"
status: "Pending"
picture: "assets/images/bpi_r2_v1.2.jpg"
latest_release: "2026-11-22: honest hub, reading notes only"
index: 27
publish: true
permalink: /embedded/boards/bpi-r2/
board_hub: true
---

# Banana Pi R2
{: .no_toc }

![My BPI-R2 v1.2](/assets/images/bpi_r2_v1.2.jpg)

The BPI-R2 is Banana Pi's router board: a MediaTek MT7623N (four Cortex-A7), 2 GB of DDR3, 8 GB of
eMMC, SATA, and five Gigabit jacks (four LAN, one WAN) behind an MT7530 switch. I got it for OpenWrt,
wrote an empty placeholder post for that in January 2023, and got no further.

In October 2026 I came back to it with the docs, the mainline U-Boot and the Linux device tree, to know
what I'm dealing with before I plug anything in. The board wasn't on the bench then and still isn't,
so there's no STAR write-up with a result yet. This page is honest about that.

![BPI-R2 overview: MT7623N, MT7530 switch with five ports, four boot stages](/assets/images/boards/bpi-r2/r2_overview.png)
*Everything on this page in one drawing: the MT7623N, the MT7530 that turns five jacks into two MACs, and the four boot stages. All from paper, none of it checked on the board.*


## What I've done so far (all on paper or on my PC)

| When | What |
|---|---|
| 2023-01-12 | Placeholder post for an OpenWrt build. Nothing written |
| 2026-10-01 | Read the Banana Pi docs and the mainline sources, built mainline U-Boot (`mt7623n_bpir2_defconfig`): `u-boot-mtk.bin`, 474 608 bytes, in 19.7 s on my PC |
| 2026-10-04 | Added pictures from the schematic to my notes |

The things I learned from reading, none of them checked on the board:

- Boot is four stages: boot ROM, MediaTek preloader, U-Boot at 0x81E00000, Linux. The U-Boot image I
  built carries a 512-byte LK header (magic 0x58881688); that part I did check, on the file.
- Five jacks, two MACs: the MT7530 adds a 4-byte MediaTek tag after the source MAC, its low 3 bits are
  the port, and Linux DSA (`mtk_tag_rcv()`) turns that into `lan0..3` / `wan`.
- Cores 1 to 3 wake through a mailbox at 0x10202000: jump address at +0x34, three magic keys, then an IPI.
- The console is UART2 on the 3-pin CON2, 3.3 V. From the 26 MHz clock the divisor gives 115 556 baud
  in Linux (+0.31 %) and 116 071 in U-Boot (+0.76 %). On paper both are fine.

## The write-ups

{% include board_children.html board="bpi-r2" %}

## What's next

Plug it in. Then, in this order: capture a boot log on CON2, settle the 5 V vs 12 V input question (the
docs contradict themselves, so I'll check the board's own jack before powering it), read
`clk_summary`, see the DSA ports come up, and count the CPUs. After that, finally, the OpenWrt build
the old post promised.

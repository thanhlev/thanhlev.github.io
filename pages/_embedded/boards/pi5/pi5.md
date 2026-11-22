---
layout: default
title: "Raspberry Pi 5 (BCM2712 + RP1)"
short_description: "A read-only survey of my Pi 5, and FreeRTOS borrowing one of its cores from a running Linux (QEMU so far)"
status: "In Progress"
picture: "assets/images/boards/pi5/pi5_soc_inside.png"
latest_release: "2026-11-22: hub page with two STAR write-ups"
index: 24
publish: true
permalink: /embedded/boards/pi5/
board_hub: true
---

# Raspberry Pi 5 (BCM2712 + RP1)

![Every block the BCM2712 device tree lists, with its CPU address]({{ '/assets/images/boards/pi5/pi5_soc_inside.png' | relative_url }})

The Pi 5 is really two chips joined by PCIe. The BCM2712 has the four Cortex-A76 cores, the GPU, the
memory controller and HDMI. The RP1, Raspberry Pi's own chip, has almost everything you actually touch:
the 40-pin header, USB, Ethernet, the camera and display connectors. Mine is the 8 GB Model B rev 1.0,
running Debian 13 with kernel 6.18 from the SD card.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/pi5/pi5_boot_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/pi5/pi5_boot.mp4' | relative_url }}" type="video/mp4"></video>

*My Pi 5 with its active cooler on my desk, then its boot in 105 s: boot ROM, EEPROM bootloader, SDRAM, firmware from the SD card, the kernel (PCIe link up at 1.074 s, RP1 at 1.096 s), userspace at about 15 s. (Vietnamese on-screen text, no sound.)*

This board is different from my other ones: it's busy. It runs Linux for another project of mine, so I
can't just flash it or reboot it whenever I like. On 2026-10-30 I treated it like someone else's
server: everything over ssh, read-only, no sudo. That's also why the RTOS work below is still waiting
for its first run on the real board.

## Timeline

| When | What happened |
|---|---|
| 2026-10-30 | Read-only survey over ssh: buses, boot, power rails, pins, clocks, temperature |
| 2026-10-30 | AMP demo: a kernel module lends core 3 to FreeRTOS and takes it back; 13/13 checks pass on QEMU |
| 2026-10-30 | Board unreachable that evening, and no permission to write to it yet. Board run still pending |

![Pi 5 boot chain on my board]({{ '/assets/images/boards/pi5/pi5_boot_chain.png' | relative_url }})
*The same boot as one row per stage, read from my board's logs: `BOOT_ORDER=0xf461`, boot mode 1 (SD), kernel 2.33 s + userspace 12.72 s, and what the board shows when each stage fails.*

## The stories

{% include board_children.html board="pi5" %}

## Still open

- The AMP selftest on the real Pi 5. Until then I have no real latency number for it, only QEMU's,
  which measures my PC's scheduler, not the chip.
- No GPIO toggle measured: the board is shared, so I didn't touch its pins.
- The boot log on the 3-pin debug UART (J6). I don't have a probe on it.

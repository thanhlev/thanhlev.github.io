---
layout: default
title: "Same kernel, older board, and no more SD card swaps"
short_description: "The Zero W's FreeRTOS image on a Pi 1 B, pins per revision, then a loader inside the firmware at 1.5 Mbaud"
status: "Done"
picture: "assets/images/boards/pi1/pi1_header.png"
latest_release: "2026-10-26: uload at 1.5 Mbaud on the board"
index: 10
publish: true
permalink: /embedded/boards/pi1/uart-reload
board_parent: pi1
result: "Unchanged image boots; next build over UART: 921 KB in 6.7 s instead of a card swap"
tags: [raspberry-pi, arm, freertos, linux, boot]
---

# Same kernel, older board, and no more SD card swaps

[Back to the Pi 1 hub]({{ '/embedded/boards/pi1/' | relative_url }}) · measured 2026-10-20 and 2026-10-26

![The 26-pin header of my Pi 1 B rev 2, with the PL2303 on pins 8/10]({{ '/assets/images/boards/pi1/pi1_header.png' | relative_url }})

## Situation

My [Pi Zero W shell]({{ '/embedded/boards/pi-zero/rtos-usb-shell' | relative_url }}) was a FreeRTOS
image for the BCM2835. The Pi 1 Model B has the same SoC on a different board: SD card boot only (its
one USB port from the SoC goes into the LAN9512 hub, so no USB device boot), the ACT LED on GPIO16
instead of 47, a PL011 UART on header pins 8/10 where I had a PL2303 adapter.

## Task

Run the Zero's `rtos_cli` on the Pi 1 without forking it. Then stop pulling the SD card for every
build, because each iteration was card out, PC, copy, card back, power.

![What is on my Pi 1 SD card]({{ '/assets/images/boards/pi1/pi1_sdcard.png' | relative_url }})
*The card I kept pulling out, measured from its image: the FAT partition and the five boot files with their LBAs and sizes, and how the boot ROM walks MBR, boot sector and FAT chain to `bootcode.bin`.*

## Action

**Same image.** I added the boot files next to what was already on the card (checked byte for byte,
deleted nothing) and powered it up. The first UART bytes were garbage, then three banners (two resets),
then a clean one:

```
boot: rtos_cli, system timer 2135765 us
rtos_cli on Raspberry Pi Zero W, FreeRTOS V11.2.0 - type help
```

Yes, it says Zero W. It's the Zero's image after all. `cpu` and `fw` gave the real story:

```
pz> cpu
 MIDR 410FB767 (implementer 41, part B76, rev 7)
 SCTLR 00451078 (MMU 0, D-cache 0, I-cache 1, high vectors 0)
 boot r0=00000000 r1=00000C42 r2=00000000 (from the firmware)
pz> fw
 …
 board revision 0000000E
 …
 clock arm 700000000 Hz
```

`r1 = 0xC42` is the BCM2708 machine type, same as on the Zero. The `qpu` benchmark gave the Zero's
numbers within a microsecond (4799 MFLOPS on 12 QPUs).

**Pins per revision.** Rev 1 and rev 2 Pi 1 boards don't even agree on the I2C pins (BSC1 on GPIO2/3
vs BSC0 on GPIO0/1). I took the pin table from the firmware's own `dt-blob.dts` and wrote
`src/board.c`: read the revision at run time, pick the LED, I2C and camera pins. One image for every
BCM2835 board instead of a build per board. The decoder is tested on the PC against 12 revision codes,
12/12 right (`0x000E` = B rev 2).

**Loader, try 1: `pzload`.** A 3.4 KB loader on the card that takes the real image over the UART. On
QEMU it loaded 69 328 bytes fine. On the real board: silence, not a single byte. I never found out why.

**Loader, try 2: inside the firmware.** Instead of a separate loader, the running `rtos_cli` gets a
`uload` command: it receives the next image over the UART into RAM, checks the CRC, and jumps to it
through a small trampoline. No reboot. The PC side is `tools/uart_load.py`, which types `uload` itself.
I also pushed the baud to 1 500 000 for loading (the console stays at 115200). I wrote it to the card
in the PC (a 14.8 GB card that used to hold Raspberry Pi OS; overwritten, no backup, my call), and from
then on:

```
~/pi1/rtos_face$ make load
[uart_load] build/kernel_marked.img: 921224 bytes, crc 531C2A93, to /dev/serial/by-id/usb-Prolific_Technology_Inc._USB-Serial_Controller-if00-port0 at 1500000 baud
[uart_load] rtos_cli is up: uload
[uart_load] board: pzload: 921224 bytes, crc 531C2A93 ok, starting (6.7 s, 137 kB/s)
 rtos_face: MMU and D-cache on (SCTLR 00C5187D), VFP RunFast
 rtos_cli on Raspberry Pi 1 B rev 2, FreeRTOS V11.2.0 - VIA UART!
 pz>
[uart_load] rtos_cli prompt in 7.2 s
```

## Result

The Zero W's `kernel.img` runs **unchanged** on the Pi 1 B rev 2, from the SD card, console on the
PL011, and the pin selection by revision decodes **12/12** codes right on the PC. With `uload` a
**921 224-byte** image goes over in **6.7 s** at 1.5 Mbaud through a PL2303 (137 kB/s), prompt in
7.2 s (on QEMU the prompt came after 12.4 s). The SD card only gets touched when `uload` itself
changes.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/pi1/pi1_kernel_format_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/pi1/pi1_kernel_format.mp4' | relative_url }}" type="video/mp4"></video>

*What each of those files is, 80 s: `bootcode.bin` a raw blob from `0x200`, `start.elf` an ELF for the VideoCore (`e_machine 0x89`), my `kernel.img` 1 065 705 bytes with no header, its first word a branch. (Vietnamese on-screen text, background music, no voice-over.)*

## What I'd do next

`pzload` failing silently on the board still bothers me; I just went around it. And the face firmware
can't be reloaded twice without a reboot, because VCHIQ refuses a second init per GPU boot
([MJPEG story]({{ '/embedded/boards/pi1/mjpeg-videocore' | relative_url }})). A watchdog reset before
`uload` would close that loop.

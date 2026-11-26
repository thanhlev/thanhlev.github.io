---
layout: default
title: "A FreeRTOS shell on the boot cable, and the USB device that left after 170 ms"
short_description: "FreeRTOS + TinyUSB CDC on the Zero W with no UART cable; three bugs found one bit at a time"
status: "Done"
picture: "assets/images/boards/pi-zero/pz_shell_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-12: shell stable, I-cache on"
index: 20
publish: true
permalink: /embedded/boards/pi-zero/rtos-usb-shell
board_parent: pi-zero
result: "Shell on /dev/ttyACM0 ~0.8 s after hand-over; 11.3 µs per task switch; tick jitter 999-1001 µs"
tags: [raspberry-pi, arm, freertos, boot, usb]
---

# A FreeRTOS shell on the boot cable, and the USB device that left after 170 ms

[Back to the Pi Zero W hub]({{ '/embedded/boards/pi-zero/' | relative_url }}) · measured 2026-10-12

![The USB shell story in one picture]({{ '/assets/images/boards/pi-zero/pz_shell_cover.jpg' | relative_url }})
*The whole story in one picture: a FreeRTOS shell on /dev/ttyACM0 about 0.8 s after hand-over, and 11.3 µs per task switch.*

![What happens between start.elf releasing the ARM and kmain]({{ '/assets/images/boards/pi-zero/pz_reset_seq.png' | relative_url }})

## Situation

The [USB boot]({{ '/embedded/boards/pi-zero/usb-boot' | relative_url }}) worked, but my only output
was an LED. No UART cable on my bench. I wanted a real shell on this board, on an RTOS, and the only
wire I had was the micro-USB cable it boots through. So the console had to be USB CDC on that same
port: rpiboot pushes the image, the ARM starts, and my code takes over the USB controller as a serial
device.

## Task

FreeRTOS on the ARM1176, TinyUSB as a CDC-ACM device on the DWC2 controller, a small shell. Then make
it stable on the real board, where I can't see anything until USB works.

<a href="{{ '/assets/images/boards/pi-zero/pz_rtos_arch.png' | relative_url }}"><img src="{{ '/assets/images/boards/pi-zero/pz_rtos_arch.png' | relative_url }}" alt="rtos_cli tasks and interrupts on the BCM2835" style="width:100%"></a>
*What I was building: timer IRQ 1 for the 1 kHz tick, DWC2 IRQ 9 into the TinyUSB task (prio 6), the shell task (prio 2), the mailbox to the firmware. The PL011 is drawn but has no cable on my side.*

## Action

**Port choice.** FreeRTOS V11.2.0 with the old `ARM7_LPC2000` port as the base: ARMv6 in ARM state has
the same programmer's model, so the stack frame and context save are code people have already
debugged. TinyUSB in slave mode (it has a BCM2835 port) so I didn't have to think about DMA and cache
maintenance with the MMU off. First run on QEMU `raspi0`, where everything is visible:

```
pz> rt jitter 500
 vTaskDelay(1) x 500: min 842 us, avg 1000 us, max 1109 us
pz> rt switch 2000
 2000 round trips in 6097 us: 1524 ns per switch
```

Fine. On the board: nothing.

**A one-bit debug channel.** With no output at all, I used the USB pull-up as a signal. `smoke(n)` sets
`DCTL` bit 1 (soft disconnect) when the code reaches checkpoint n, and the PC sees the device leave.
Checkpoint 4 (blink task after 2 s of ticks) fired, so the scheduler was alive. Checkpoint 2 gave 0
and then disagreed with itself on a rerun. Noisy channel. That bit me again later.

**Bug 1: my kernel wasn't at 0x8000.** Exceptions never reached my handler through `VBAR`. Instead of
staring at the vector code I tested the thing under it: a tiny kernel that drops the pull-up only if
its own PC is below a limit.

```
=== baremetal kmain PC < 0x8000 ? 1
=== without disable_commandline_tags: kmain PC < 0x8000 ? 0
=== without disable_commandline_tags: kmain PC < 0x9000 ? 1
```

`disable_commandline_tags=1` in `config.txt` makes `start.elf` load the kernel at `0x0`, not `0x8000`.
I had copied that key into the bare-metal project too, and its LED had been happily blinking from the
wrong address the whole time (code linked at `0x8000` half-works at `0x0`: the LED blinks, anything
using an absolute address is broken). Key removed, `VBAR` works.

**Bug 2: the device that left.** With TinyUSB in, the host got the CDC device, `cdc_acm` bound... and
then it was gone:

```
[108995.440988] usb 3-3.7: Product: Pi Zero W rtos_cli
[108995.451072] cdc_acm 3-3.7:1.0: ttyACM0: USB ACM device
[108995.620735] usb 3-3.7: USB disconnect, device number 51
```

About 170 ms, every time. No reset, no error, the D+ pull-up just vanished. I ruled things out one by
one: the console backend, the host driver and ModemManager, the LED task, a USB power cycle before
init, forcing B-valid, an IRQ storm, an ARM crash (the watchdog never fired).

Then I asked the board. A task snapshots 7 DWC2 registers after mount, waits 1 s for the first one to
change, and fires the watchdog if the change is in a set I pick at build time. The boot ROM reappearing
on USB means "yes". One bit per boot:

```
=== which in mask 0x80 ? 0
=== which in mask 0x0F ? 1
=== which in mask 0x03 ? 0
=== which in mask 0x05 ? 0
```

Register 3: `GUSBCFG`. TinyUSB only writes it during init. Then the same game on its bits: FDMOD,
FHMOD, TRDT and PHYSEL all flipped. Someone rewrote the whole register into forced host mode, and a
host-mode core has no device pull-up. The only other writer is the VideoCore firmware.

The real cause was in my own code. At boot I ask the firmware (mailbox) to power USB on. Timed with a
5 s timeout instead of my 100 ms:

```
 mailbox SET_POWER_STATE(usb, on): rc 8, state 00000001, 527230 us
```

527 ms. With the old timeout, TinyUSB enumerated inside that window, and the firmware's last reset at
the end of power-on knocked it off. Its late reply then matched my next mailbox call (same static
buffer). Timeout raised to 2 s, init after the answer. No delay hacks needed.

![Sequence of the USB drop]({{ '/assets/images/boards/pi-zero/pz_usb_drop.png' | relative_url }})
*The drop, in order: my 100 ms mailbox timeout gives up, TinyUSB enumerates `cafe:4021`, the firmware's power-on finishes with a core reset into host mode, the pull-up goes, the PC logs "USB disconnect" about 170 ms after mount.*

**Bug 3: scrambled text.** On the way there I had a build with a 3 s delay that stayed connected, and
the shell answered like this:

```
upknonn: wlp e(tr heyp)lpz>
```

Typing one character every 50 ms showed the echo was right, so input was fine. In the output, bytes
3, 7, 11, 15 carried the byte from the previous word: "(tick 62558, other" came out as
"(ti k 6c5582 ot,er". One byte lane, shifted by a word. That's an unaligned `LDR` with `SCTLR.U = 0`,
and TinyUSB's `tu_unaligned_read32()` is a plain `*(uint32_t *)p`. Setting `SCTLR.U` (bit 22) first
thing in `start.S` fixed it:

```
pz> cpu
 MIDR 410FB767 (implementer 41, part B76, rev 7)
 SCTLR 00450078 (MMU 0, D-cache 0, I-cache 0, high vectors 0)
 VBAR 00008020
```

So the firmware hands over `0x00050078`, the ARM1176 reset value. (An earlier one-bit probe had told
me bit 16 was 0. Wrong. That was the noisy channel again.)

**Clean-up.** `ps` showed `Tmr Svc` at 14 % although it never runs: my run-time counter was the system
timer, which had already counted ~16 s of VideoCore boot before the scheduler started. Counting from
`vTaskStartScheduler()` fixed that. Then I turned the I-cache on (safe without the MMU).

## Result

```
pz> ps
 task st prio stack cpu%
 shell * 2 7692 1.1
 IDLE R 0 920 98.8
pz> cpu
 SCTLR 00451078 (MMU 0, D-cache 0, I-cache 1, high vectors 0)
pz> rt switch
 1000 round trips in 22522 us: 11261 ns per switch
```

The shell is on `/dev/ttyACM0` about **0.8 s** after the firmware hands over, stable, and all
**13 commands** check out on the board. `vTaskDelay(1)` x 1000 on the board gives **min 999, avg
1000, max 1001 µs**. A task switch went from **13.9 to 11.3 µs** with the I-cache on, and IDLE sits
at 98.8 %.

The lesson I keep: the USB power-on through the mailbox takes **527 ms**, so initialise the DWC2 only
after the reply. Eight days later I ran the same steps again and got the boot ROM after 5.69 s again
and a task switch of 11247 ns against 11261.

<video controls muted playsinline preload="metadata" poster="{{ '/assets/images/boards/pi-zero/pz_rtos_shell_169_poster.jpg' | relative_url }}" style="width:100%;max-width:640px"><source src="{{ '/assets/videos/boards/pi-zero/pz_rtos_shell_169.mp4' | relative_url }}" type="video/mp4"></video>

*53 s: the shell over the USB cable, the port that vanished until I waited 527 ms for the USB power, and five tasks running with the CPU still about 99 % idle. English on-screen text, background music.*

## What I'd do next

The D-cache and the MMU. 11 µs per switch is slow for this core, and I'd bet most of it is uncached
stack traffic (on the D1 the same kind of fix was worth 27x). And a place to keep a crash record that
survives the watchdog reset, because DRAM doesn't.

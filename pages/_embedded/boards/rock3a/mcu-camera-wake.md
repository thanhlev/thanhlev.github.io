---
layout: default
title: "The RISC-V MCU keeps watch: webcam to NPU with all four A55s off"
short_description: "The RK3568's own RV32 core drives the USB webcam, RGA2 and the NPU by itself, keeps DRAM in self-refresh between frames and powers an A55 back on only when it finds a face"
status: "In Progress"
picture: "assets/images/boards/rock3a/r3a_mcu_cam_cover.jpg"   # 2026-11-23 cover, story_cover.py r3a_mcu_cam_cover
latest_release: "2026-11-06: all four A55s off, the MCU holds the console; a real person woke the A55 186 times"
index: 16
publish: true
permalink: /embedded/boards/rock3a/mcu-camera-wake
board_parent: rock3a
result: "DRAM in self-refresh 74.0 % of a 1 s camera cycle with all four A55s powered off; bell to core 0 in 16 µs; colour step 470 ms to 148 µs on RGA2; no power meter yet (chip 13.1 °C cooler)"
edge_ai: true
edge_ai_index: 11
tags: [rockchip, risc-v, edge-ai, npu, freertos, bare-metal]
---

# The RISC-V MCU keeps watch: webcam to NPU with all four A55s off

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

![The MCU keeps watch]({{ '/assets/images/boards/rock3a/r3a_mcu_cam_cover.jpg' | relative_url }})
*The result first: with the four Cortex-A55 cores powered off, the RV32 MCU kept DRAM in self-refresh 74.0 % of the time and still caught every face frame.*

![What the MCU drives while the A55s are off]({{ '/assets/images/boards/rock3a/mcu_soc_map.png' | relative_url }})
*The blocks on the chip that the MCU programs by itself (the yellow markers) and the path of one webcam frame. Every frame still goes through DRAM; the trick is how little of each second DRAM has to be awake.*

## Situation

Think of a camera that runs on a battery, or a doorbell, or a robot that sits in a corner most of
the day. You want it to look all the time. You don't want to pay for four Cortex-A55 cores and
8 GB of LPDDR4X just to find out, thirty times a second, that the room is still empty.

The RK3568 on my ROCK 3A has a part that looks made for this and that hardly anyone uses: a fifth
processor, a small 32-bit RISC-V core next to the four A55s. It's a Syntacore SCR1 (the TRM never
names it, but its CSR map and the register name `SCR1_BOOT_ADDR` give it away), RV32IMC, machine mode
only, no cache, no MMU. On this board it runs at 100 MHz from `aclk_bus`. I'd already used it for
something small, a WS2812 LED ring under Android
([FreeRTOS on RISC-V MCU, Linux on full 4 Cortex-A55 cores]({{ '/embedded/boards/rock3a/ws2812-riscv-mcu' | relative_url }})),
where it ran FreeRTOS at 148.5 MHz and talked to Android through the mailbox. That post is
the base for this one; I won't repeat the boot of the MCU here beyond what matters.

Funny thing: when I first listed the ways I could split work on this chip, the MCU wasn't on the list
at all. I had "Linux plus an external MCU, not wired, not feasible" and forgot the one inside the SoC.
The datasheet lists it in §1.2.6 and the Linux clock driver has `aclk_mcu`. My mistake.

The A55 side for this whole story is my own FreeRTOS image, the one from
[Webcam to NPU to HDMI, with no Linux on the chip]({{ '/embedded/boards/rock3a/rtos-face-detect' | relative_url }}),
loaded into RAM through Maskrom (how I do that without touching the board is in
[Bare metal from the BootROM]({{ '/embedded/boards/rock3a/maskrom-bare-metal' | relative_url }})).
That matters later: several of the switches I needed are secure-world registers, and my RTOS runs
at Secure EL1, where Linux can't reach them.

## Task

The question was simple to say: whether the MCU, alone, can configure the USB webcam, get frames, run a
face detector on the NPU, and wake the CPU (and DRAM) only when there's a face.

I turned it into things I could measure:

- the MCU enumerates the webcam and streams it with 0 bad frames, with no A55 code in the loop;
- the MCU runs the whole chain per frame: a motion check, colour conversion, RetinaFace on the NPU,
  its own score of the NPU output, and a doorbell to the A55 only on a face;
- while nothing happens, all four A55 cores are powered off (not just in WFI), DRAM sits in
  self-refresh, and only the MCU is awake, running from on-chip SRAM;
- on a face, an A55 comes back by itself, decodes the result, and goes off again;
- every claim about the hardware checked against the TRM (Part 1 and Part 2), with the page.

Two limits were known from the start. Nobody could sit in front of the camera during most of the
work, and the webcam on my desk can see people, a child among them, so no camera picture leaves the
board. And I have no current meter on this bench, so "power saved" can only be inferred.

One more thing I had to accept early, after reading the TRM: the frames can't go "straight into the
NPU". The USB3 controller writes to memory by AXI (Part 2, p.1697), the NPU reads from memory by its
own AXI port (Part 2, p.410). The webcam's data goes through DRAM no matter what. So the real goal is
DRAM awake for one frame, asleep for the rest.

## Action

### 1. Where the MCU runs from: 64 KiB of SRAM, after a bit hunt

The SCR1 has no RAM of its own. TRM Part 1 8.1 (p.516) gives it an AHB-Lite memory interface, no TCM,
no cache. The normal way to start it is the one Rockchip's U-Boot uses: hold its reset
(`CRU_SOFTRST_CON26` bit 10), copy a program into DRAM, write the address shifted right by 16 into
`SYS_GRF_SOC_CON4`, release the reset. My A55 code adds three steps around that: turn on the MCU,
mailbox and timer clocks, clear the shared window, and clean the image out of the A55's caches
(the MCU doesn't snoop them). My image lives at `0x30E00000`, the shared window at `0x30F00000`.

That's fine as long as DRAM is awake. For anything that has to run while DRAM is in self-refresh, the
code and its stack must sit somewhere else, and the only candidate is `SYSTEM_SRAM`: 64 KiB at
`0xFDCC0000`. TRM 5.3 even lists the MCU among the masters allowed to use it.

It didn't work. On the AHB port the MCU got a load access fault; on the AXI port reads came back 0
and writes vanished. I first wrote that the TRM was wrong. It wasn't: I'd read the wrong registers.
The TRM's figure of the SRAM security scheme (5.2, Fig. 5-2, p.470) calls them `SGRF_SOC_CON10/11` but
gives no address, and I had looked at `SGRF + 0x28/0x2c`, found 0, and concluded there was no secure
region.

So I dumped the whole secure GRF as the BootROM leaves it and found a block at `SGRF + 0x240` with
twelve words set. TF-A's `sgrf_init()` clears nine of them (`0x240` to `0x260`) and never touches the
last three. Then I let the MCU peek a word the A55 had written, and cleared bits one at a time:

```
rock3a# mw fdd1826c ffff0000
rock3a# mcu peek fdcc8000
  MCU read 0xfdcc8000 = 0x12345678
rock3a# mw fdd1826c fff1fff1
rock3a# mcu peek fdcc8000
  MCU read 0xfdcc8000 = 0x00000000
```

Only two bits mattered: `0x268` bit 7 (the top of region 0) and `0x26c` bit 0 (region 0 secure). After
the BootROM, region 0 covers all 64 KiB. A second test showed both bits sit on the SRAM side, not on
the master: with either one cleared, the MCU still couldn't read secure DRAM. The fix is one write:

```c
// rtos_mcu/a55/mcu_cmd.c:153-159
static void sram_open(void)
{
	REG(SGRF_SRAM_SEC) = 0x00010000u;                   /* bit 0 := 0, rgn0 non-secure */
	uint32_t rg = REG(SGRF_SRAM_RGN), sec = REG(SGRF_SRAM_SEC);
	t_ok("SYSTEM_SRAM opened: SGRF+0x26c = 0x%04x (rgn0 %s, rgn1 %s), SGRF+0x268 = 0x%04x",
	     sec & 0xffffu, sec & 1u ? "secure" : "off", sec & 2u ? "secure" : "off", rg & 0xffffu);
}
```

The upper half is Rockchip's write-enable mask: `0x0001` in bits 31:16 means "write bit 0 only", and
the value 0 makes region 0 non-secure. FreeRTOS (28 138 bytes: 9406 code, 12 data, 18 720 bss) then
ran from `0xFDCC0000` with 0 overruns in 4 × 60 s. The 1 kHz task wakes later than from DRAM (75.6 µs
average against 58.5 µs on the AXI port) but load barely moves it (worst 82.3 µs against 94.7 µs).
The catch: this needs the secure world. Under Linux, TF-A leaves the bit set and Linux can't write the
SGRF, so everything below runs under my RTOS only.

In the end the camera image is split. FreeRTOS and the cold code stay in DRAM; the hot loops, the sleep
code, the stack it uses while DRAM sleeps, a warm-boot stub for the A55 and a few hand-over words go
into SRAM. A section attribute (`SRAM_TEXT`) decides which function goes where.

### 2. The webcam, driven by the MCU

I didn't write a new USB stack. My RTOS already had its own xHCI host, hub and UVC code for the
face-detection demo, so I built those same files for RV32IMC without editing them, and added a small
UVC layer for the MCU. The A55 does a few things once before it hands over, the ones that need the
secure world or a power domain: in this run that was 11 secure register writes the MCU then skips.

The MCU enumerated the hub and both cameras on the first try:

```
  mcu| [  OK  ] DWC3 3.00a (GSNPSID 0x5533300a), host mode: GCTL 0x30c11004, ...
  mcu| [  OK  ] root port 1: reset done, PORTSC 0x00000e03, high (480M) speed
  mcu| [  OK  ] slot 3: 05a3:9601, high (480M) speed, route 0x00002, configuration 681 bytes
  mcu| [  OK  ] MCU: USB up, 3 devices, 1078 ms; secure register writes skipped: 11 (the A55 did them)
```

Streaming was another matter. Three faults came out on the board, one after the other.

First, my bus benchmark printed 2.86 s for 1024 register reads. That's not a slow bus, that's a broken
clock: I'd used TIMER4 as an up-counter, and two reads of its `CURRENT_VALUE0` went `0xbb4618e5` →
`0xbb26e9d3`. TRM Part 1 p.605 says it plainly, "Timer0~4 count down ... Timer5 and STimer0/1
incremental". I'd read that line only after the fact.

```c
// rtos_mcu/mcu/uvc_mcu.c:44
uint32_t t4_now(void) { return ~REG(TIMER4 + T_CUR0); }
```

Second, the YUYV stream at 15 fps gave 2 good frames and 31 bad ones in 5 s, with isochronous
completion code 15 (ring overrun): the MCU didn't requeue transfer descriptors in time. The odd part
was the memory numbers. The same kind of loop read DRAM at 0.09 µs per word in one build and 1.8 µs in
another, depending only on where the loop's own code was linked. With its code in SRAM it was always
0.09 µs. The SCR1 fetches every instruction over the bus, so where the code sits matters more than
where the data sits. I moved the payload copy and the pixel and score functions into SRAM.

Third, every good frame was followed by an empty "bad" one. This camera sets EOF and then toggles the
frame ID bit, so a FID change must end a frame only if data arrived after the EOF.

After that: 52 good, 0 bad at YUYV 15 fps; 92 good, 0 bad at YUYV 30 fps and at MJPEG 30 fps. 40 000
isochronous descriptors in 5 s each time, which is exactly 8000 per second, 0 errors. One number to
remember for later: the first good frame comes about 1.45 to 1.64 s after `SET_INTERFACE`. Starting
the camera's sensor is slow.

### 3. RetinaFace on the NPU, started by the MCU

The NPU doesn't run models, it runs register-command lists from DRAM (that part is in the
[NPU post]({{ '/embedded/boards/rock3a/npu-rknn' | relative_url }}) and the face-detection post).
So the MCU's share is small. The A55 powers the NPU, opens the DDR firewall and copies the model once
(13 buffers, 2676 KiB in 4341 µs). Per frame the MCU writes the program-controller registers and polls
for the end, the same sequence my A55 code uses, which itself follows the `rknpu` kernel driver:

```c
// rtos_mcu/mcu/rtos_main.c:229-238 (from npu_job)
	REG(NPU + PC_DATA_ADDR) = 1;                     /* rknpu: "switch to slave mode" first */
	REG(NPU + PC_DATA_ADDR) = SHM->npu_cmd;
	REG(NPU + PC_DATA_AMOUNT) = SHM->npu_regcfg + 4 - 1;
	REG(NPU + PC_INT_MASK) = SHM->npu_int_mask;
	REG(NPU + PC_INT_CLEAR) = 0x1ffff;
	REG(NPU + PC_TASK_CON) = (0x6u | 1u) << 12 | (SHM->npu_ntask & 0xfffu);   /* PC | ping-pong */
	REG(NPU + PC_DMA_BASE) = 0;
	uint32_t t0 = now24(), t1 = t0;
	REG(NPU + PC_OP_EN) = 1;
	REG(NPU + PC_OP_EN) = 0;
```

The 88-task RetinaFace job ran in 2.48 ms from the MCU, and its output bytes were the same as Linux's
on my three test pictures. Then the MCU has to decide "face or not" on its own, without floats and
without the A55. I wrote an integer test on the raw int8 outputs: an anchor passes when the face logit
beats the background logit by a threshold. On the PC it gives the same count as my float decoder at
six thresholds on three NPU dumps, before it ever ran on the board.

The first end-to-end run had a nasty surprise in it:

```
  mcu|   per frame (avg / max us): thumb+motion 2424 / 2584, BGR 689499 / 690027, NPU 2511 / 2575, score 9288 / 9370
```

The NPU took 2.5 ms. Turning one 320 × 240 YUYV frame into the network's BGR input took 689 ms. The
MCU fetches every instruction over the bus at roughly 180 to 250 ns each, so it does a few million
instructions per second, and the conversion is about 150 instructions per 4 pixels. The conversion
also starved the USB ring until I cut it into strips of 8 rows with the stream serviced in between.

### 4. RGA2 does the colour step: 470 ms to 148 µs

The TRM's answer was already on the chip: RGA2, Rockchip's 2D engine, converts YUV422 to RGB888 with
BT.601 and can turn the picture 180° (my camera hangs upside down), Part 2 p.1614. It's a DRAM master
started by plain register writes, so the MCU can drive it.

My first look at it killed the board. A register read on RGA2 hung core 0; its FreeRTOS tick stopped
kicking the watchdog and the chip reset into Maskrom 11 s later. `PMU_PWR_DWN_ST` read `0xff`: the RGA
power domain (bit 5, Part 1 p.494) is off after a Maskrom boot, and a read of a powered-off domain
never completes. Since then I read the power state before touching a block. I
powered it the way I power the NPU (power on, release the bus idle request, reset pulse).

Then the MCU writes 32 registers and the start bit:

```c
// rtos_mcu/mcu/rga_mcu.c:30-49
uint32_t rga_start(uint32_t src, uint32_t dst)
{
	volatile struct mcu_xarg *a = &SHM->xarg;
	volatile struct mcu_x *x = &SHM->x;
	uint32_t t0 = t4_now();
	for (unsigned i = 0; i < MCU_RGA_NREG; i++) {
		uint32_t v = a->rga[i];
		if (i == (RGA2_SRC_BASE0 - RGA2_MODE_CTRL) / 4)
			v = src;
		else if (i == (RGA2_DST_BASE0 - RGA2_MODE_CTRL) / 4)
			v = dst;
		REG(RGA2 + RGA2_MODE_CTRL + 4 * i) = v;
	}
	REG(RGA2 + RGA2_INT) = 0xf0u;                    /* clear cf, af, mmu, err; enables 0 */
	__asm__ volatile("fence" : : : "memory");        /* registers before the start bit */
	uint32_t ts = t4_now();
	x->rga_wr = ts - t0;
	REG(RGA2 + RGA2_SYS_CTRL) = a->rga_sys;
	return ts;
}
```

The A55 computes the 32 values once from the TRM's field tables; the MCU only patches the source and
destination. Three things the TRM doesn't say, all found by comparing against my software conversion
on the same frame: the size fields hold size minus 1 (with the plain size RGA2 writes a 241st row);
a turned picture is written backwards from `DST_BASE0`, so the base must point at the last pixel (at
the first pixel, 68 920 bytes landed below the buffer); and the power domain must be on.

```
  mcu| [  OK  ] MCU RGA test 320x240: software 469882 us, RGA2 148 us (register writes 21 us), ...
[  OK  ] RGA2 vs cam_px.c, 230400 bytes: ... |d| = 0: 177791, 1: 52609, 2: 0, 3: 0, >= 4: 0, max 1
```

148 µs plus 21 µs of register writes, against 469.9 ms in software. 177 791 of 230 400 bytes equal,
the rest off by one: two integer BT.601 roundings that differ in the last bit. In the live stream the
BGR stage averages 1.8 ms, because the MCU keeps serving the USB ring while RGA2 works.

### 5. The doorbell

On a face the MCU rings the A55 through the mailbox: element 1 of the MCU-to-A55 direction, command
then data, which sets `B2A_STATUS` bit 1 and raises the A55's interrupt (Part 1 14.3.1, p.617).
Element 0 stays for command replies.

```c
// rtos_mcu/mcu/cam.c:362-367
	if (a->flags & MCU_CAM_F_BELL) {
		cs->bells++;
		cs->t_bell = t4_now();
		__asm__ volatile("fence" : : : "memory");   /* the record before the bell */
		REG(MB_B2A_CMD(1)) = MCU_EVT_FACE;
		REG(MB_B2A_DAT(1)) = cs->bells;
```

The `fence` matters: the result record in the shared window has to be visible before the bell. In the
first runs the A55 polled every 1 ms and saw the bell 89 to 957 µs later. Later, with core 0 in a WFI
that the mailbox interrupt ends, it was 3 µs.

### 6. A face that isn't a person

With nobody at the desk, every honest run said "0 faces", which proves the bell stays quiet but not
that it rings. I couldn't use frames of real people from this webcam. So the camera keeps streaming
for real, and right after capture the MCU swaps the frame it's about to process for a portrait in the
camera's own YUYV format, upside down like the bench camera. The portrait is NASA photo S69-31741, a
public-domain picture, fetched at a pinned sha256 and cut to 320 × 240. The motion gate, RGA2, the NPU,
the score and the bell all see the swapped frame and do their real work.

```c
// rtos_mcu/mcu/cam.c:266-275
	uint32_t ff = con_on() ? con_fake_flags(a->flags) : a->flags;
	if ((ff & MCU_CAM_F_FAKE) && cs->fmt == MCU_CAM_FMT_YUYV && SHM->xarg.fake_addr) {
		if (!(ff & MCU_CAM_F_FAKE_ALT) || (cs->processed & 1u)) {
			f = (const uint8_t *)(uintptr_t)SHM->xarg.fake_addr;
			n = w * h * 2u;
			SHM->x.fake_n++;
		} else {
			SHM->x.real_n++;
		}
	}
```

With the same test face on every frame, 97 frames were processed, 1 had motion, the NPU ran once,
one bell. That's the motion gate doing its job: a still picture isn't news. With test face and empty
room on alternate frames:

```
rock3a# mcu cam watch 6 50 16 12 1 fake2 rga
  mcu| [  OK  ] MCU watch 6 s: 67 frames seen, 67 processed, 67 with motion, 67 NPU runs, 34 with a face, 34 bells
  RGA2: 67 conversions, avg 1765 us, max 1891 us, errors 0 (INT 0x0 STATUS2 0x0); test face frames 34, real 33
```

34 bells for exactly the 34 test-face frames, 0 for the 33 room frames, and the A55's own float decoder
agreed every time (box (121,62)-(227,207) of 320 × 320, 100 %). The same run with the software
conversion processed only 6 of 76 frames. To be clear about what this is: a published photo shown to
a real pipeline, not a person in front of the lens. The real person came later (Result).

### 7. DRAM self-refresh: the request that did nothing

![The self-refresh source field]({{ '/assets/images/boards/rock3a/mcu_sref_mux.png' | relative_url }})
*The 2-bit field that cost me a wrong conclusion: with its reset value the DDR controller listens to a GRF bit, not to the PMU.*

The PMU has a software request for DRAM self-refresh, `PMU_DDR_PWR_SFTCON` bit 0, `sw_ddr_sref_req`
(Part 1 p.492). It touches no PLL, so the MCU's clock keeps running. I wrote it from the MCU, running
from SRAM. The bit read back 1. The PMU's DDR state stayed 0 and the controller's `c_active` stayed set
for the whole 20 ms. The board was fine; DRAM just never went to sleep.

I went looking for a reason in the PMU chapter and found one that sounded right: low-power settings
"will not be executed immediately after configuration. They will be delayed to execute after FSM
running in particular phase" (p.476-477). So I wrote it down as "the software request only acts inside
the PMU's power FSM" and moved on. That was wrong.

The real reason was one chapter earlier. `DDR_GRF_CON3` bits [6:5] (Part 1 p.219) choose who drives
the controller's low-power request: 0 is a bit in the GRF itself, 1 is the PMU, 2 and 3 are automatic
modes. The reset value is `0xE410`: the GRF bit. My PMU request went nowhere because nobody was
listening to the PMU. TF-A's suspend code writes `0x00600020` first. Mine does now:

```c
// rtos_mcu/a55/mcu_cmd.c:1395-1397
	/* 2026-11-04 (mcu#l10): the PMU, not the GRF bit, drives the controller's csysreq (DDR_GRF_CON3
	 * [6:5] = 1, TRM P1 p.219; reset 0 = GRF), as TF-A's pmu_ddr_suspend_config() does */
	REG(DDR_GRF_CON3_A) = MC_HIWORD(0x60u, 0x20u);
```

and the MCU, from SRAM, asks and checks the controller's own state, `DDR_GRF_STATUS8` [7:6]
`selfref_type` (p.221), where 2 means "in self-refresh by request":

```c
// rtos_mcu/mcu/pmu_slp.c:94-99
	REG(PMU + PMU_DDR_PWR_SFTCON) = 1u << 16 | 1u;      /* 2. sw_ddr_sref_req = 1 (p.492) */
	for (;;) {
		ADVANCE();
		s8 = REG(DDR_GRF + DDR_GRF_STATUS8);
		if ((s8 & 0xc0u) == 0x80u)
			break;
```

With the PMU selected: self-refresh in 13 µs, out in 6 µs, `STATUS8` `0x298`. With the GRF selected
the controller only ever showed type 3, its own automatic self-refresh when idle.

Then the first real sleep. Cores 1 and 2 park, core 0 writes a word into SRAM and goes into WFI, the
MCU sees the word, asks for self-refresh, holds, lets go, rings the bell:

```
rock3a# mcu sleep 5000 req
  mcu|   REQ: in self-refresh 4 us after the A55's word; held 5000 ms: 6941418 of 6941418 polls selfref_type 2, STATUS8 OR 0x298 AND 0x298; out 3 us after the release
  A55 core 0: WFI returned 1 times, CLUSTER_PWR_ST after 0x8888fc80; WFI 5000027 us (bell rang), ...
[  OK  ] DRAM pattern: all 4194304 words (16 MiB at 0x32000000) as written before the sleep
```

The pattern check alone wouldn't prove much (DRAM cells usually keep their data for seconds without
refresh). The proof is the controller's state register, polled 6 941 418 times over 5 s and in
self-refresh every single time.

Two bugs on the way, both mine. My first sleep tried to park core 3, which doesn't run FreeRTOS at
all: it runs the real-time loop my NOR boot chain starts in PMU SRAM (from
[FreeRTOS on core 3 at 154 ms]({{ '/embedded/boards/rock3a/rtos-before-linux' | relative_url }})).
And I released the parked cores with SGI 1, which is also my SMP heartbeat: the parked cores counted
one heartbeat more than had been sent, an unsigned "sent minus answered ≥ 10" wrapped, the watchdog
stopped being kicked and the chip reset. Release uses SGI 0 now.

### 8. Powering a core off for real, and a warm boot

WFI isn't off. A core in WFI still has power and its caches. The PMU's real low-power FSM, the one
that powers cores down, didn't start with core 0 in WFI, or even in retention: `PMU_CLUSTER_PWR_ST`
read `0x8888fc80`, every core's power channel still saying "on" (p.510).

TF-A's system suspend does one more thing on its last core, and it's three lines:

```c
// TF-A plat/rockchip/rk3568/drivers/pmu/pmu.c:46-57
void __dead2 rockchip_soc_sys_pd_pwr_dn_wfi(void)
{
	uint64_t ctrl;
	__asm__ volatile ("mrs %0, " __XSTRING(CORTEX_A55_CPUPWRCTLR_EL1) : "=r" (ctrl));
	ctrl |= 0x01;
	__asm__ volatile ("msr " __XSTRING(CORTEX_A55_CPUPWRCTLR_EL1) ", %0" : : "r" (ctrl));
	isb();
	while (1)
		wfi();
}
```

`CPUPWRCTLR_EL1.CORE_PWRDN_EN`: the next WFI asks for the power to go. But a core that loses power
comes back through its reset vector, so before trying it I needed a way home. The A55's reset address
is `0xFFFF0000`, normally the BootROM. `PMU_SGRF_SOC_CON1` bits [12:11] remap it (TF-A uses that
field; the TRM has no table for it), and `2'b10` points it at SYSTEM_SRAM. I put a 60-byte stub there
that jumps back into my C code, and my power-down routine saves the registers, turns the data cache
off, cleans every level by set/way, sets `CORE_PWRDN_EN`, arms the FSM with its last store and
executes WFI:

```
// rtos_mcu/a55/mcu_pwr.S:252, 267-269
	orr	x9, x9, #1		/* CORE_PWRDN_EN */
...
	str	w24, [x23]		/* the last store: FSM armed / the ack / a stamp */
	dsb	sy
1:	wfi				/* the PMU takes the power away here */
```

The first try ended in Maskrom with nothing printed: the watchdog reset the chip and my output, stuck
in a pipe buffer, was lost. So both sides got one character per step on the UART (cache cleaned, FSM
armed, reset vector reached, MMU on). The second try printed `123<T...>`: core 0 got to its WFI and the
PMU did power it off, but the FSM stayed in state 0 for 3 s and nothing ever powered core 0 back on.
The TRM's condition is "After PMU detects all CPUs in WFI status" (p.477). Core 3 was bypassed in the
FSM settings, but it was still spinning in its real-time loop and never executed WFI. The FSM waits
for it anyway. I moved core 3 into a two-instruction `wfi; b .-4` loop first, through the handover
my real-time loop already supports, and the third try went all the way:

```
  mcu| [  OK  ] MCU sleep 1000 ms: ok; down 63 us, in sleep 1000 ms, wake 23 us; ...
  mcu|   trace  4: t       63 us  main 7  ddr 3  ddr_st 3  STATUS8 0x98  down 01
[  OK  ] mcu sleep off: core 0 came back by a warm boot (stub ran 1 time); save + cache clean 25 us, last WFI -> reset address 1000031 us, reset address -> back in C 4 us
```

Save and cache clean 25 µs; the PMU took core 0 off and DRAM into self-refresh within 63 µs (main
state 7); the MCU woke the PMU with the TRM's MCU wake-up source, `wakeup_mcu_sft` (p.480), and the FSM
was back in 23 µs; from the reset address back into C took 4 µs. The 16 MiB pattern was intact on
every run.

### 9. USB can reach the SRAM, and one frame per cycle

The TRM's list of who may access SYSTEM_SRAM, "Cortex-A55, MCU, CRYPTO, DCF and DMAC" (Part 1 5.3,
p.471), doesn't include USB, and I'd taken that to mean the USB controller can't reach it. I'd never
measured it. A `GET_DESCRIPTOR` with its data stage pointed at SRAM came back with the 18 descriptor
bytes in place, host system error 0; a `VS_PROBE` `SET_CUR` read its 26 bytes from SRAM and the camera
took both frame intervals. The list is not complete. It works because the SRAM is non-secure now and
the USB controller is a non-secure master.

That doesn't mean the stream can live in SRAM. My xHCI keeps 765 KiB of isochronous buffers, a 64 KiB
event ring and its contexts in DRAM, about 1091 KiB in all, against 64 KiB of SRAM. So the stream
stays in DRAM and DRAM sleeps between frames instead.

![One camera cycle]({{ '/assets/images/boards/rock3a/mcu_duty_cycle.png' | relative_url }})
*One 1 s cycle at 15 fps: DRAM awake only around one frame, then self-refresh. Most of the awake part is waiting for the camera's next whole frame.*

My first duty loop closed the stream after each frame and opened it again for the next. Every cycle
then took 1643 ms from "stream on" to the first whole frame (the camera restarts its sensor), and in a
500 ms period there was no time left to sleep at all: 0.0 %. Pausing works better. The xHCI's Stop
Endpoint command leaves the camera streaming in its alternate setting but schedules nothing, so the
controller does no DMA while DRAM sleeps; resume is a fresh ring, Set TR Dequeue Pointer and the
doorbell:

```c
// rtos_face/app/usb/xhci.c:614-637 (pause and resume, trimmed)
int xhci_isoc_pause(void)
{
	...
	int cc = command(0, 0, 0, T_STOPEP << 10 | iso.dci << 16 | iso.d->slot << 24, 0);
	...
int xhci_isoc_resume(void)
{
	...
	ring_init(ISORING, ISO_N);
	...
	int cc = command(ISORING | 1u, 0, 0, T_SETDEQ << 10 | iso.dci << 16 | iso.d->slot << 24, 0);
	if (cc != 1)
		return -cc;
	xhci_isoc_go();
	return 0;
```

One more bug before it ran: the A55 never woke at the end of the run. Its WFI only ends on an
interrupt the GIC forwards, and I'd enabled only the bell's mailbox line (INTID 216); the end-of-run
reply comes on element 0, INTID 215 (Part 1 Table 1-3, p.16). Both enabled, 20 cycles of 1 s:

```
rock3a# mcu cam duty 20 1000 fake2 rga
  mcu| [  OK  ] MCU duty 20 cycles of 1000 ms: DRAM in self-refresh 14711 of 19894 ms (73.9 %), 18 holds ok; frames 20 (none 0), 10 bells, 10 acks (0 time-outs)
  mcu|   bell -> A55 out of WFI 3 avg / 3 max us; bell -> ack seen 139 avg / 210 max us; self-refresh in <= 4 us, out <= 6 us, 5572317 of 5572317 polls in it
```

The whole frame arrives 173 to 187 ms after the resume at 15 fps, 74 to 87 ms at 30 fps. The MCU also
kicks the A55's watchdog every cycle, since the A55's own tick is stopped. Shorter and longer periods:

| Period, camera | Stream between frames | DRAM in self-refresh |
|---|---|---|
| 500 ms, 30 fps | pause / resume | 68.3 % (7255 of 10614 ms) |
| 1000 ms, 15 fps | pause / resume | 73.9 % (14711 of 19894 ms) |
| 2000 ms, 30 fps | pause / resume | 86.8 % (15804 of 18202 ms) |
| 2500 ms, 15 fps | close / reopen | 24.7 % (2284 of 9242 ms) |

### 10. All four A55s off, not just core 0

At this point I had filmed a demo and was calling it done. It wasn't. Only core 0 lost its power; cores
1 and 2 waited in WFI with power on, and core 3 sat in a WFI loop. The plan I'd written myself said all
four cores off, and I'd quietly settled for less. So, the other three.

![Sleep and wake, measured]({{ '/assets/images/boards/rock3a/mcu_power_states.png' | relative_url }})
*Who powers what off and on, with the times measured on the board. In sleep `PMU_CLUSTER_PWR_ST` reads `0x0000f08f`: bits 3..0 all set, all four cores down.*

The per-core bits of `PMU_CPU_AUTO_PWR_CON0/1` lost their digits in the TRM's PDF text (p.506-508),
so I took the layout from TF-A's `CPU_OFF` and `CPU_ON`, which use them. Core 0 sets `core_pm_en` for
a core; that core turns its GIC interface off, cleans only its own L1 (set/way on the shared L3 while
core 0 still runs would race core 0's lines), sets `CORE_PWRDN_EN` and executes WFI. Cores 1 and 2 also
needed `ACTLR_EL3.PWREN` in their start-up code, or the `CPUPWRCTLR_EL1` write traps.

Core 3 was the awkward one. It leaves the real-time loop through that loop's handover, which enters
code at Non-secure EL2, where `CPUPWRCTLR_EL1` traps too. So its entry is a single `smc #0`, and I
patched the loop's own EL3 vector to jump to a short piece of assembly in free PMU SRAM, at EL3, that do the
power-down there. Core 0 goes last, under the FSM as before. Waking is TF-A's `CPU_ON` in two writes:

```c
// rtos_mcu/mcu/cam.c:450-455
static void a55_wake0(void)
{
	REG(PMU + 0x310) = 1u << 16;
	REG(PMU + 0x310) = (1u << (16 + 3)) | (1u << 3);
	SHM->d.n_wake0++;
}
```

`core_pm_en` cleared, then `core_pm_sft_wakeup_en` set; the core starts at the remapped reset address.
In sleep, 4 runs of 4: `CLUSTER_PWR_ST` `0x0000f08f`, each core gone 4 to 7 µs after its last WFI, core
0 down by the FSM in 48 µs and back in 22 µs, every core at its reset address 7 µs after its wake bit.

In the camera loop the MCU doesn't need the FSM at all. It holds DRAM in self-refresh with the plain
PMU request, and core 0 powers itself off with its ack as the very last store, in one 64-byte line of
code so nothing after the ack is fetched from DRAM. On a bell the MCU powers core 0 on itself:

```
rock3a# mcu cam duty 20 1000 fake2 rga off
  mcu| [  OK  ] MCU duty 20 cycles of 1000 ms: DRAM in self-refresh 14736 of 19895 ms (74.0 %), 18 holds ok; frames 20 (none 0), 10 bells, 10 acks (0 time-outs)
  mcu|   A55 cores at the hold starts (CLUSTER_PWR_ST [3:0], 1 = off): AND 0xf, OR 0xf, all four off in 18 of 18 holds; core 0 powered on by the MCU 10 times
```

All four off at 18 of 18 hold starts, a bell to core 0 at its reset address in 16 µs, the face found
10 times out of 10. With a 2 s period DRAM slept 81.7 %; with the empty room only, 65.7 % and no bell
at all: the A55s slept through the whole run.

### 11. The MCU keeps the console

With four cores off there was nobody left to answer on the serial console. My RTOS shell lives on the
A55s. So the MCU got a small shell of its own (`help`, `status`, `cam`, `bells`, `sleep`, `wake`,
later `temp`), prompt `mcu❯`.

The rule I follow for any register two masters can touch is one writer at a time, and the MCU has no
atomic instructions anyway (RV32IMC). So UART2 gets an owner word in SYSTEM_SRAM, which the MCU can
read while DRAM sleeps and the A55 maps as device memory, so no stale cache line can hold it:

```c
// rtos_mcu/shared/mcu_ipc.h:102-104
#define MCU_CON_OWNER    0xFDCC4100   /* u32: 0 / MCU_CON_A55 = the A55's, MCU_CON_MCU = the MCU's */
#define MCU_CON_A55      0x35354341u  /* "AC55" little endian (C only: .S files never use the two magics) */
#define MCU_CON_MCU      0x4e4f434du  /* "MCON" little endian */
```

The A55 waits until its last bit is on the wire (`LSR.TEMT`), turns its RX interrupt off (or every key
would wake core 0 for nothing), writes "MCON", and only then starts the MCU's run. On `wake` the MCU
does the same in reverse before its final reply. While DRAM sleeps the MCU's hold loop also watches
`LSR` bit 0, Data Ready; UART2's 64-byte FIFO makes polling enough. A key ends the hold, DRAM is back in
microseconds and the shell answers:

```
mcu❯ status
  uptime   13.663 s since the hand-over
  A55      PMU_CLUSTER_PWR_ST 0x0000f08f: core 0 off, 1 off, 2 off, 3 off; DSU on
  DRAM     self-refresh 71.1 % of the time (9720 of 13663 ms, 12 holds, 0 cut short by a key); now STATUS8 0x1b (selfref_type 0)
  cam      14 cycles, 13 frames (none 0), 13 processed, 13 with motion, 13 NPU runs, 13 faces, 13 bells (13 acked)
```

Answers came 98 and 90 ms after a key typed during a hold, 1047 ms when the key landed while the MCU
was busy with a frame. There was one bug, and it was the rule again: every bell printed "M123" before
my echo. Those were my own step characters from the warm-boot code on core 0, a second writer on the
MCU's console. The macro now checks the owner word first. Over a run of 101 cycles: DRAM in
self-refresh 80.3 %, all four cores off at 102 of 102 hold starts, 81 bells, 4 keys that cut a hold
short, 0 RX overruns.

### 12. A dead end I parked: the MCU before DRAM exists

The last idea was to start the MCU in my very first stage of code after the BootROM, before the DDR
blob even trains DRAM. The first version put the MCU's program in PMU SRAM and it never ran: PMU SRAM
accepts secure masters only (Part 1 5.1, p.470), and the MCU isn't one. The second version used
SYSTEM_SRAM, and the BootROM hung while loading it, twice, with the board needing a power cycle each
time. A known-good loader went through the same USB path, and the BootROM's stack turned out to sit at
`0xFDCC0F30`, inside SYSTEM_SRAM. I stopped there. Three suspects are left: BootROM data where my
program goes, making region 0 non-secure while the BootROM runs, or the MCU itself running next to it.
None is tested alone yet.

## Result

The MCU, alone, runs the whole chain: it streams the webcam with 0 bad frames, converts each frame on
RGA2, runs RetinaFace on the NPU, scores it, and rings an A55 only on a face. With all four A55 cores
powered off between faces (`PMU_CLUSTER_PWR_ST` `0x0000f08f`), DRAM was in self-refresh **74.0 %** of a
1 s cycle at 15 fps, and 86.8 % with a frame every 2 s. A bell brings core 0 to its reset address in 16
µs.

| What | Before | After |
|---|---|---|
| YUYV → BGR, one 320 × 240 frame | 469.9 ms on the MCU | 148 µs on RGA2 (+ 21 µs of register writes) |
| MCU's YUYV stream, 15 fps, 5 s | 2 good, 31 bad | 52 good, 0 bad (92 / 0 at 30 fps) |
| DRAM self-refresh request | ignored (GRF selected) | in 13 µs, out 6 µs (PMU selected) |
| Bell to the A55 | 89 to 957 µs (1 ms polling) | 3 µs (WFI), 16 µs (core powered off) |
| Camera frame per cycle | 1643 ms (close / reopen) | 173 to 187 ms (pause / resume) |
| A55 cores off while waiting | 0, then core 0 only | all four, 18 of 18 hold starts |

The first real person came by accident. During the temperature run below, with only camera frames and
no test face, 189 of 359 frames had motion and the MCU rang 186 bells; the A55's own decoder found a
face every time. No frame was kept or looked at, so the board couldn't tell me who it was. It was me,
sitting at the desk. That makes it the first test of the chain with a real person: woken 186 times
out of 189 motion frames, all four cores off at 359 of 359 hold starts, DRAM asleep 57.6 % of the
cycles.

Now the part I can't claim. I have no current meter on this bench, so I have no watts. The closest I
have is temperature. The MCU reads the chip's TSADC once a cycle (the A55 starts it at boot, the MCU
only reads the data registers):

```
mcu❯ temp
  now      CPU 37.7 °C, GPU 37.2 °C (TSADC DATA0 0x840, DATA1 0x83c)
  per 60 samples (= per minute at a 1 s period; CPU / GPU avg, °C): 0:41.1/40.9 1:38.5/38.4 2:38.2/38.1 3:37.8/37.6 4:37.6/37.5 5:37.5/37.3
```

Six minutes with the A55 shell idle and four cores on in WFI: CPU sensor at 50.6 °C. Six minutes with
all four off and the MCU on the console: 37.5 °C, 13.1 °C lower, still falling 0.1 to 0.2 °C a minute.
Three minutes after `wake`: back to 50.0 °C. The PMIC rails read the same before and after (vdd_logic
and vdd_gpu at 0.900 V), so nothing in the run lowered a voltage. A temperature isn't a power, though,
and without the board's thermal resistance I can't turn 13.1 °C into milliwatts. I didn't measure the
power saved.

What's still missing:

- A stream with no DRAM at all is designed, not built. From the real build and the real stream, the
  xHCI's structures plus 16 isochronous descriptors fit in 29.0 KiB of the 47.5 KiB of SRAM that's free,
  but the hot code is tight (960 bytes of it against 2520 bytes left), and a whole 153 600-byte frame
  never fits. So without DRAM only the motion check could run; RGA2 and the NPU read DRAM, so DRAM would
  wake on motion anyway. It's a budget table, nothing more.
- The cluster's DSU (the shared L3 and its power) stays on. Turning it off is the deeper part of
  TF-A's suspend, not tried.
- All of this runs under my RTOS at Secure EL1. Under Linux the SRAM stays secure and the SGRF can't
  be written, so it would need a TF-A change first.
- The A55 still does the one-time set-up (NPU power and model, RGA power domain, the secure USB
  writes, opening the SRAM) before it hands over.
- Starting the MCU before the DDR blob is parked, with three suspects.
- The per-cycle averages are wrong in runs longer than about 179 s (a TIMER4 difference wraps); the
  uptime and DRAM share use another counter and are right.

## What I'd do next

A current meter on the 12 V input comes first; without it every "saving" above is a guess with a
thermometer. I'd measure the same three phases (A55 idle, all off, after wake), then one run with DRAM
held asleep the whole cycle to separate what DRAM costs from what the cores cost.

Then the DRAM-free motion check: lay the xHCI's memory out so it can live in SRAM, link the stream's
hot path into the SRAM section, and sum the 40 × 30 thumbnail packet by packet instead of keeping a
frame. If that works, DRAM would only wake when something moves, and the 173 to 187 ms wait per cycle
goes away.

And a longer test with real people, now that I know the chain notices me. The privacy rule stays: the
board reports numbers and boxes, never pictures.

## Skills this project used

- Reading a TRM critically: finding the register a figure names without an address, the counting
  direction of a timer, the source field of a low-power request, and an access list that turned out
  incomplete; writing down when my reading was wrong (sections 1, 2, 7, 9).
- Secure-world configuration on Rockchip: SGRF security regions found by bisecting bits on the board,
  the DDR firewall, the reset-vector remap in PMU SGRF (sections 1, 8).
- Bare-metal RISC-V: FreeRTOS on an SCR1 with no cache and no atomics, code placement between DRAM and
  SRAM by linker section, measuring that instruction fetch dominates (sections 1, 2).
- USB host internals: reusing my own xHCI/UVC stack on a second CPU architecture, isochronous ring
  overruns, a UVC frame-boundary quirk, pausing a stream with Stop Endpoint and Set TR Dequeue Pointer
  (sections 2, 9).
- Driving hardware blocks without a driver: RGA2 from its field tables, the NPU's program controller,
  power domains and the hang a powered-off domain causes (sections 3, 4).
- ARMv8 power management by hand: `CPUPWRCTLR_EL1`, cache clean by set/way, GIC redistributor sleep,
  a warm-boot stub, `CPU_OFF`/`CPU_ON` semantics taken from TF-A, an EL3 detour through an SMC
  (sections 8, 10).
- DRAM low-power: the PMU's self-refresh request, the controller's own state as proof, a hold loop that
  never touches DRAM (section 7).
- Multi-master rules: one writer per register and per cache line, a UART hand-over with no atomics,
  mailbox doorbells and which interrupt line ends a WFI (sections 5, 9, 11).
- Testing without the real input: a public-domain test face swapped in after capture, PC host tests
  against independent references before the board run (sections 3, 6).
- Measuring honestly: every number here comes from a log on the board, and the one I don't have
  (watts) is left as a temperature.

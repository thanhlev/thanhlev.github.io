---
layout: default
title: Tiny210 Information for development
short_description: "My reading notes from the S5PV210 manual: address map, iROM/BL1/BL2 boot, boot block layout"
status: "Done"
picture: "assets/images/tiny210/tiny210_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: rewritten as a STAR story"
index: 8
publish: true
tags: [samsung, arm, boot, memory]
permalink: /embedded/tiny210-information   # 2026-11-27: = the URL the collection default gave it; explicit so it never moves
---

<!-- 2026-11-22: rewritten in STAR form (user «hãy viết lại tất cả các trang theo chuẩn STAR»).
     Same Samsung tables, diagrams and quotes as before; nothing added. -->

# Tiny210 Information for development
{: .no_toc }

![Tiny210 cover, "S5PV210 boot": 16 KB, the most BL1 can be, why block 0 stays free]({{ '/assets/images/tiny210/tiny210_cover.jpg' | relative_url }})
*The chain from the manual: iROM loads at most 16 KB of BL1 into iRAM, BL1 loads BL2, BL2 brings up DRAM and the OS.*

![Tiny210V2 SDK board with its connectors labelled: UARTs, HDMI, Ethernet, USB hosts, LCD headers, SD slot, boot mode switch](../../../assets/images/tiny210/tiny210v2_i.jpg)

## Table of contents
{: .no_toc }

1. TOC
{:toc}

---

## Situation

I had FriendlyARM's Tiny210 (Samsung S5PV210 inside) and wanted to understand what happens between
power-on and U-Boot on it. Without that I couldn't say why the SD card has to be laid out the way it is.

## Task

Read Samsung's S5PV210 documentation and pull out what matters for booting: the address map, what the
iROM (BL0) loads, from which block of the boot device, and where it lands in memory.

## Action

The tables and diagrams below are Samsung's; what's mine is the selection and the order.

### SoC

- SoC: S5PV210, Vendor: Samsung.
- Block Diagram

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_block_diagram.png" width="900" alt="S5PV210 block diagram: Cortex-A8 core with L2 and NEON, multimedia blocks, memory interfaces, connectivity and system peripherals on the AHB/AXI bus" />
</p>

### Address map

- All address map

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_address_map.png" width="300" alt="S5PV210 address map from 0x0000_0000 to 0xFFFF_FFFF: boot area, DRAM 0 and 1, SROM banks, OneNAND/NAND, IROM and IRAM, SFRs" />
</p>

- Internal address map

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_internal_memory_address_map.png" width="800" alt="S5PV210 internal memory map: 64 KB iROM at 0xD000_0000, 96 KB iRAM at 0xD002_0000 with secure and non-secure parts, DMZ ROM" />
</p>

#### Device specific address space

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_device_specific_address_space.png" width="800" alt="Table of the S5PV210 device address space: address range, size and what sits there, from the boot area to the SFR region" />
</p>

#### Special function register map

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map1.png" width="800" alt="S5PV210 special function register map, part 1: 0xE000_0000 to 0xE80F_FFFF (CHIPID, SYSCON, GPIO, DMA, UART, SROM and more)" />
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map2.png" width="800" alt="S5PV210 special function register map, part 2: 0xE820_0000 to 0xF1EF_FFFF (SDMMC, USB OTG and host, audio, DMC, MFC)" />
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map3.png" width="800" alt="S5PV210 special function register map, part 3: 0xF1F0_0000 to 0xFB6F_FFFF (VIC, TZIC, G3D, HDMI, display, camera, JPEG)" />
</p>

### Booting

#### Booting sequence

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_booting_sequence.png" width="800" alt="S5PV210 boot-up diagram: iROM (BL0) loads BL1 and BL2 from the boot device into the 96 KB internal SRAM, then BL2 brings up SDRAM and loads the OS" />
</p>

> **Note**
>
> BL1 / BL2 : It can be variable size copied from boot device to internal SRAM area. BL1 max. size is 16KB. BL2 max. size is 80KB.

- **①** - iROM can do initial boot up : initialize system clock, device specific controller and booting device.
- **②** - iROM boot codes can load boot-loader to SRAM. The boot-loader is called BL1. Then iROM verify integrity of BL1 in case of secure boot mode.
- **③** - BL1 will be executed: BL1 will load remained boot loader which is called BL2 on the SRAM then BL1 verify integrity of BL2 in case of secure boot mode.
- **④** - BL2 will be executed : BL2 initialize DRAM controller then load OS data to SDRAM.
- **⑤** - Finally, jump to start address of OS. That will make good environment to use system.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_bootup_diagram.png" width="800" alt="Flowchart of the S5PV210 boot: iROM checks the OM pins and the BL1 checksum, BL1 checks and loads BL2, BL2 initialises DRAM and loads the OS" />
</p>

##### iROM(BL0) boot-up sequence

- Disable the Watch-Dog Timer
- Initialize the instruction cache controller.
- Initialize the stack and heap region.
- Check secure key.
- Set Clock divider, lock time, PLL (MPS value), and source clock.
- Check OM pin and load the first boot loader (The size of boot loader depends on S/W) from specific device (block number 0) to iRAM.
- If secure booting is enabled, execute integrity check
- If integrity check passes, then jump to the first boot loader in iRAM (0xD002_0010)

##### First stage bootloader(BL1) boot-up sequence

- Load the second boot loader from boot device to iRAM.
- If secure booting is enabled, execute integrity check.
- If integrity check passes, then jump to the second boot loader in iRAM (The jumping address depends on user's software)

##### Second stage bootloader(BL2) boot-up sequence

- Initializes the DRAM controller.
- Load the OS image from specific device (block number 1) to DRAM.
- If secure booting is enabled, execute integrity check.
- If integrity check passes, then jump to OS code in DRAM (0x2000_0000 (DRAM0) or 0x4000_0000(DRAM1))

#### Boot device configuration

The booting device can be chosen from following list:

- General NAND Flash memory
- OneNAND memory
- SD/ MMC memory (such as MoviNAND and iNAND)
- eMMC memory
- eSSD memory
- UART and USB devices

iROM checks for OM pins to priority boot devices

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_om_pin1.png" width="800" alt="S5PV210 OM pin table: each OM[5:0] combination and the boot device it selects (NAND, OneNAND, SD/MMC, eMMC, eSSD, NOR, UART/USB), with X-TAL or X-TAL(USB)" />
  <img src="../../../assets/images/tiny210/tiny210_om_pin2.png" width="800" alt="Part of the OM pin table: OM[5:0] values for OneNAND demux, SD/MMC and 4-bit eMMC boot, X-TAL or X-TAL(USB)" />
</p>

#### BL1 image boot block assignment

- BL1 will be loaded by BL0 to internal SRAM at start address 0xD002_0000
- BL1 has variable size, so BL0 requires 16 bytes header info to contain BL1 size, BL1 checksum. So BL0 known the size to load and use checksum to verify BL1.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_BL1_memory_map.png" width="800" alt="BL1 memory map in the internal SRAM: BL1 from 0xD002_0010 after a 16-byte header, then heap, exception vectors, globals, signature, stacks" />
</p>

- BL0 supports secure boot, in case of using secure boot, BL1 need to include signature at the end of raw BL1 binary.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_BL1_secure_boot.png" width="800" alt="BL1 image layout: 16-byte header (size, checksum) and the binary for a non-secure boot, plus a 512-byte signature for a secure boot" />
</p>

##### SD/MMC/eSSD Device Boot Block Assignment

- The first one block shouldn’t be used (reserved), modern BL0 support searching for BL1 in a partition, so first block and be used to store MBR.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_mmc_block_assignment.png" width="800" alt="SD/MMC/eSSD boot block layout: 512-byte reserved block, BL1 (mandatory), then BL2, kernel and user file system (recommended)" />
</p>

##### eMMC Device Boot Block Assignment

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_emmc_block_assignment.png" width="800" alt="eMMC boot block layout: BL1 from block 0 (mandatory), then BL2, kernel and user file system (recommended)" />
</p>

##### OneNAND/NAND Device Boot Block Assignment

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_nand_block_assignment.png" width="800" alt="OneNAND/NAND boot block layout, counted in pages: BL1 from page 0 (mandatory), then BL2, kernel and user file system" />
</p>

#### Secure boot

> **According to the datasheet**
> The basic criterion for security system is "The ‘root of trust’ has to be hardware. You cannot request a software system to ‘validate’ itself.”

In S5PV210, the root of trust is implemented by iROM code in internal ROM. Therefore it cannot be modified by unauthorized users. The hardware design proves the integrity of iROM code. On the other hand, the first boot loader, the second boot loader and OS images are stored in external memory devices. Therefore, the iROM code (that has already been proved as secure) should verify the integrity of first boot loader. If the integrity check passes on first boot loader, the first boot loader is included in trust region. Then, first boot loader verifies the integrity of the second boot loader, the second boot loader verifies the integrity of the OS image.

##### Secure booting sequence

###### The iROM code (BL0)

- Checks the integrity of RSA public key using E-fuse RSA key hash value.
- Loads the first boot loader to iRAM.
- Checks the integrity of first boot loader using trusted RSA public key.

###### The first boot loader (BL1)

- Loads security software to iRAM.
- Checks the integrity of software using trusted RSA public key.
- Loads second boot loader to iRAM.
- Checks the integrity of second boot loader using trusted RSA public key.

###### The second boot loader (BL2)

- Loads security software to iRAM.
- Checks the integrity of software using trusted RSA public key.
- Loads OS kernel and applications to DRAM.
- Checks the integrity of OS kernel and application using trusted RSA public key.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_secure_boot_sequence.png" width="800" alt="S5PV210 secure boot: iROM checks the second-level bootloader with the RSA public key hashed in the e-fuse, then each stage verifies the next before running it" />
</p>

## Result

The chain on this SoC: iROM (BL0) loads BL1 (at most 16 KB, with a 16-byte header holding its size
and checksum) from the boot device into iRAM at 0xD002_0000 and jumps to 0xD002_0010. BL1 loads BL2
(at most 80 KB) into iRAM, BL2 brings up the DRAM controller and loads the OS to 0x2000_0000 (DRAM0) or
0x4000_0000 (DRAM1). With secure boot on, each stage checks the next with an RSA key whose hash sits in
e-fuse. The SD/MMC block layout is also why block 0 of the SD card stays free for the MBR (see
[Disk Partition Tables](/linux_general/partition-table)).

All of this is from the documentation; I didn't check any of it with a debugger on the board.

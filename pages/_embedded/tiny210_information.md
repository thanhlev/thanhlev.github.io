---
layout: default
title: Tiny210 Information for development
short_description: Memory map and boot-up information
status: "Done"
picture: "assets/images/tiny210v2_i.jpg"
latest_release: "Unknown"
videos: []
---

# Tiny210 Information for development
{: .no_toc }

![](../../../assets/images/tiny210/tiny210v2_i.jpg)

## Table of contents

{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## **SoC**

- SoC: S5PV210, Vendor: Samsung.
- Block Diagram

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_block_diagram.png" width="900" />
</p>

## **Address Map**

- All address map

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_address_map.png" width="300" />
</p>

- Internal address map

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_internal_memory_address_map.png" width="800" />
</p>

### **Device specific address space**

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_device_specific_address_space.png" width="800" />
</p>

### **Special function register map**

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map1.png" width="800" />
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map2.png" width="800" />
  <img src="../../../assets/images/tiny210/tiny210_special_function_address_map3.png" width="800" />
</p>

## **Booting**
### **Booting sequence**

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_booting_sequence.png" width="800" />
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
  <img src="../../../assets/images/tiny210/tiny210_bootup_diagram.png" width="800" />
</p>

#### **iROM(BL0) boot-up sequence**

- Disable the Watch-Dog Timer
- Initialize the instruction cache controller.
- Initialize the stack and heap region.
- Check secure key.
- Set Clock divider, lock time, PLL (MPS value), and source clock.
- Check OM pin and load the first boot loader (The size of boot loader depends on S/W) from specific device (block number 0) to iRAM.
- If secure booting is enabled, execute integrity check
- If integrity check passes, then jump to the first boot loader in iRAM (0xD002_0010)

#### **First stage bootloader(BL1) boot-up sequence**

- Load the second boot loader from boot device to iRAM.
- If secure booting is enabled, execute integrity check.
- If integrity check passes, then jump to the second boot loader in iRAM (The jumping address depends on user's software)

#### **Second stage bootloader(BL2) boot-up sequence**

- Initializes the DRAM controller.
- Load the OS image from specific device (block number 1) to DRAM.
- If secure booting is enabled, execute integrity check.
- If integrity check passes, then jump to OS code in DRAM (0x2000_0000 (DRAM0) or 0x4000_0000(DRAM1))

### **Boot Device Configuration**

The booting device can be chosen from following list:

- General NAND Flash memory
- OneNAND memory
- SD/ MMC memory (such as MoviNAND and iNAND)
- eMMC memory
- eSSD memory
- UART and USB devices

iROM checks for OM pins to priority boot devices

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_om_pin1.png" width="800" />
  <img src="../../../assets/images/tiny210/tiny210_om_pin2.png" width="800" />
</p>

### **BL1 image boot block assignment**

- BL1 will be loaded by BL0 to internal SRAM at start address 0xD002_0000
- BL1 has variable size, so BL0 requires 16 bytes header info to contain BL1 size, BL1 checksum. So BL0 known the size to load and use checksum to verify BL1.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_BL1_memory_map.png" width="800" />
</p>

- BL0 supports secure boot, in case of using secure boot, BL1 need to include signature at the end of raw BL1 binary.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_BL1_secure_boot.png" width="800" />
</p>

#### **SD/MMC/eSSD Device Boot Block Assignment**

- The first one block shouldn’t be used (reserved), modern BL0 support searching for BL1 in a partition, so first block and be used to store MBR.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_mmc_block_assignment.png" width="800" />
</p>

#### **eMMC Device Boot Block Assignment**

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_emmc_block_assignment.png" width="800" />
</p>

#### **OneNAND/NAND Device Boot Block Assignment**

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_nand_block_assignment.png" width="800" />
</p>

### **Secure boot**

> **According to the datasheet**
> The basic criterion for security system is "The ‘root of trust’ has to be hardware. You cannot request a software system to ‘validate’ itself.”

In S5PV210, the root of trust is implemented by iROM code in internal ROM. Therefore it cannot be modified by unauthorized users. The hardware design proves the integrity of iROM code. On the other hand, the first boot loader, the second boot loader and OS images are stored in external memory devices. Therefore, the iROM code (that has already been proved as secure) should verify the integrity of first boot loader. If the integrity check passes on first boot loader, the first boot loader is included in trust region. Then, first boot loader verifies the integrity of the second boot loader, the second boot loader verifies the integrity of the OS image.

#### **Secure booting sequence**

##### **The iROM code (BL0)**

- Checks the integrity of RSA public key using E-fuse RSA key hash value.
- Loads the first boot loader to iRAM.
- Checks the integrity of first boot loader using trusted RSA public key.

##### **The first boot loader (BL1)**

- Loads security software to iRAM.
- Checks the integrity of software using trusted RSA public key.
- Loads second boot loader to iRAM.
- Checks the integrity of second boot loader using trusted RSA public key.

##### **The second boot loader (BL2)**

- Loads security software to iRAM.
- Checks the integrity of software using trusted RSA public key.
- Loads OS kernel and applications to DRAM.
- Checks the integrity of OS kernel and application using trusted RSA public key.

<p align="center">
  <img src="../../../assets/images/tiny210/tiny210_secure_boot_sequence.png" width="800" />
</p>

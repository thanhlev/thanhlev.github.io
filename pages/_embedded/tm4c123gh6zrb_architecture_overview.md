---
layout: default
title: "Tiva ™ TM4C123GH6ZRB Microcontroller [phần 1]"
short_description: "Thông tin về kiến trúc, RAM, ROM, Flash, Bootloader"
status: "Done"
picture: "assets/images/TM4C123GH6ZRB_cpu_block_diagram.png"
latest_release: "Copy từ repo cũ qua"
videos: []
---

# Tiva ™ TM4C123GH6ZRB Microcontroller [phần 1]

{: .no_toc }


## Table of contents

{: .no_toc }

1. TOC
{:toc}

-----------------------------------

## Architectural Overview

| Feature     | Description  |
|:-------------|:------------- |
| Core      | ARM Cortex-M4F processor core |
|Performance|80-MHz operation; 100 DMIPS performance|
|Flash|256 KB single-cycle Flash memory|
|System SRAM|32 KB single-cycle SRAM|
|EEPROM|2KB of EEPROM|
|Internal ROM|Internal ROM loaded with TivaWare™ for C Series software|

!["block_diagram](../../../assets/images/ti/TM4C123GH6ZRB/block_diagram.png)


## TM4C123GH6ZRB Microcontroller Features

### On-Chip Memory

- 32 KB single-cycle SRAM
- 256 KB Flash memory
- 2KB EEPROM
- Internal ROM loaded with TivaWare™ for C Series software:
  - TivaWare™ Peripheral Driver Library
  - TivaWare Boot Loader
  - Advanced Encryption Standard (AES) cryptography tables
  - Cyclic Redundancy Check (CRC) error detection functionality

### SRAM

32 KB of single-cycle on-chip SRAM

Because read-modify-write (RMW) operations are very time consuming, ARM has introduced bit-banding technology in the Cortex-M4F processor. With a bit-band-enabled processor, certain regions in the memory map (SRAM and peripheral space) can use address aliases to access individual bits in a single, atomic operation.

Data can be transferred to and from SRAM by the following masters:

- µDMA
- USB

### Flash Memory

- 256 KB of single-cycle on-chip Flash Memory
- organized as a set of 1-KB blocks that can be individually erased
- Erasing a block causes the entire contents of the block to be reset to all 1s
- These blocks are paired into a set of 2-KB blocks that can be individually protected. The blocks can be marked as read-only or execute-only, providing different levels of code protection. Read-only blocks cannot be erased or programmed, protecting the contents of those blocks from being modified. Execute-only blocks cannot be erased or programmed, and can only be read by the controller instruction fetch mechanism, protecting the contents of those blocks from being read by either the controller or by a debugger.

### ROM

The internal ROM of the TM4C123GH6ZRB device is located at address `0x0100.0000` of the device memory map. Detailed information on the ROM contents can be found in the Tiva™ C Series TM4C123x ROM User’s Guide (literature number [SPMU367](http://www.ti.com/lit/pdf/spmu367)).

The TM4C123GH6ZRB ROM is preprogrammed with the following software and programs.

- TivaWare Peripheral Driver Library(DriverLib)

> controlling on-chip peripherals with a boot-loader capability. The library performs both peripheral initialization and control functions, with a choice of polled or interrupt-driven peripheral support. In addition, the library is designed to take full advantage of the stellar interrupt performance of the ARM Cortex-M4F core. No special pragmas or custom assembly code prologue/epilogue functions are required. For applications that require in-field programmability, the royalty-free TivaWare Boot Loader can act as an application loader and support in-field firmware updates.

- TivaWare Boot Loader
- Advanced Encryption Standard (AES) cryptography tables

>is a publicly defined encryption standard used by the
U.S. Government. AES is a strong encryption method with reasonable performance and size. In addition, it is fast in both hardware and software, is fairly easy to implement, and requires little memory. The Texas Instruments encryption package is available with full source code, and is based on Lesser General Public License (LGPL) source. An LGPL means that the code can be used within an application without any copyleft implications for the application (the code does not automatically become open source). Modifications to the package source, however, must be open source.

- Cyclic Redundancy Check (CRC) error-detection functionality

> is a technique to validate a span of data has the same contents
as when previously checked. This technique can be used to validate correct receipt of messages (nothing lost or modified in transit), to validate data after decompression, to validate that Flash memory contents have not been changed, and for other cases where the data needs to be validated. A CRC is preferred over a simple checksum (for example, XOR all bits) because it catches changes more readily.

#### TivaWare Boot Loader

The TivaWare Boot Loader is used to download code to the Flash memory of a device without the use of a debug interface.<span style="color:blue"> When the core is reset, the user has the opportunity to direct the core to execute the ROM Boot Loader or the application in Flash memory by using any GPIO signal in Ports A-H as configured in the Boot Configuration (BOOTCFG) register</span>

At reset, the following sequence is performed:

- The BOOTCFG register is read. If the EN bit is clear, the ROM Boot Loader is executed.
- In the ROM Boot Loader, the status of the specified GPIO pin is compared with the specified polarity. If the status matches the specified polarity, the ROM is mapped to address 0x0000.0000 and execution continues out of the ROM Boot Loader.
- If the EN bit is set or the status doesn't match the specified polarity, the data at address `0x0000.0004` is read, and if the data at this address is `0xFFFF.FFFF`, the ROM is mapped to address `0x0000.0000` and execution continues out of the ROM Boot Loader.
- If there is data at address `0x0000.0004` that is not `0xFFFF.FFFF`, the stack pointer (SP) is loaded from Flash memory at address `0x0000.0000` and the program counter (PC) is loaded from address `0x0000.0004`. The user application begins executing.

The boot loader uses a simple packet interface to provide synchronous communication with the device. The speed of the boot loader is determined by the internal oscillator (PIOSC) frequency as it does not enable the PLL. The following serial interfaces can be used:

- UART0
- SSI0
- I2C0
- USB

> **Note**
> U0Tx is not driven by the ROM boot loader until the auto-bauding process has completed. If U0Tx is floating during this time, the receiver it is connected to may see transitions on the signal, which could be interpreted by its UART as valid characters. To handle this situation, put a pull-up or pull-down on U0Tx, providing a defined state for the signal until the ROM boot loader begins driving U0Tx. A pull-up is preferred as it indicates that the UART is idle, rather than a pull-down, which indicates a break condition.

#### TivaWare Peripheral Driver Library

The TivaWare Peripheral Driver Library contains a file called driverlib/rom.h that assists with calling the peripheral driver library functions in the ROM. The detailed description of each function is available in the Tiva™ C Series TM4C123x ROM User’s Guide (literature number [SPMU367](http://www.ti.com/lit/pdf/spmu367)).

<span style="color:blue">The `driverlib/rom_map.h` header file is also provided to aid portability when using different Tiva™ C Series devices which might have a different subset of DriverLib functions in ROM. The driverlib rom_map.h header file uses build-time labels to route function calls to the ROM if those functions are available on a given device, otherwise, it routes to Flash-resident versions of the functions.</span>

A table at the beginning of the ROM points to the entry points for the APIs that are provided in the ROM. Accessing the API through these tables provides scalability; while the API locations may change in future versions of the ROM, the API tables will not. The tables are split into two levels; the main table contains one pointer per peripheral which points to a secondary table that contains one pointer per API that is associated with that peripheral. The main table is located at 0x0100.0010, right after the Cortex-M4F vector table in the ROM.

Additional APIs are available for graphics and USB functions, but are not preloaded into ROM. The TivaWare Graphics Library provides a set of graphics primitives and a widget set for creating graphical user interfaces on Tiva™ C Series microcontroller-based boards that have a graphical display (for more information, see the TivaWare™ Graphics Library for C Series User's Guide (literature number [SPMU300](http://www.ti.com/lit/pdf/spmu300))). The TivaWare USB Library is a set of data types and functions for creating USB Device,

### EEPROM

- 2Kbytes of memory accessible as 512 32-bit words
- 32 blocks of 16 words (64 bytes) each
- Built-in wear leveling
- Access protection per block
- Lock protection option for the whole peripheral as well as per block using 32-bit to 96-bit unlock codes (application selectable)
- Interrupt support for write completion to avoid polling
- Endurance of 500K writes (when writing at fixed offset in every alternate page in circular fashion) to 15M operations (when cycling through two pages ) per each 2-page block.

## Useful Links

- Tiva™ C Series TM4C123x ROM User’s Guide (literature number [SPMU367](http://www.ti.com/lit/pdf/spmu367)).
- TivaWare™ Boot Loader for C Series User's Guide (literature number [SPMU301](http://www.ti.com/lit/pdf/spmu301))
- "Using the ROM" chapter of the TivaWare™ Peripheral Driver Library for C Series User's Guide (literature number [SPMU298](http://www.ti.com/lit/pdf/spmu298))
- TivaWare™ Graphics Library for C Series User's Guide (literature number [SPMU300](http://www.ti.com/lit/pdf/spmu300))


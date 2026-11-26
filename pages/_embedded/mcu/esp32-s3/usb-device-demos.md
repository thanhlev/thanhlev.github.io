---
layout: default
title: "Every TinyUSB device demo on the S3, checked from the PC side"
short_description: "Seven ESP-IDF device examples plus the serial/JTAG echo, judged by what Linux enumerated, and the board that locked itself out of its own flashing port"
status: "Done"
picture: "assets/images/mcu/esp32-s3/usb_device_demos_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-08: eight demos confirmed on hardware, six host demos built only"
index: 2
publish: true
permalink: /embedded/mcu/esp32-s3/usb-device-demos
board_parent: esp32-s3
tags: [esp32, usb, testing]
result: "8 of 14 USB demos confirmed by enumeration: CDC, storage, NCM, MIDI, composite, HID"
---

# Every TinyUSB device demo on the S3, checked from the PC side

[Back to the ESP32-S3 hub]({{ '/embedded/mcu/esp32-s3/' | relative_url }})

![ESP32-S3 cover, "Every device demo": 8 / 14 confirmed, checked from the PC side]({{ '/assets/images/mcu/esp32-s3/usb_device_demos_cover.jpg' | relative_url }})
*8 of the 14 USB demos confirmed by what Linux bound to them: CDC, storage, NCM, MIDI, composite, HID.*

![The two USB blocks of the ESP32-S3]({{ '/assets/images/mcu/esp32-s3/usb_two_blocks.png' | relative_url }})
*The two USB blocks of the ESP32-S3; 8 of the 14 device demos were confirmed from the PC side.*

## Situation

Before writing my own USB device (the [webcam]({{ '/embedded/mcu/esp32-s3/usb-webcam' | relative_url }})),
I wanted to know which of Espressif's USB examples actually work on my S3, the 2 MB PSRAM devkit.
ESP-IDF v5.2 ships fourteen: seven TinyUSB device demos, six host demos and one that echoes over the
built-in USB-Serial-JTAG port.

## Task

Build all fourteen for `esp32s3` and run every one this board can run. "It worked" has to mean what
the PC ended up with (a new tty, a disk, a network interface), not that `idf.py flash` exited 0.

## Action

All fourteen built clean, from 205 KB (the echo) to 667 KB (`tusb_ncm`, which drags in the whole
Wi-Fi stack). The only change I made to Espressif's code was four `project()` names that didn't match
their directory, because my build script finds the image by that name.

The thing to know about the S3 is in the picture above. `soc_caps.h` says it has both
`SOC_USB_OTG_SUPPORTED` and `SOC_USB_SERIAL_JTAG_SUPPORTED`, but they share GPIO19/20 through a mux.
The moment an app starts the OTG controller, `303a:1001` disappears, and with it the DTR/RTS lines
that let esptool reset the chip into the loader. I flashed `tusb_serial_device` over the native port,
and then couldn't get back in:

```
$ esptool.py -p /dev/ttyACM0 --before usb_reset chip_id
A fatal error occurred: Failed to connect to Espressif device:
Serial data stream stopped: Possible serial noise or corruption.
```

`default_reset` fails the same way. `esp_tinyusb` doesn't implement a reboot-to-bootloader on the
CDC line state, so the 1200-baud trick from Arduino boards does nothing. The fix was boring: the
devkit's other USB-C port goes to a CH343 bridge wired to EN and GPIO0 directly, so I flashed
everything else through that and left the native port free to be the thing under test. BOOT+RESET
also works, one press per flash.

Then the board stopped running anything. `tusb_msc` flashed fine, but the PC saw `303a:1001` instead
of a disk, and every later flash failed with `No serial data received`. UART0 showed why:

```
ESP-ROM:esp32s3-20210327
rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))
waiting for download
```

`boot:0x0` means GPIO0 was low when the chip latched its straps. A watchdog reset (which the ROM
reports as POWERON) didn't clear it, and holding all four DTR/RTS combinations on the bridge didn't
change it either. Pulling both cables did: the `tusb_msc` image already in flash started on its own and
`/dev/sda` appeared. My guess is the bridge's auto-reset transistor stayed on after the flasher exited,
so my flash script now deasserts DTR/RTS after every flash. The last five demos went in one after
another with no trouble after that.

## Result

Eight demos, each recorded by what Linux bound to it:

| Demo | VID:PID | What the PC did |
|---|---|---|
| `usb_serial_jtag_echo` | 303a:1001 | marker string on ttyACM0 came back byte for byte |
| `tusb_serial_device` | 303a:4001 | `cdc_acm`, new ttyACM, same echo |
| `tusb_console` | 303a:4001 | `cdc_acm`, log output over USB |
| `tusb_msc` | 303a:4002 | `usb-storage`, `/dev/sda` 1000K, "TEST MSC Storage" |
| `tusb_ncm` | 303a:4000 | `cdc_ncm`, an `enx…` interface named after the chip's MAC |
| `tusb_midi` | 303a:4008 | `snd-usb-audio`, audio control + MIDI streaming |
| `tusb_composite_msc_serialdevice` | 303a:4001 | `cdc_acm` and `usb-storage` on one device |
| `tusb_hid` | 303a:4004 | `usbhid`, keyboard + mouse, and it moved my pointer |

That's every descriptor shape TinyUSB ships, working on this silicon. I left the board on
`usb_serial_jtag_echo`, the one state where it can still be reflashed over its own native port.

## What I'd do next

The six host demos (`usb_host_lib`, CDC-ACM, the CP210x/FTDI/CH34x VCP, HID, MSC, UVC) need 5 V on VBUS
and a USB-A socket on the OTG pins, and the devkit wires both its USB-C ports as devices. A small
breakout and a second S3 running `tusb_serial_device` would give `cdc_acm_host` something to talk to.
A reboot-to-bootloader hook on the CDC line state would also be nice, but it only helps demos that
have a CDC port.

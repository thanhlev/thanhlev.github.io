---
layout: default
title: "ESP32-S3 demo apps"
short_description: "Small ESP-IDF apps on my ESP32-S3 devkits: a fake USB webcam that plays video files, and every TinyUSB device demo checked from the PC side"
status: "In Progress"
picture: "assets/images/mcu/esp32-s3/webcam_capture.png"
latest_release: "2026-11-22: hub page with two STAR write-ups"
index: 40
publish: true
permalink: /embedded/mcu/esp32-s3/
notes_hub: true
tags: [esp32, usb, camera, freertos]
---

# ESP32-S3 demo apps

![Frame 30 recorded on the PC from the S3 webcam]({{ '/assets/images/mcu/esp32-s3/webcam_capture.png' | relative_url }})

I have two cheap ESP32-S3 devkits (DevKitC-1 clones, two USB-C ports each): one with 2 MB of PSRAM,
one with 8 MB octal PSRAM and 8 MB of flash. The S3 is the ESP32 I reach for when I want USB, because
it has both of Espressif's USB blocks: the fixed USB-Serial-JTAG port that every recent ESP32 has, and
a real full-speed OTG controller the application can drive.

That second block is where all the fun is, and also where I lost the most time. Most of what's here
came out of one question in October 2026: what can this chip pretend to be when I plug it into my PC?

The ESP8266 posts on this site are older and are about the boot flow, not apps; they stay where they are.

## The stories

{% include board_children.html board="esp32-s3" %}

## Still open

The six USB host demos build but I haven't run one: neither devkit gives 5 V on VBUS to a device
plugged into the OTG pins, and I don't have a USB-A breakout wired up yet. The webcam's SD card path
is built and wired on paper, but I haven't put a real card in it.

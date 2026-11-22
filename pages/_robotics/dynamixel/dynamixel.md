---
layout: default
title: "DYNAMIXEL servos (MX-28, AX-12A)"
short_description: "Smart servos on one half-duplex bus, and what their Python SDK really puts on the wire"
status: "In Progress"
picture: "assets/images/robotics/dynamixel/write_sequence.png"
latest_release: "2026-11-22: hub page with one STAR write-up"
index: 4
publish: true
permalink: /robotics/dynamixel/
board_hub: true
---

# DYNAMIXEL servos (MX-28, AX-12A)

![One Goal Position write and its status reply, byte by byte]({{ '/assets/images/robotics/dynamixel/write_sequence.png' | relative_url }})

A DYNAMIXEL is a servo you talk to with packets instead of a PWM pulse. Motor, gearbox, encoder,
H-bridge, a small MCU and a serial transceiver sit in one case, and up to 253 of them hang on one
half-duplex bus, each with its own ID. You can read back position, load, voltage and temperature,
which is exactly what my old thesis robot never had.

I have a few MX-28 and AX-12A. They're the servos my
[humanoid]({{ '/robotics/humanoid/' | relative_url }}) model is built around (MX-28 in the legs,
AX-12A in the arms), and I'd like to use them for a 3D-printed arm too. The MX-28 is the older
"academy" generation: a Maxon coreless motor, a 12-bit magnetic encoder (4096 counts per turn),
metal gears, 12 V. With the original firmware it speaks Protocol 1.0, with the MX(2.0) firmware
Protocol 2.0 and a different control table. The AX-12A only speaks 1.0.

What I don't have yet is the USB adapter (a U2D2). A scan with my old Python scripts in August 2025
found no motor, and I never got further on the hardware side. So everything below was measured on
my PC: the real ROBOTIS SDK, driven against a fake serial port that records every byte.

## The stories

{% include board_children.html board="dynamixel" coll="robotics" %}

## Still open

Everything that needs a servo: which firmware my MX-28s run (that decides Protocol 1.0 or 2.0),
real round-trip times on the bus with Return Delay 0 and a 1 ms USB latency timer, and whether the
profile and PID behave like the e-manual says. I also want to report the two SDK bugs upstream,
which I haven't done yet.

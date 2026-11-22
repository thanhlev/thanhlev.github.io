---
layout: default
title: "DC motor drive on a simulated bench"
short_description: "A brushed-motor drive stack (identify, tune, home, protect, fall back) run against a simulated H-bridge and encoder, six scenarios that assert their own numbers"
status: "In Progress"
picture: "assets/images/control/dc-motor-drive/dcm_bringup_overview.png"
latest_release: "2026-11-22: hub page, three STAR write-ups, re-run in double and float"
index: 31
publish: true
permalink: /embedded/control/dc-motor-drive/
notes_hub: true
tags: [motor, control, simulation, cpp, testing]
---

# DC motor drive on a simulated bench

![Bring-up from power-on: identification, hard-stop homing, then the first 30 rad move]({{ '/assets/images/control/dc-motor-drive/dcm_bringup_overview.png' | relative_url }})

After the control library I wanted one complete drive, not a loop in isolation: a small brushed motor on
an integrated H-bridge with a quadrature encoder (4096 counts), the way it would sit on a board. That means
everything around the PI that nobody draws in the block diagram. A CiA 402 state machine, so the drive can
be enabled, faulted and reset properly. An identifier that measures the motor instead of trusting the
datasheet. Homing against a hard stop. Protection: chip fault, I²t heating, stall. A back-EMF speed
estimate for when the encoder dies.

There's no board yet, so the plant is simulated: an H-bridge model with dead time, current ripple, heating
and a bus, an encoder model with edge timing, on the brushed-motor model from my `act` library. One PWM
period is 50 µs, the slow loop runs every 20th tick (1 kHz). The glue between drivers and control goes only
through the driver interfaces, so the same code can later sit on hardware.

One executable, `dc-motor`, runs six scenarios, checks its headline numbers against the plant's true
state and exits non-zero if one is off. I re-built and re-ran it on 2026-11-22 in double and in float; both
end with `dc-motor: all expectations met`.

## The stories

{% include board_children.html board="dc-motor-drive" %}

## Still open

All of this is the simulator's truth. A real motor's back-EMF constant falls as the magnets warm and nothing
re-checks it while running, and the host loop is sequential, so it never shows the interrupt preempting the
1 kHz task halfway through a step. The first real board will re-measure every number on these pages.

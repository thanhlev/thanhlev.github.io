---
layout: default
title: "My control library (ctl): PID to MPC, in simulation"
short_description: "A header-only C++ control library I wrote for small MCUs, and the demos that check every law against a plant instead of a promise"
status: "In Progress"
picture: "assets/images/control/control-library/control_library_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: hub page, four STAR write-ups re-run in double and float"
index: 30
publish: true
permalink: /embedded/control/control-library/
notes_hub: true
tags: [control, simulation, cpp, testing]
---

# My control library (ctl): PID to MPC, in simulation

![The control library in numbers]({{ '/assets/images/control/control-library/control_library_cover.jpg' | relative_url }})
*One library, every law checked against a plant: back from windup in 0.77 s instead of 108, LQI holding the pole to 0.0008 rad, all in simulation. On the left, part of my anti-windup plot.*

![Same PID, same clamped actuator: without anti-windup it takes 108 s to come back]({{ '/assets/images/control/control-library/pid_antiwindup.png' | relative_url }})

Every firmware project I start ends up with a PID copied from the last one, usually with the same
bug. In September 2026 I stopped doing that and wrote one library instead: `ctl`, header-only C++17,
no allocation, no exceptions, no peripheral access. A control law takes a setpoint, a measurement and
`dt`, and returns a number. That's all it knows, which is exactly why I can test it on the PC.

It grew more than I planned. Next to the PID there's a relay autotuner, gain scheduling, a bounded
adaptive PID, fuzzy PID, ADRC, sliding mode, a Smith predictor, discrete LQR (and LQI), a Kalman filter,
recursive least squares, a small constrained MPC, motion profiles and path tracking. The plants live in
a second library (`act`, more on that on the [plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})),
because a PID with no plant is just a difference equation.

Everything on these pages ran in simulation, nothing on a real motor yet. I rebuilt and re-ran every demo
on 2026-11-22 before writing this, in double and in single precision (`-DCTL_REAL_FLOAT`), because the
float build is the one an MCU gets and it has caught real bugs before. All of them passed in both.

## The stories

{% include board_children.html board="control-library" %}

## Still open

The library has never closed a loop on hardware. The first board port will re-measure every number
here. And the demos' printed commentary can go stale: one of them still claims 0.22 rad where the run
says 0.36 (it's on the pendulum page). The numbers are asserted, the sentences aren't.

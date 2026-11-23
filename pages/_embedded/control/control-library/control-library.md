---
layout: default
title: "My control library (ctl): PID to MPC, in simulation"
short_description: "A header-only C++ control library I wrote for small MCUs, and the demos that check every law against a plant instead of a promise"
status: "In Progress"
picture: "assets/images/control/control-library/control_library_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-23: four more stories (ADRC and sliding mode, model-based laws, trajectories, estimators), measured in double and float"
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

The first four stories are the classics. The next four are the laws past PID that had only ever printed
one number in my gallery demo: ADRC, sliding mode and super-twisting against a wrong plant gain; computed
torque, MRAC and the Smith predictor with a right, wrong or missing model; a motion profile with
feedforward, and pure pursuit against Stanley; the complementary filter, EKF and UKF. For those I wrote a
small measurement demo that pushes each law past its comfortable case, and ran it in both precisions on
2026-11-23. The unit tests ran alongside: 805,780 checks in double, 805,783 in float, no failures.

## The stories

{% include board_children.html board="control-library" %}

## Still open

The library has never closed a loop on hardware. The first board port will re-measure every number
here. And the demos' printed commentary can go stale: one of them still claims 0.22 rad where the run
says 0.36 (it's on the pendulum page), and the gallery still sells feedforward short (0.30 m where the
trajectories page gets 0.0015 m). The numbers are asserted, the sentences aren't.

Some controllers have a story elsewhere: iterative learning control on the
[piezo stage]({{ '/embedded/control/plant-models/piezo-nanopositioner' | relative_url }}), the repetitive
controller in the [power loops]({{ '/embedded/control/plant-models/power-loops' | relative_url }}), energy
shaping in the [cart-pole swing-up]({{ '/embedded/control/plant-models/pendulum-swingup' | relative_url }}),
the notch filter on the [CNC axis]({{ '/embedded/control/plant-models/cnc-servo-axis' | relative_url }}),
sliding-mode slip control in [ABS]({{ '/embedded/control/plant-models/cruise-and-abs' | relative_url }}),
and the bounded adaptive PID on the [pendulum page]({{ '/embedded/control/control-library/pendulum-lqr-lqi' | relative_url }}).

The rest pass their unit tests but have no comparison I'd call a result yet, so no story: backstepping
(its Lyapunov function falls, but I haven't run it against anything), INDI (only its closed-loop poles are
checked against the paper, no loop closed), input-output linearisation (only its singularity guard is
tested), fuzzy PID, IMC, pole placement, impedance and admittance control, and gain scheduling, which the
gallery shows interpolating gains and nothing more. The thermostat with minimum dwell times and the
slow-PWM heater did run (46 switches in 4 hours, none under the 120 s and 180 s floors; 20.987 °C on a
21 °C setpoint), but they're small enough that I haven't written them up.

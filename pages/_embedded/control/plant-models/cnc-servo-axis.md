---
layout: default
title: "CNC axis: 264 mm to 1.5 µm with the same gains"
short_description: "A ballscrew axis with a 220 Hz resonance: profile, prewarped notch, feedforward, and a gain margin that was negative all along"
status: "Done"
picture: "assets/images/control/plant-models/cnc_servo_axis_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 2
publish: true
permalink: /embedded/control/plant-models/cnc-servo-axis
board_parent: plant-models
result: "Peak following error 264 mm -> 248 µm -> 26.5 µm -> 1.48 µm; gain margin -18.1 dB without the notch, +6.3 dB with it"
tags: [motor, servo, control, simulation, cpp]
description: "A ballscrew axis with a 220 Hz resonance: profile, prewarped notch, feedforward, and a gain margin that was negative all along"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# CNC axis: 264 mm to 1.5 µm with the same gains

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "264 mm to 1.5 µm": 1.48 µm peak error, with the same gains]({{ '/assets/images/control/plant-models/cnc_servo_axis_cover.jpg' | relative_url }})
*Peak following error from 264 mm down to 1.48 µm with the same gains, in simulation.*

![Following error: profile only (red), plus notch (orange), plus feedforward (blue)]({{ '/assets/images/control/plant-models/cnc_following_error.png' | relative_url }})
*Following error for the profile only (red), plus the notch (orange) and plus feedforward (blue), which ends at a 1.48 µm peak.*

## Situation

The classic surprise in motion control: tune a servo with the motor uncoupled and it's lovely, bolt it to the
machine and it screams. The motor didn't change. The plant did: it's now a motor and a 20 kg table joined by a
ballscrew, which is a spring, which makes it fourth order with a lightly damped resonance. I wanted to see
exactly how much each standard fix buys.

## Task

A 50 mm move on a 5 mm-pitch ballscrew axis that has to finish within 5 µm. Motor inertia 2e-4 kg·m², load-to-motor
ratio 2.5, first resonance 220 Hz with ζ = 0.02, position loop at 2 kHz. One set of gains, designed once, and four
structures: a bare step, an S-curve profile, plus a notch, plus velocity/acceleration feedforward.

## Action

No tuning loop. The crossover goes a factor of five below the resonance (44 Hz), the PD gains come from the total
inertia (Kp = J·ωc², Kd = 2ζJωc) and the integral corner another factor of five below.

Then the frequency-domain check, which is the step I'd have skipped:

```
  without notch: phase margin                     72.4214 deg
  without notch: gain margin                     -18.1304 dB
  with notch: phase margin                        49.6858 deg
  with notch: gain margin                          6.3492 dB
```

72° of phase margin at crossover looks great. But at 220 Hz the phase passes −180° with the magnitude above one,
so the loop is unstable however good the crossover looks. The notch is specified as a depth (0.03 over 0.5, a
16× dip, not a null, because a real resonance moves with temperature and carriage position) and prewarped. Plain
Tustin at 2 kHz moves a 220 Hz notch by several hertz, and a Q-20 notch that's 3 Hz off isn't a notch.

The part that cost real time: the PID defaults to derivative-on-measurement, right for a step setpoint. With a
smooth profile there's nothing to kick on, and D-on-measurement fights the motion: −Kd times the measured
velocity, 85 N·m at 314 rad/s. It ran the axis 600 mm past target before I found it. With a profile the D term now
acts on the error (`setpointWeightD = 1`).

```
1: position step, nothing else
  peak following error                        264260.9677 um
2: S-curve profile, no notch
  peak following error                           247.7865 um
3: profile + prewarped notch
  peak following error                            26.4686 um
  time to settle within 5 um                       0.3220 s
4: profile + notch + velocity/accel feedforward
  peak following error                             1.4771 um
  time to settle within 5 um                       0.2890 s
```

## Result

With the same gains throughout, peak following error goes 264 mm (bare step) → 248 µm (S-curve) → 26.5 µm (notch) →
1.48 µm (feedforward), and settling into the 5 µm band goes from never (1.20 s run, never inside) to 0.29 s. The
notch turns a −18.1 dB gain margin into +6.3 dB, so on this machine it isn't a refinement, it's what makes the loop
stable.

## What I'd do next

Detune the model's resonance by ±10 % and see how quickly the 16× notch stops helping. That's the real question on
a machine whose carriage position moves the mode.

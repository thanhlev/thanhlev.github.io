---
layout: default
title: "PID: 108 s of windup, and gains from a relay"
short_description: "Seven configurations of one PID on one clamped plant, then a relay experiment that measures Tu and Ku instead of guessing"
status: "Done"
picture: "assets/images/control/control-library/pid_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run, same numbers in double and float"
index: 1
publish: true
permalink: /embedded/control/control-library/pid
board_parent: control-library
result: "Recovery after saturation 108.55 s -> 0.77 s with back-calculation; relay test hits Tu within 1.3 %, Ku within 2 %"
tags: [control, simulation, cpp]
description: "Seven configurations of one PID on one clamped plant, then a relay experiment that measures Tu and Ku instead of guessing"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# PID: 108 s of windup, and gains from a relay

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![Control library cover, "PID: 108 s of windup": 0.77 s (was 108.55), back-calculation fixes it]({{ '/assets/images/control/control-library/pid_cover.jpg' | relative_url }})
*Back-calculation brings the loop back from saturation in 0.77 s instead of 108.55 s, same gains, in simulation.*

![Limits only (red) vs limits plus back-calculation (blue)]({{ '/assets/images/control/control-library/pid_antiwindup.png' | relative_url }})
*With limits only (red) the loop needs 108.55 s to come out of saturation; with back-calculation (blue), 0.77 s.*

## Situation

The PID I kept copying between projects had no output limit and no anti-windup. On a bench that's
invisible: the setpoints are reasonable and nothing saturates. Then one day you ask for something the
actuator can't deliver, the integrator keeps counting, and the loop is useless for a long time after you
take the request back. I wanted to see how long "a long time" is, and I wanted gains I could measure
rather than gains I'd tweaked until the plot looked fine.

## Task

Two demos on the new `ctl::Pid`. First, one plant (first-order lag, K = 2, τ = 1.5 s, actuator clamped to
±1, loop at 100 Hz) driven to an unreachable setpoint of 10 for 20 s and then back to 0.5, with seven
PID configurations. Second, a relay-feedback autotune (Åström–Hägglund) on a plant whose answer I know
in closed form: three equal lags, K/(τs+1)³, where Tu = 2πτ/√3 and Ku = 8/K.

## Action

The first build of `basic_pid` didn't even compile:

```
basic_pid_demo.cpp:26:10: fatal error: demo_support.h: No such file or directory
```

The demo's CMake still points at the old name of the product-demo folder, which I'd renamed and
forgotten about. I built it with an extra `-I` for now (the CMake fix is still on my list) and ran it:

```
  1. no limits, no anti-windup       overshoot  0.138   recovery    0.64 s   travel    66.4
  2. limits, no anti-windup          overshoot  0.324   recovery  108.55 s   travel     4.3
  3. limits + back-calculation       overshoot  0.048   recovery    0.77 s   travel     4.6
  5. unfiltered derivative           overshoot  0.039   recovery    0.78 s   travel   155.8
  6. derivative low-passed at 5 Hz   overshoot  0.046   recovery    0.77 s   travel    50.5
```

Row 1 looks the best and is a lie: it has no limits, so it commands 2.04 on an actuator that can do 1.
Row 2 is what my old copy did once I gave it a clamp. Rows 5 and 6 add 2 % measurement noise, and
"travel" (total actuator movement) is where the derivative filter pays: three times less wear for the same
recovery.

Then the relay. It swings ±0.5 around a bias of 0.5, never leaves that range, and reads the period and
amplitude of the limit cycle:

```
experiment took 12.51 s (12511 ticks), never commanded more than 1.000,
  measured Tu = 1.1020 s   (analytic 1.0883, error +1.3%)
  measured Ku = 3.9196     (analytic 4.0000, error -2.0%)
```

Ku is off more than Tu because the describing function keeps only the first harmonic of the square wave.
I feed both into the seven published tuning rules and close the loop with each:

```
  Ziegler-Nichols PID    overshoot   50.8%  settle   2.91 s  IAE  0.651  travel    7.3
  no overshoot           overshoot   19.9%  settle   4.11 s  IAE  0.866  travel    1.3
  Tyreus-Luyben PID      overshoot    0.0%  settle   5.25 s  IAE  0.679  travel    4.0
```

The rule literally called "no overshoot" overshoots 20 %. Those rules were fitted to first-order-plus-
dead-time processes, and this plant is third order. Only Tyreus-Luyben stayed under the setpoint, and it
pays with roughly twice the settling time of Ziegler-Nichols.

## Result

Back-calculation anti-windup cuts the recovery after saturation from 108.55 s to 0.77 s on the same gains,
and a 5 Hz derivative filter cuts actuator travel under noise from 155.8 to 50.5. The relay experiment
measures Tu within 1.3 % and Ku within 2 % of the closed-form answer in 12.5 s, without ever leaving its
±0.5 band. Same results in the float build.

## What I'd do next

Run the relay on something with real dead time (a heater, see the hotend story on the
[plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})), where I expect Ku to be off by a
lot more than 2 %. And fix that CMake include path.

---
layout: default
title: "A load step, a disturbance observer, and a current sensor with no sign"
short_description: "What a disturbance observer buys (and costs) under a 0.02 N·m step, and running the inner loop on a magnitude-only current signal"
status: "Done"
picture: "assets/images/control/dc-motor-drive/load_and_current_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 2
publish: true
permalink: /embedded/control/dc-motor-drive/load-and-current
board_parent: dc-motor-drive
result: "Observer: dip 2.49 -> 1.51 rad/s, recovery 18.0 -> 3.1 ms, at 2.8x the current noise; magnitude-only sensing holds the 3 A limit with 2.2x the speed noise"
tags: [motor, control, sensor, simulation, cpp]
---

# A load step, a disturbance observer, and a current sensor with no sign

[Back to the DC motor drive hub]({{ '/embedded/control/dc-motor-drive/' | relative_url }})

![DC motor drive cover, "A load step, observed": 3.1 ms recovery (was 18.0), and a sensor that reads |i|]({{ '/assets/images/control/dc-motor-drive/load_and_current_cover.jpg' | relative_url }})
*With the observer the load step costs 1.51 rad/s instead of 2.49 and recovers in 3.1 ms instead of 18.0.*

![Speed at 200 rad/s when 0.02 N·m lands at 0.5 s: PI alone vs with the observer]({{ '/assets/images/control/dc-motor-drive/dcm_loadstep_speed.png' | relative_url }})
*Speed at 200 rad/s when 0.02 N·m lands at 0.5 s: the dip goes from 2.49 to 1.51 rad/s with the observer.*

## Situation

Two things I couldn't answer from the block diagram. A disturbance observer is supposed to reject load
torque faster than the integrator, but it differentiates the encoder speed (J·dω/dt), so it must be noisier,
and I didn't know by how much. And the cheap integrated H-bridges report current through a mirror pin that gives |i| only,
and only while the bridge is driving. Without a sign you can't close a current PI, so I wanted to know if the drive is still usable.

## Task

Run two identical drives on the commissioned model from the bring-up story. First pair: hold 200 rad/s,
drop 0.02 N·m on both at 0.5 s (0.8 A worth of torque), one with the observer, one without. Second pair:
step 0 → 150 → −150 → 0 rad/s with a load from 0.3 s, one with a signed shunt, one with magnitude-only
sensing, which makes the library run the inner loop in voltage mode and use |i| only to limit.

## Action

```
$ ./build/dc_motor/dc-motor loadstep
                                         PI alone     observer
  speed dip after the step                  2.488        1.506 rad/s
  back within 1 rad/s after                  18.0          3.1 ms
  reference noise before the step          0.0433       0.1234 A rms
  load compensation at the end             0.0000       0.8270 A
```

The observer's feed-forward ends at 0.827 A, which is the load divided by Kt, so it estimated the torque
itself and not just "something". The price is right there: before the step its current reference is 2.85×
noisier than the PI's.

The reversal from +150 to −150 rad/s regenerates, which is exactly where a sign-blind current sensor could
get confused.

```
$ ./build/dc_motor/dc-motor currentsense
                                             signed    magnitude
  0 -> 135 rad/s (90 %) after                  40.4         45.7 ms
  speed rms around 150, 0.2-0.3 s            0.0435       0.0974 rad/s
  reversal to -135 rad/s after                 71.1         75.3 ms
  peak |i| in the reversal                    3.020        3.091 A
```

![The reversal: true current in both drives and what the magnitude-only sensor reports]({{ '/assets/images/control/dc-motor-drive/dcm_currentsense_reversal.png' | relative_url }})

*The magnitude sensor (orange in the plot) reads a positive 3 A while the true current is −3 A, and it
still holds the limit, because the limit only needs |i|. What you lose is the current loop's stiffness:
voltage mode is about twice as noisy at speed.*

## Result

With the observer, the dip under the load step drops from 2.49 to 1.51 rad/s and recovery from 18.0 to 3.1 ms,
at 2.85× the current-reference noise. Magnitude-only sensing reaches and holds every speed and keeps the peak
current at 3.09 A against a 3 A limit through the regenerating reversal; its speed is 2.2× noisier (2.0× in the
float build) and its 90 % rise is 5 ms slower.

## What I'd do next

The observer's bandwidth is the knob between those two columns. I only ran one value. A sweep of dip vs noise
would show where it stops being worth it.

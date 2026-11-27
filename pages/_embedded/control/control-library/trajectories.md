---
layout: default
title: "Motion profile and feedforward: 0.30 m to 1.5 mm by moving the derivative"
short_description: "An S-curve move with exact feedforward that still missed by 0.30 m, the one PID setting that fixed it, and pure pursuit against Stanley at 6, 12 and 24 m/s"
status: "Done"
picture: "assets/images/control/control-library/trajectories_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-23: first write-up, measured in double and float"
index: 7
publish: true
permalink: /embedded/control/control-library/trajectories
board_parent: control-library
result: "Same gains, exact feedforward: peak tracking error 0.301 m with D on the measurement, 0.0015 m with D on the error; at 24 m/s pure pursuit is inside 10 cm after 1.30 s, Stanley after 2.32 s"
tags: [control, simulation, cpp]
description: "An S-curve move with exact feedforward that still missed by 0.30 m, the one PID setting that fixed it, and pure pursuit against Stanley at 6, 12 and 24 m/s"
date: 2026-11-23
last_modified_at: 2026-11-27
---

# Motion profile and feedforward: 0.30 m to 1.5 mm by moving the derivative

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![Control library cover, "0.30 m to 1.5 mm": 1.5 mm (was 301), by moving the derivative]({{ '/assets/images/control/control-library/trajectories_cover.jpg' | relative_url }})
*The same PID and the same feedforward follow a 1 m S-curve to 1.5 mm instead of 301 mm, once the derivative looks at the error. In simulation.*

![Tracking error of the 1 m move for four configurations, log scale]({{ '/assets/images/control/control-library/adv_profile_feedforward.png' | relative_url }})
*Red: derivative on the measurement, with and without feedforward, both near 0.3 m. Solid blue: derivative on the error plus feedforward, 0.0015 m at worst.*

## Situation

My controller gallery demo moves a 2 kg mass with 1.5 N·s/m of drag by 1 m, three ways: a bare step, an
S-curve profile (1.5 m/s, 3 m/s², 20 m/s³), and the profile plus feedforward of its own velocity and
acceleration. The feedforward gains are the exact mass and drag, so in theory the PID has almost nothing
left to do. The gallery printed peak errors of 1.00, 0.34 and 0.30 m, and its README read that as
"the machine actually following a trajectory it can execute". 0.30 m of error on a 1 m move with a
perfect model is not following anything. Something was fighting the feedforward.

## Task

Find what, using the gallery's own numbers as the baseline, without touching the gains or the plant.
Then, since path tracking sits in the same header family, compare the library's two lateral controllers
on the gallery's car: a kinematic bicycle with a 2.7 m wheelbase starting 1.5 m off its lane, nose turned
0.2 rad away, at 6, 12 and 24 m/s.

## Action

The PID in the gallery is set up with `setpointWeightD = 0`: the derivative acts on the measurement only.
That's the right habit for steps, because a derivative on the error kicks hard when the setpoint jumps.
On a profiled move it's the wrong one. The derivative term becomes -Kd·v, a brake on every m/s the profile
asks for, and with Kd = 20 at the profile's 1.5 m/s that term alone is 30 N, against a feedforward that never
needs more than about 8 N. The feedforward drives, the derivative brakes, and the P and I terms only
push back once there's enough position error to do it with. That error is the 0.30 m.

I reran the move in `controller_traces` (the measurement demo next to the gallery) with the derivative
on the error, `setpointWeightD = 1`, nothing else changed:

```
step command                   peak tracking error 0.99997 m
S-curve, D on measurement      peak tracking error 0.33843 m
S-curve + ff, D on measurement peak tracking error 0.30113 m
S-curve, D on error            peak tracking error 0.07562 m
S-curve + ff, D on error       peak tracking error 0.00152 m
```

With the derivative on the error the profile alone already gets to 0.076 m, and with the feedforward
the error is 0.0015 m, 200× smaller than the gallery's best row. In that run the feedback part of the
command never exceeds 0.003 N; the feedforward does the whole move. There's no derivative kick to worry
about either: an S-curve's position reference is smooth, and its velocity starts at zero. The
[CNC axis story]({{ '/embedded/control/plant-models/cnc-servo-axis' | relative_url }}) on the plant models
hub does the same thing on a full servo axis with a resonance, where it takes the error down to 1.48 µm.

The path trackers are less dramatic and more interesting. Pure pursuit steers toward a point a speed-
dependent distance ahead (3 m + 0.4 s × v); Stanley steers on the cross-track error at the front axle
(k = 1.2):

| speed | pure pursuit: inside 10 cm after | peak steer | Stanley: inside 10 cm after | peak steer |
|---|---|---|---|---|
| 6 m/s | 2.10 s | 0.412 rad | 2.06 s | 0.470 rad |
| 12 m/s | 1.55 s | 0.253 rad | 2.12 s | 0.343 rad |
| 24 m/s | 1.30 s | 0.132 rad | 2.32 s | 0.273 rad |

At walking pace they're even. As the speed goes up, pure pursuit's lookahead grows with it, so it
steers less and still gets back sooner. Stanley's gain is on the error divided by the speed, so it gets
softer as the car gets faster and its tail drags out. Pure pursuit isn't free though: at 24 m/s it swings
out to about 2.0 m before turning back and crosses the line by 9 cm, where Stanley peaks at 1.78 m and
never crosses. Both end on the line at 15 s.

![Lateral offset over distance for pure pursuit and Stanley at 12 and 24 m/s]({{ '/assets/images/control/control-library/adv_path_tracking.png' | relative_url }})
*Blue, pure pursuit: back on the lane sooner, with a wider first swing and a small overshoot. Red, Stanley: no overshoot, a long tail at 24 m/s.*

## Result

Same gains, same exact feedforward: moving the PID's derivative from the measurement to the error takes
the peak tracking error of the 1 m S-curve from 0.301 m to 0.0015 m. On path tracking, pure pursuit gets
within 10 cm of the lane after 1.30 s at 24 m/s with a peak steering angle of 0.132 rad, Stanley after
2.32 s with 0.273 rad; at 6 m/s they're within 0.04 s of each other. Same numbers in the float build.
All in simulation, on a kinematic car with no tyre slip.

## What I'd do next

Fix the gallery itself so its printed line stops underselling feedforward, and give `ctl::Pid` a comment
next to `setpointWeightD` saying when 0 is wrong. Then run both path trackers on a curved path with a
dynamic tyre model, where Stanley is supposed to earn its keep.

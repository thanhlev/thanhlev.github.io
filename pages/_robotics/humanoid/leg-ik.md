---
layout: default
title: "Leg IK that misses by 166 mm, and the two sign errors behind it"
short_description: "Swapping the old NumPy solver for my C++ kinematics library, then finding the bug wasn't in the IK at all"
status: "Done"
picture: "assets/images/robotics/humanoid/hum_ik_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-20: gait fixed, 600/600 frames within 1 µm"
index: 1
publish: true
permalink: /robotics/humanoid/leg-ik
board_parent: humanoid
result: "600 of 600 gait targets within 1 µm (was 166 mm median), the whole walk solved in 0.28 s instead of 38.6 s"
tags: [robotics, kinematics]
description: "Swapping the old NumPy solver for my C++ kinematics library, then finding the bug wasn't in the IK at all"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# Leg IK that misses by 166 mm, and the two sign errors behind it

[Back to the humanoid hub]({{ '/robotics/humanoid/' | relative_url }})

![Leg IK cover: 600 of 600 targets within 1 µm]({{ '/assets/images/robotics/humanoid/hum_ik_cover.jpg' | relative_url }})
*600 of 600 gait targets within 1 µm (was 166 mm median), and the whole walk solves in 0.28 s.*

![One IK solve on the left leg in MuJoCo]({{ '/assets/images/robotics/humanoid/sim_ik.gif' | relative_url }})
*One IK solve on the left leg in MuJoCo; all 600 gait targets now land within 1 µm.*

## Situation

The thesis code solves each leg with a numerical Jacobian and damped least squares (λ = 0.4) over
five active joints: hip roll, three pitches (hip, knee, ankle), ankle roll. When I ported it from
MATLAB and checked FK(IK(target)) against the target for the whole walk (300 frames, two legs),
the median error was 166 mm, p95 207 mm, worst 245 mm. Not one of the 600 solves got within 1 mm.
It also took 76 to 83 ms per frame in Python, far too slow for a 50 Hz loop.

The first suspect was the solver. A five-joint leg can't reach an arbitrary 6D pose, and the hip
axes don't even intersect: in the DH model hip roll and hip pitch are skew, 10.0 mm apart, and the
same at the ankle. So no textbook closed form either.

## Task

Put the leg on my own C++ kinematics library (it has its own test suite, 6411 checks), ask it for
the task a 5-DOF leg can actually do (foot position plus the sole normal, free rotation about it),
keep the old Python API so the old demos and tests still run, and measure before and after on
the same targets.

## Action

The leg is the old nine DH rows, links 0 to 3 folded into the base, joints 4 to 8 with the old limits.
Python calls the C++ through ctypes. I deliberately kept no NumPy fallback: two implementations
would drift apart.

First run of the new leg test: 193 of 200 random reachable targets with 8 restarts. Every miss had
a joint near its limit (ankle roll ±89°, hip roll ±55°). With 40 restarts all 200 solve, and the
extra restarts only cost anything when the first try fails.

Then the before/after script, and a surprise:

```
$ python3 tools/measure_ik.py
reachable, seed near
  before (NumPy, 329d7dcc) 47/200 to 1 um + sole normal, 196/200 to the old 0.1 mm / 0.01 rad (0.45 s)
  after  (cpp_libs kin/)   200/200 to 1 um + sole normal, 199/200 to the old 0.1 mm / 0.01 rad (0.09 s)
...
gait as robot.py makes it
  before (NumPy, 329d7dcc) median 1.7e+02 mm, p95 207, max 245, <= 1 um on 0/600 (38.61 s)
  after  (cpp_libs kin/)   median 1.2e+02 mm, p95 136, max 140, <= 1 um on 0/600 (4.17 s)
```

The solver was now fine on anything reachable, and the walk was still 120 mm off. So the targets
were wrong. Forward kinematics at zero angles puts the foot at x = +130 mm, and the gait generator
asked for x = −120: a foot 120 mm *above* the hip. Flipping that sign left 93 targets still out of
reach. The second sign error was in the lift: the swing leg's lift pushed the foot further from
the hip (120 + 15 mm) instead of pulling it in. With both fixed, 0 of 600 targets are beyond the
125 mm reach.

I rewrote that part of the gait from what it means physically (pelvis height, swing foot lifted
towards the hip) and left y and z bit-for-bit as they were.

## Result

```
gait as robot.py makes it
  before (NumPy, 329d7dcc) median 1.7e+02 mm, p95 207, max 245, <= 1 um on 0/600 (59.48 s)
  after  (cpp_libs kin/)   median 0.00024 mm, p95 0.000882, max 0.00098, <= 1 um on 600/600 (0.28 s)
```

All 600 targets within 1 µm, the worst at 0.98 µm, and the whole walk solves in 0.28 s (the old solver took 38.6 s and 59.5 s in two runs of the same script). In MuJoCo
the foot matches the C++ forward kinematics to 1e-12 m. While checking that, I found that the leg
`robot.py` calls "left" is on the robot's right in a right-handed world.

## What I'd do next

The three parallel pitch axes make the sagittal part a planar 3R chain, so a closed-form solve
with a constant correction for the 10 mm offset looks possible. I haven't written it; the
numerical solve is already fast enough for 50 Hz.

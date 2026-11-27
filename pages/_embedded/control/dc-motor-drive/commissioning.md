---
layout: default
title: "Commissioning from a datasheet that's 50 % wrong"
short_description: "Enable, identify R, L, Kt, J, b and friction on the drive itself, re-tune from that, home on a hard stop, then move 30 rad"
status: "Done"
picture: "assets/images/control/dc-motor-drive/commissioning_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 1
publish: true
permalink: /embedded/control/dc-motor-drive/commissioning
board_parent: dc-motor-drive
result: "Six motor parameters identified within 0.7 % (datasheet off by 17-50 %) in 4.9 s; origin exact to the count, final error 0.7 counts"
tags: [motor, control, simulation, cpp]
description: "Enable, identify R, L, Kt, J, b and friction on the drive itself, re-tune from that, home on a hard stop, then move 30 rad"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# Commissioning from a datasheet that's 50 % wrong

[Back to the DC motor drive hub]({{ '/embedded/control/dc-motor-drive/' | relative_url }})

![DC motor drive cover, "Datasheet 50 % wrong": 0.7 % on six parameters, the drive measures the motor]({{ '/assets/images/control/dc-motor-drive/commissioning_cover.jpg' | relative_url }})
*All six motor parameters within 0.7 % in 4.9 s, from a datasheet that was off by up to 50 %.*

![The 30 rad move after homing: profile and true shaft]({{ '/assets/images/control/dc-motor-drive/dcm_bringup_move.png' | relative_url }})
*The 30 rad move after homing: the profile and the true shaft, 0.7 counts apart at the end.*

## Situation

Every drive I've tuned started from the datasheet and ended with hand-tweaking, because the datasheet
describes a motor, not the one on my bench with its coupling and its load. In the simulated plant I made
that explicit: the datasheet the drive starts from has R 17 % low, L 30 % high, Kt 10 % low and the inertia
50 % low.

## Task

Bring the drive up the way it would happen on a real machine, with every check against the plant's true
parameters: CiA 402 to OperationEnabled, identify the motor on the drive itself (R and L with the rotor held,
Kt, J, b and Coulomb friction with it free), re-tune the servo and the protection from what was identified,
find the origin on a hard stop 2 rad behind the shaft, then run a 30 rad trapezoid at 200 rad/s and
2500 rad/s².

## Action

```
$ ./build/dc_motor/dc-motor bringup
  CiA 402: NotReadyToSwitchOn -> SwitchOnDisabled (0x0240) -> ReadyToSwitchOn (0x0221) -> SwitchedOn (0x0233) -> OperationEnabled (0x0637)
  identification time                              4.9061 s
  parameter     datasheet identified       true     error
  R  (ohm)         0.9960     1.2039     1.2000    +0.32%
  L  (mH)          0.7800     0.6029     0.6000    +0.48%
  Kt (mN m/A)     22.5000    25.0018    25.0000    +0.01%
  J  (g cm^2)    100.0000   199.3802   200.0000    -0.31%
  b  (uN m s)     20.0000    10.0682    10.0000    +0.68%
  Fc (mN m)        1.0000     1.9939     2.0000    -0.31%
```

The identifier pauses between the locked and the free steps (`AwaitFreeRotor`): it waits for someone to
release the rotor, just like on a fixture. After that the drive disables, configures the servo gains from the
*identified* model, puts protection on the identified R and back-EMF constant, and enables again. Nothing
after this point ever sees the plant's true parameters.

Homing seeks at −5 rad/s with the current limited to 0.5 A until it hits the stop, backs off, and takes the
count at the stop as the origin. The origin has to be applied to the encoder counter *and* to the speed
estimator in the same step. I've had the version where only the counter got it, and the compiler doesn't care,
so the glue now does both together and a drift test pins the order.

```
  homing time                                      1.8600 s
  origin - true stop                               0.0000 counts   ok
  move: settled within 2 counts after              0.2277 s        ok
  move: worst following error                      0.0157 rad      ok
  move: final error (true shaft)                  -0.7048 counts   ok
```

## Result

From a datasheet off by 17 to 50 %, the drive identifies all six parameters to within 0.7 % (worst: viscous
friction, +0.68 %) in 4.9 s, homes to the exact count in 1.86 s, and finishes the 30 rad move 0.7 counts from
target with a worst following error of 0.016 rad. The float build agrees to within a few hundredths of a
percent (J −0.33 %, final error −0.60 counts).

## What I'd do next

The identifier needs the rotor held for R and L. On a real machine that's a fixture or a brake, and I don't
have either yet. I'd like a version that does R and L with short pulses too fast to turn the shaft.

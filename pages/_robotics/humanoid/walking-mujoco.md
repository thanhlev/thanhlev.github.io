---
layout: default
title: "Walking in MuJoCo: two feet in one place, and the one feedback that paid"
short_description: "An online LIPM walker at 50 Hz, a simulation bug that faked every torque number, and capture steps that made things worse"
status: "Done"
picture: "assets/images/robotics/humanoid/hum_walk_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-21: re-measured with servo speed limits and the skeleton torso"
index: 2
publish: true
permalink: /robotics/humanoid/walking-mujoco
board_parent: humanoid
result: "In MuJoCo, IMU feedback lifts the push margin from 1075 to 1338 mN·s (+24 %); steps up to 40 mm walk, 50 mm falls"
tags: [robotics, kinematics, simulation]
description: "An online LIPM walker at 50 Hz, a simulation bug that faked every torque number, and capture steps that made things worse"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# Walking in MuJoCo: two feet in one place, and the one feedback that paid

[Back to the humanoid hub]({{ '/robotics/humanoid/' | relative_url }})

![Walking cover: IMU feedback adds 24 % push margin]({{ '/assets/images/robotics/humanoid/hum_walk_cover.jpg' | relative_url }})
*In MuJoCo, IMU feedback lifts the push margin from 1075 to 1338 mN·s (+24 %).*

![Same 175 mN·s sideways push: open loop falls at 3.14 s, IMU feedback stays up]({{ '/assets/images/robotics/humanoid/walk_push.gif' | relative_url }})
*The same 175 mN·s sideways push in MuJoCo: open loop falls at 3.14 s, IMU feedback stays up.*

## Situation

Once the IK hit its targets ([previous story]({{ '/robotics/humanoid/leg-ik' | relative_url }})), I
put the robot in MuJoCo with gravity and position servos. The thesis gait, with its default 15 mm
hip sway, went over sideways.

![The old gait with 15 mm hip sway, falling]({{ '/assets/images/robotics/humanoid/sim_physics_dhong15.gif' | relative_url }})
*The thesis gait with 15 mm of hip sway, falling over sideways in MuJoCo.*

I own DYNAMIXEL MX-28 and AX-12A servos, so I modelled those per joint: MX-28 at 77 g and
2.5 N·m stall, AX-12A at 54.6 g and 1.5 N·m, a plastic body around 1.3 kg. The masses are guesses.
The first study told me I needed at least eight MX-28 in the legs because the hips peaked at
2.1 N·m. That turned out to be wrong, see below.

## Task

Replace the offline gait with an online walker: a footstep plan gives a ZMP reference, a ZMP
preview controller (Kajita 2003) turns it into a centre-of-mass path, the pelvis is placed so the
whole-body CoM follows it, the C++ IK gives ten joint angles, and the IMU's roll and pitch bend the
stance ankle back upright. 50 ticks a second, same code for MuJoCo and for the real servo bus.
Then try four upgrades (IMU feedback, LIPM preview, the online loop, capture steps) and keep only
what survives the same push test.

## Action

The open-loop LIPM walk fell at 5.1 s even though its ZMP reference looked right. So I logged the
centre of pressure and the load on each foot. At t = 1.2 s one foot carried 128 N. The whole robot
weighs 12.7 N.

The soles were 50 mm wide and their centres 40 mm apart: the two feet overlapped and MuJoCo was
pushing them apart with ten times the robot's weight. I cut the soles to 34 mm and tightened the
contact settings (`cone="elliptic" impratio="10" noslip_iterations="4"`). Same script after:

```
t 1.26 roll -0.9 zmp_ref y -16.0 COP y -16.1 load L 12.6 N R 0.0 N left foot y -20.0
joint p 0 i 0 att 0: fell False nan tilt 1.9 fwd 190.7/195
```

Load equals weight, the CoP sits on the reference, and open loop walks the full distance. That bug
had fed every earlier conclusion, so I re-ran all of them and wrote a correction on the project
page instead of quietly editing. Real peak hip torque: 0.29 N·m, not 2.1. No servo saturates, every
leg layout with MX-28 stays up, and the hip sway works anywhere from −5 to 10 mm, so the default
became 0.

The push test hits the walking robot with a 0.1 s shove in four directions at four different times
and records the largest one it survives (worst case). Later I added the servo torque–speed limit
(MX-28 55 rpm no-load) and a skeleton torso, and re-ran everything again. These are the final numbers:

| Set-up (as walk_stress.py labels it) | +y | −y | +x | −x | Sum, mN·s |
|---|---|---|---|---|---|
| LIPM open loop, 0.8 s single support | 137.5 | 137.5 | 337.5 | 437.5 | 1050 |
| LIPM open loop, 0.5 s single support | 150 | 150 | 375 | 400 | 1075 |
| + IMU attitude | 225 | 225 | 425 | 462.5 | 1337.5 |
| + quick step | 137.5 | 175 | 387.5 | 375 | 1075 |
| + capture-point placement | 162.5 | 162.5 | 350 | 375 | 1050 |

Capture-point foot placement made every test worse. The log shows why: the position servos pull
the body back towards the plan after a push, so the capture-point error swings back past zero within
0.25 s (+22 mm, then −28 mm after a 0.35 N·s forward push). A foot that follows it steps the wrong
way. A deadband and a "never step back" latch reduced the damage but never turned it into a gain.
Both are still in the code, switched off, for the real robot, whose servos are softer than my model.

## Result

In MuJoCo, IMU attitude feedback is the one upgrade that pays: the push margin goes from 1075 to
1338 mN·s (+24 %), and sideways, the direction this narrow-footed robot falls, from 150 to 225 in
each direction. A 0.5 s single-support phase takes the same pushes as 0.8 s and walks 1.6 times
faster.

The servo speed limit is what caps it. Steps up to 40 mm walk (234 to 256 of 260 mm); 50 mm and
longer fall in every set-up because the swing foot would have to move faster than 55 rpm allows.
Before I added the limit, 70 mm walked. That number belonged to the model, not to the servo.
One tick costs about 6 to 10 ms of Python out of the 20 ms budget.

## What I'd do next

The margins move by ±50 to 100 mN·s for small model changes (the skeleton torso alone moved open
loop from 1113 to 1075), so I only compare set-ups measured on the same model. The real numbers
will come from weighing the parts and measuring the servo stiffness on a bench, and from putting an
actual IMU on the robot. Until then the 1338 is a simulation number.

---
layout: default
title: "Arms, a dance and a 2 mm jump"
short_description: "Two 3-joint AX-12A arms, five whole-body motions on the same balance, and servo speed limits that keep the jump honest"
status: "Done"
picture: "assets/images/robotics/humanoid/hum_arms_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-10-21: arms, motions, skeleton torso"
index: 3
publish: true
permalink: /robotics/humanoid/arms-and-motions
board_parent: humanoid
result: "In MuJoCo wave, squat, dance and kick stay up (tilt ≤ 2°); the jump is 0.08 s in the air with the CoM 2.1 mm up"
tags: [robotics, kinematics, simulation, servo]
---

# Arms, a dance and a 2 mm jump

[Back to the humanoid hub]({{ '/robotics/humanoid/' | relative_url }})

![Arms and motions cover: 5 of 5 motions stay up]({{ '/assets/images/robotics/humanoid/hum_arms_cover.jpg' | relative_url }})
*All five motions stay up in MuJoCo; the jump is 0.08 s in the air with the CoM 2.1 mm up.*

![The jump: crouch −45 mm, extend, a short flight]({{ '/assets/images/robotics/humanoid/motion_jump.gif' | relative_url }})

## Situation

The walker from the [previous story]({{ '/robotics/humanoid/walking-mujoco' | relative_url }})
balanced a robot with no arms: the upper body was one box. I wanted to see the robot do something
other than walk (wave, dance, jump). The AX-12A servos I have are meant for the upper body; the
model plans seven of them, three per arm and one for the head.

## Task

Add two arms (shoulder pitch, shoulder roll, elbow) to both MuJoCo and the walker's CoM model
without changing the total mass, add five motions that use the same balance as the walk, and make
the servos physically honest first. Without a speed limit, a simulated jump is fiction.

## Action

The arm geometry and masses live in one file that both MuJoCo and the walker read, so they can't
drift: hand position agrees to 1e-16 m, CoM to under 0.1 mm. Each arm's 137 g came out of the
torso box.

Every servo now stays inside its DC torque–speed line (torque ≤ stall × (1 ∓ ω/ω₀), MX-28 55 rpm,
AX-12A 59 rpm no-load). The motion player is the walker with keyframes: the motion's CoM path
becomes the ZMP reference, and the pelvis is placed so the CoM of legs, arms and torso follows it.

![Dance: 12 beats, ±10 mm sway, arms alternating]({{ '/assets/images/robotics/humanoid/motion_dance.gif' | relative_url }})

Then I redrew the torso as a frame (hip bar, spine, shoulder bar, two braces, board, head servo)
with the same mass and inertia as the box. The first run had no collision body for it and logged
a 180° tilt when the robot fell: the frame went through the floor. An invisible box of the same size
fixed that.

## Result

With the servo speed limit on and IMU feedback on, from `tools/motion_study.py`:

| Motion | Result | Max tilt | Leg peak, N·m (% MX-28 stall) | Arm peak (% AX-12A stall) | In the air |
|---|---|---|---|---|---|
| wave | stays up | 0.3° | 0.18 (7 %) | 0.21 (14 %) | — |
| squat −35 mm ×3 | stays up | 0.2° | 0.43 (17 %) | 0.06 (4 %) | — |
| dance | stays up | 0.6° | 0.30 (12 %) | 0.41 (27 %) | — |
| one-leg kick, 45 mm | stays up | 1.0° | 0.68 (27 %) | 0.07 (4 %) | — |
| jump | stays up | 12.2° | 1.13 (45 %) | 0.45 (30 %) | 0.08 s, CoM +2.1 mm |
| jump, speed limit off | stays up | 25.6° | 2.50 (100 %) | 1.50 (100 %) | 0.10 s, CoM +7.0 mm |

The jump is real but tiny. The limit is the servos' speed, not their torque: switch the
speed limit off and the same jump flies 7.0 mm, but only with every servo pinned at 100 % of stall. Walking with ±0.3 rad arm swing stays up and covers the same
201 mm; at this speed the swing changes nothing I can measure (final yaw −0.16° with, −0.19° without).

A separate script estimates the servo current from the simulated motions: walking draws 2.48 A on average, the jump peaks at
4.95 A (a lower bound), so the real robot needs a 12 V supply of at least 5 A.

## What I'd do next

The pelvis stays vertical, so there's no bow and no torso lean yet (the leg IK targets would need
the pelvis rotation). The arms don't collide with anything, and their sizes and masses are my
proposal, not measured parts. And all of it waits for the first real servo on the bench.

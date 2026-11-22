---
layout: default
title: "Seven MX-28 and where they go"
short_description: "I own fewer strong servos than I thought, so the CAD model decided which joints get them"
status: "Done"
picture: "assets/images/robotics/dino-robot/early_variants.png"
latest_release: "2026-11-20: loads from the CAD model, revision r6"
index: 1
publish: true
permalink: /robotics/dino-robot/servo-budget
board_parent: dino-robot
result: "worst static load: stance knee 0.759 N·m = 30.3 % of MX-28 stall (limit 40 %), robot 2715 g"
tags: [robotics, servo, cad]
---

# Seven MX-28 and where they go
{: .no_toc }

[Back to the Dino robot hub](/robotics/dino-robot/)

1. TOC
{:toc}

## Situation

November 2026. The first frames I drew put an MX-28 on every leg joint: eight of them for hip roll, hip
pitch, knee and ankle, AX-12As only for the neck and jaw. Then I actually counted the box. I have 7 MX-28
and 10 AX-12A, not the other way round. So the frame had to change before any of the shapes mattered.

## Task

Put 13 DYNAMIXEL joints on the robot (hip yaw, hip roll, hip pitch, knee, ankle pitch per leg, plus
neck pitch, head yaw, jaw) with the MX-28s only where the load is heavy. My rule: the static load of
every joint stays under 40 % of its servo's stall torque, so there's headroom left for actually moving.
For the numbers I used the ROBOTIS e-manual: MX-28 stalls at 2.5 N·m and AX-12A at 1.5 N·m, both at 12 V.

## Action

I didn't want to guess masses. A script on the CadQuery model sums the volume of every printed part
(solid PLA, 1.24 g/cm³, so it's an upper bound), adds the servos and the 3S 2200 mAh LiPo from their
datasheets, and finds the centre of mass. Then it stands the robot on its right foot and computes the
holding torque at every joint. I ran it twice, with a Pi 5 plus cooler in the belly bay and with a Pi
Zero, and kept the worse number per joint.

The groups that matter most are the head and the tail. The head sits 144.5 mm in front of the centre
line, the TPU tail 152.8 mm behind, and the tail is what keeps the whole thing from tipping on its
nose.

My first guess was MX-28s on knee, hip pitch and ankle. The table said otherwise: hip roll (0.546 N·m)
was heavier than hip pitch (0.395 N·m) on that early revision. So the MX-28s went to knee, hip roll and
ankle pitch on both legs, and hip pitch got an AX-12A.

The brackets bolt to the MX-28's real flange holes (the side faces have none) and have a Ø2.7 hole with
a hex pocket, so they take both the MX-28T and the tapped MX-28AR/AT. That's on purpose, since I don't
know which revision I own.

## Result

On revision r6 of the design, single support, worst of the two boards:

| Joint | Servo | Load | % of its stall | % if it were an AX-12A |
|---|---|---|---|---|
| stance knee | MX-28 | 0.759 N·m | 30.3 % | 50.6 % |
| stance hip roll | MX-28 | 0.541 N·m | 21.6 % | 36.1 % |
| stance ankle pitch | MX-28 | 0.452 N·m | 18.1 % | 30.2 % |
| stance hip pitch | AX-12A | 0.418 N·m | 27.9 % | 27.9 % |
| neck pitch | AX-12A | 0.236 N·m | 15.7 % | 15.7 % |
| jaw | AX-12A | 0.026 N·m | 1.7 % | 1.7 % |

Every joint is under 40 %. The knee is the one that forced the issue: on an AX-12A it would sit at 50.6 %.
The robot comes out at 2715.4 g with the Pi 5 (2655.1 g with a Pi Zero), and the centre of mass stays
55.8 mm inside the edge of the support polygon. That leaves 1 MX-28 and 3 AX-12A spare.

## What I'd do next

These are holding torques in a still pose. Walking adds inertia and impacts, which is what the
[MuJoCo story](/robotics/dino-robot/walking-in-mujoco) is about. And the 100 % infill makes the printed
mass pessimistic, so I'd like a real scale reading once a leg is printed.

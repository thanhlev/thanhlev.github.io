---
layout: default
title: "An ankle roll servo made it worse"
short_description: "I had three spare AX-12A and a robot that rocks 10° per step; in MuJoCo the extra joint lost to a smarter turn"
status: "Done"
picture: "assets/images/robotics/dino-robot/dino_ankle_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: simulation-only study, CAD unchanged"
index: 4
publish: true
permalink: /robotics/dino-robot/ankle-roll
board_parent: dino-robot
result: "in MuJoCo: with ankle roll 0/30 and 1/30 survive, without it 16/30, pair turn without new servos 28/30"
tags: [robotics, servo, simulation]
description: "I had three spare AX-12A and a robot that rocks 10° per step; in MuJoCo the extra joint lost to a smarter turn"
date: 2026-11-22
last_modified_at: 2026-11-23
---

# An ankle roll servo made it worse
{: .no_toc }

[Back to the Dino robot hub](/robotics/dino-robot/)

![Ankle roll cover: 0 of 30 robots finish with the roll]({{ '/assets/images/robotics/dino-robot/dino_ankle_cover.jpg' | relative_url }})
*With the ankle roll 0 of 30 robots finish; the pair turn, with no new servo, gets 28 of 30.*

1. TOC
{:toc}

## Situation

The walk in MuJoCo rocks about 10° sideways every step, and the robot can't stand on one leg at all.
Without an ankle roll, with both soles flat, the centre of mass moves at most 5.93 mm sideways, while the
inner edge of the sole is 21.5 mm from the midline. By the numbers it would need an ankle roll of at
least 9.3°. And I had 3 AX-12A doing nothing.

Adding a joint felt like the obvious fix. It also means a new CAD revision, a taller leg and a boxy lump
at the ankle of a design I already liked.

## Task

Find out in simulation, before touching the CAD, whether an ankle roll per leg actually helps the full
sequence (walk 1 m, turn 90°, look, roar) on 30 perturbed robots.

## Action

In the model the AX-12A hangs under the ankle-pitch MX-28 in a printed U-bracket, horn pointing forward,
and the foot bolts to its horn. That puts the foot 40 mm lower and adds 139.6 g. I tried two controller
versions: one where the IK uses the roll, one where the IK keeps it locked and only the balance feedback
moves it. Same 30 seeds as the robot without it.

While that ran I also tried a fix with no new hardware: the pair turn (6° per two steps, 0.8 s on both
feet in between).

![Per-seed outcome for the four variants and the pair turn under different model settings](/assets/images/robotics/dino-robot/ankle_roll_vs_pair_turn.png)
*MuJoCo, 30 seeds. Top: one box per robot, green = finished, red = the phase it fell in. Bottom: the pair turn (orange) against the old turn (blue) when I change friction or the torque-limit model.*

## Result

| Robot | Full sequence survived |
|---|---|
| no ankle roll, old turn | 16 / 30 |
| ankle roll, used by the IK | 0 / 30 |
| ankle roll, locked in the IK, feedback only | 1 / 30 |
| no ankle roll, pair turn | 28 / 30 |

The ankle roll made it worse, and it fell while walking, not turning. Two reasons showed up. The 40 mm
taller leg alone breaks the walk: with the roll locked, 0 of 6 walk at a 40 mm drop against 4 of 6 at
0 mm. And a free roll on the soft AX-12A lets the stance leg lean out until hip roll stops at 9.9°,
ankle roll at 16.6°, and the centre of mass leaves the sole.

So the CAD stays as it is and the pair turn became the default (see the
[MuJoCo story](/robotics/dino-robot/walking-in-mujoco)). Still no one-leg stand: the free foot comes off
the ground for 0.02 s at most.

## What I'd do next

If I ever draw an ankle roll, the servo has to sink into the foot so the leg grows by 10 mm at most,
because the drop is what kills the walk. A stiffer servo there would help too, but I don't own one.

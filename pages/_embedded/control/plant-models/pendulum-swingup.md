---
layout: default
title: "Cart-pole swing-up: energy pump, then a hand-over to LQR"
short_description: "Why one controller isn't enough, and the catch condition people forget (the rate, not the angle)"
status: "Done"
picture: "assets/images/control/plant-models/pendulum_swingup_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 1
publish: true
permalink: /embedded/control/plant-models/pendulum-swingup
board_parent: plant-models
result: "Upright 1.98 s after release, settled to 0.000 rad / 0.000 m, peak force 4.63 N of 12 N, zero rail hits; LQR alone never gets closer than 2.77 rad"
tags: [control, simulation, robotics, cpp]
---

# Cart-pole swing-up: energy pump, then a hand-over to LQR

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "Swing-up, then LQR": 1.98 s to upright, one mode switch]({{ '/assets/images/control/plant-models/pendulum_swingup_cover.jpg' | relative_url }})
*The result first: upright 1.98 s after release with 4.63 N of the 12 N belt; LQR alone never gets closer than 2.77 rad.*

![Pole angle: pumping from hanging, the hand-over at 1.98 s, then LQR holds it]({{ '/assets/images/control/plant-models/swingup_angle.png' | relative_url }})

## Situation

The classic teaching rig: a cart on a 1.2 m rail, belt-driven with a 12 N force limit, a 0.6 m pole on a
free bearing. Balancing it upright with an LQR is the easy demo. Getting it up there from hanging is the one
I actually wanted, because the same structure (a nonlinear law to reach the region where a linear law works,
then a switch) shows up in a lot of real machines.

## Task

Start hanging, end upright and centred, without ever hitting the rail end-stops or exceeding the belt. And
show what happens if you skip the swing-up and just turn on the LQR.

## Action

The pump regulates one number, the pole's energy, defined as zero upright and still (−1.18 J hanging). It's
bang-bang on sign(ω·cos θ), limited to an acceleration far below what the belt can do: at full authority the
cart would travel metres before the pole was up, and the track is 1.2 m.

The balancer is a discrete LQR on the four-state linearisation about upright (cart position, cart velocity,
angle, rate). Q = diag(25, 5, 60, 2), R = 0.05. The cart-position weight is the one that matters: with it near
zero the pole balances beautifully while the cart drifts off the end of the rail.

The hand-over condition is |θ| < 0.20 rad *and* |ω| < 1.1 rad/s. The rate part is easy to forget. A pole sweeping
through upright at 5 rad/s is momentarily at zero angle, and catching it there hands the LQR angular momentum
that no bounded cart force can absorb in a few degrees. The cart then chases the pole into the end stop.

```
$ ./build/products/pendulum_swingup
  gain on pole angle                             -91.8068 N/rad
  time to first catch                              1.9800 s        ok
  mode switches                                         1
  peak cart excursion                              0.5130 m
  peak force actually applied                      4.6270 N
  final |angle|                                    0.0000 rad      ok
  rail end-stop hits                               0.0000          ok
  closest the pole ever came to upright            2.7742 rad
```

![The same LQR started from hanging: it pushes confidently the wrong way]({{ '/assets/images/control/plant-models/swingup_lqr_alone.png' | relative_url }})

That last line is the LQR alone from hanging. At θ = π the linearised model thinks gravity restores rather
than topples, the feedback sign is effectively inverted, and the controller pushes the pole away from upright
for the whole run.

## Result

Swing-up reaches the catch window 1.98 s after release with one mode switch, settles to 0.000 rad and 0.000 m by
3.96 s, uses 4.63 N of the 12 N belt and never touches the rail ends (peak excursion 0.51 m). The LQR alone never
gets closer than 2.77 rad to upright. Same in the float build.

## What I'd do next

Run it with the `act` backlash and encoder quantisation switched on. A real belt has both, and I suspect the
catch window needs to shrink.

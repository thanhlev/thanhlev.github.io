---
layout: default
title: "Cruise control on a hill, and an ABS that can't be a PID"
short_description: "Where the speed loss on a 4 % grade actually goes, and a brake plant whose gain flips sign at the friction peak"
status: "Done"
picture: "assets/images/control/plant-models/cruise_and_abs_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 3
publish: true
permalink: /embedded/control/plant-models/cruise-and-abs
board_parent: plant-models
result: "Speed loss on a 4 % grade 11.99 -> 0.18 km/h; stopping from 90 km/h 41.3 m locked vs 27.5 m with slip control, +35 % wet, +18 % snow"
tags: [control, simulation, cpp]
---

# Cruise control on a hill, and an ABS that can't be a PID

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "Cruise control and ABS": 27.5 m (locked 41.3), an ABS can't be a PID]({{ '/assets/images/control/plant-models/cruise_and_abs_cover.jpg' | relative_url }})
*Slip control stops from 90 km/h in 27.5 m instead of 41.3 m locked, and cruise control loses only 0.18 km/h on a 4 % grade.*

![Speed against the 100 km/h target over the hills: P, PI, PI + grade feedforward, electric drivetrain]({{ '/assets/images/control/plant-models/ev_speed.png' | relative_url }})
*Speed against the 100 km/h target over the hills for P, PI, PI with grade feedforward and the electric drivetrain; on a 4 % grade the loss drops from 11.99 to 0.18 km/h.*

## Situation

Two car demos, because the two plants are opposites. A car's longitudinal dynamics are about as easy as
control gets: one state, a mild quadratic drag. What makes cruise control interesting is the hill. Braking is
the other way round: the plant itself is nasty, because tyre friction rises with slip to a peak at 10 to 20 % and
then falls.

## Task

Cruise: a 1600 kg car at 100 km/h over a road with 4 % grades, four controllers on the same profile: P, PI, PI
plus a feedforward of the measured grade, and the same controller with an electric drivetrain (30 ms torque lag
instead of 200 ms). ABS: stop from 90 km/h on dry asphalt with the wheel locked, a PID on slip, rule-based valve
modulation, and super-twisting sliding mode; then repeat on wet asphalt and snow without changing the setpoint.

## Action

The grade force is the whole problem. 627 N for 4 % is more than the aerodynamic drag at 100 km/h (323 N):

```
  force from a 4% grade                          627.1241 N
  P only: worst sag                               11.9873 km/h
  PI: worst sag                                    3.2263 km/h
  PI + feedforward: worst sag                      0.2040 km/h
  electric + feedforward: worst sag                0.1775 km/h
```

Nothing about the controller changed between the last two rows, only the actuator's time constant. With the
feedforward, most of the remaining gap is the drivetrain, not the software.

For ABS the peak slip moves from 17 % on dry asphalt to 6 % on snow, and a locked wheel gives up a third of the
grip:

```
  dry asphalt    peak slip  17.0%   mu at peak 1.170   mu locked 0.760   loss 35.0%
  snow           peak slip   6.0%   mu at peak 0.190   mu locked 0.130   loss 31.6%
```

![Stopping from 90 km/h: locked wheel vs slip control]({{ '/assets/images/control/plant-models/abs_speed.png' | relative_url }})
*Stopping from 90 km/h: 41.3 m with the wheel locked, 27.5 m with slip control.*

The PID run is the control case, and I gave it an unfair advantage: the exact peak slip for this surface,
which no real ABS knows. It stops in 27.6 m, but it sits right on the boundary where its own feedback sign
changes: above the peak, more pressure means less deceleration, and an integrator on that plant integrates the
wrong way. The sliding-mode controller doesn't care about that sign, and needs no valve chatter (0 modulations
vs 601 for the rule-based one).

```
  dry asphalt    sliding mode   27.5 m   locked   41.3 m   improvement  33.4%
  wet asphalt    sliding mode   40.3 m   locked   61.9 m   improvement  35.0%
  snow           sliding mode  170.4 m   locked  208.0 m   improvement  18.1%
```

## Result

On the 4 % grade, the worst speed loss drops from 11.99 km/h (P) to 3.23 (PI) to 0.20 (grade feedforward) to 0.18 km/h
(electric drivetrain), and integrated error from 1691 to 1.59 km/h·s. Slip control stops from 90 km/h in 27.5 m instead
of 41.3 m locked, and with the setpoint fixed at the dry-asphalt peak it still gains 35 % on wet and 18 % on snow
without locking a wheel.

## What I'd do next

The snow number is where estimating the surface would pay: the setpoint is 11 points of slip off the snow peak.
A friction-peak estimator on top of the sliding mode is the obvious next run.

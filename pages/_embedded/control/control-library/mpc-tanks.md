---
layout: default
title: "MPC on two tanks: closer to the overflow than a PI dares"
short_description: "A 7 kB constrained MPC against two tuned PIs on a two-tank rig where the pump can't run backwards and the tank overflows for real"
status: "Done"
picture: "assets/images/control/control-library/mpc_level_one.png"
latest_release: "2026-11-22: re-run in double and float"
index: 4
publish: true
permalink: /embedded/control/control-library/mpc-tanks
board_parent: control-library
result: "Integrated error 14.4 m·s with MPC vs 54.8 and 58.9 for the two PIs; tank one peaks at 0.458 m of 0.50, 19 ADMM iterations worst case"
tags: [control, simulation, cpp]
---

# MPC on two tanks: closer to the overflow than a PI dares

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![Tank one: MPC fills it further than either PI and still stops short of the overflow line]({{ '/assets/images/control/control-library/mpc_level_one.png' | relative_url }})

## Situation

I kept reading that MPC is "for constraints", and kept answering every constraint with a clamp and an
anti-windup. I wanted one plant where that answer is measurably worse. Two tanks in series do it: a pump
fills tank one, tank one drains into tank two, both drain by gravity. The pump can't run backwards, and
tank one overflows at 0.50 m. Tank two (the level I care about) can only be reached through tank one.

## Task

Control tank two's level through a setpoint step with a gentle PI, an aggressive PI and the library's
constrained MPC (`ctl/mpc.h`, ADMM solver), and compare integrated error, how close tank one gets to the
top, and whether the solver fits a real-time budget.

## Action

The plant itself is a warning: it gets slower as it fills, because outflow goes with √h.

```
  time constant at 0.05 m                         31.1021 s
  time constant at 0.40 m                         87.9702 s
```

A loop tuned empty is too aggressive when full. Both PIs end up limited by fear: push the gains and the only
thing between you and an overflow is that nobody asked for a high enough setpoint. The aggressive PI is
actually *worse* on integrated error than the gentle one (58.9 vs 54.8 m·s).

The MPC knows the 0.50 m line because it's in the plan. One trap I fell into writing it: the pump bound
[0, 1] is in absolute units, but the MPC works in deviations around the operating point, and a [0, 1] bound
on a deviation forbids it from ever reducing the flow. Shifting the constraints into the same coordinates fixed it.

With one linearisation for the whole run, a small offset stays at the top of the range (a linear MPC has no
integral action, and the model's outflow at 0.34 m isn't quite the real one):

```
MPC, one linearisation for the whole run
  integrated absolute error                       16.3039 m s
  steady-state error                              -0.8487 mm
  worst-case ADMM iterations                           19
```

Relinearising when the setpoint moves (two Riccati solves, once) removes it:

```
MPC, relinearised when the setpoint moves
  integrated absolute error                       14.3877 m s
  peak level in tank one                           0.4584 m
  steady-state error                              -0.0000 mm
  model rebuilds                                        1
```

## Result

The MPC accumulates 14.4 m·s of integrated error against 54.8 (gentle PI) and 58.9 (aggressive PI). It gets
there by driving tank one to 0.458 m, much closer to the 0.50 m overflow than either PI dares (0.392 and 0.410),
because it knows where the top is. The controller is 7.0 kB and never needs more than 19 ADMM iterations
per sample.

## What I'd do next

19 iterations in double on a PC tells me nothing about cycle time on an MCU. Timing the float build on a
Cortex-M4 board I own is the obvious next measurement.

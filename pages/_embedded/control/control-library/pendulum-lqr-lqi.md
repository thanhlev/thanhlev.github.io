---
layout: default
title: "Five controllers on one pendulum, and the LQR that parks 0.36 rad off"
short_description: "Old adaptive law, PID, bounded adaptive PID, LQR and LQI against a constant torque the model doesn't know about"
status: "Done"
picture: "assets/images/control/control-library/pendulum_lqr_lqi_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run; the demo's own text says 0.22 rad, the run says 0.36"
index: 2
publish: true
permalink: /embedded/control/control-library/pendulum-lqr-lqi
board_parent: control-library
result: "LQR holds the pole with 8.7 N but sits 0.36 rad off under a 3 N torque; LQI brings it to 0.0008 rad with 6.1 N"
tags: [control, simulation, cpp]
---

# Five controllers on one pendulum, and the LQR that parks 0.36 rad off

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![The result first]({{ '/assets/images/control/control-library/pendulum_lqr_lqi_cover.jpg' | relative_url }})
*The result first: under the same 3 N torque LQR parks 0.36 rad off, LQI ends at 0.0008 rad with 6.1 N.*

![Angle after a constant 3 N torque at t = 1 s: PID, LQR, LQI]({{ '/assets/images/control/control-library/pendulum_lqr_lqi.png' | relative_url }})

## Situation

My old code base had an "adaptive PID" that updated its gains with `kp += rate * error * error` and
friends. No bound, no leak, no output limit. It balanced the demo pendulum, so nobody questioned it. When I
rewrote the library I wanted to know what it was actually worth next to a plain PID and next to the
textbook answer for an unstable plant, LQR.

## Task

One inverted pendulum (m = 1 kg, l = 1 m, starting 0.10 rad off vertical, 1 ms fixed step, force limited
to ±50 N) and a constant 3 N torque that none of the controllers model, switched on at t = 1 s. Five
controllers, 10 s each, scored by the integral of |angle| and by the peak force.

## Action

The old law is kept in the demo as-is so it can fail in public. The new `ctl::AdaptivePid` is bounded,
normalised, leaky and frozen while the actuator saturates. The LQR is designed on the linearised model
(`solveDlqr`, Q = diag(100, 1), R = 1); the LQI adds the angle integral as a third state with a weight of 500.

```
  1. legacy adaptive law       final  -0.0317 rad   cost   0.3460 rad*s   peak |F|   110.00 N
  2. fixed-gain PID            final  -0.0009 rad   cost   0.0947 rad*s   peak |F|    12.00 N
  3. ctl::AdaptivePid          final  -0.0009 rad   cost   0.0941 rad*s   peak |F|    12.01 N
  4. LQR on the linearised model final  -0.3593 rad   cost   3.1063 rad*s   peak |F|     8.67 N
  5. LQI (LQR + angle integral) final  -0.0008 rad   cost   0.2038 rad*s   peak |F|     6.12 N
```

Row 1 asks for 110 N from a 50 N actuator, because nothing ever told it there was a limit. The bounded
adaptive PID ends up where the fixed PID is and its gains come back to nominal (Kp = 120, Ki = 40, Kd = 12),
which is what the leak is for.

Row 4 is the one I like. `u = -Kx` is optimal and gentle, but it has no integral action, so a constant
torque just parks the pole off vertical and it stays there. No choice of Q or R fixes that. Making the
integral part of the state (LQI) does, with less force than any PID row.

One embarrassing detail: the demo prints a paragraph under the table, and that paragraph says the LQR
parks "0.22 rad" off vertical. The number is a hard-coded `0.218` in a `printf`, not the value the run
computes (I don't know any more where 0.218 came from). The measured row right above it says 0.3593. The asserted numbers are right; the
prose wasn't asserted. The plot above comes from a copy of the demo with one CSV line added, built in `/tmp`.

## Result

Under the same 3 N unmodelled torque, LQR settles 0.36 rad off vertical (peak force 8.67 N), while LQI ends
at 0.0008 rad with a peak of 6.12 N. The old adaptive law commands 110 N against a 50 N limit and costs 3.7×
what the plain PID does. Same table in the float build.

## What I'd do next

Replace that hard-coded 0.218 with the value the run computes, and turn the commentary into assertions
like the rest. Then the identification story: an LQR is only as good as its model, and the model on this
page was handed to it (see [RLS identification]({{ '/embedded/control/control-library/rls-identification' | relative_url }})).

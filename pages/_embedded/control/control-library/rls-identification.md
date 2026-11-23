---
layout: default
title: "RLS: finding the inertia the datasheet doesn't know"
short_description: "Recursive least squares on a servo axis (physics) and on an unstable cart-pole in closed loop (state-space), and the two ways it lies"
status: "Done"
picture: "assets/images/control/control-library/rls_identification_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: both demos re-run in double and float"
index: 3
publish: true
permalink: /embedded/control/control-library/rls-identification
board_parent: control-library
result: "Servo J to 5.3 % from 12 s of normal motion (datasheet was 10x off); cart-pole Ad to 0.024 %, LQR gain within 0.6 % of the true design"
tags: [control, simulation, motor, cpp]
---

# RLS: finding the inertia the datasheet doesn't know

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![The result first]({{ '/assets/images/control/control-library/rls_identification_cover.jpg' | relative_url }})
*The result first: RLS finds the servo inertia to 5.3 % from 12 s of ordinary motion, where the datasheet was 10× off.*

![The inertia estimate leaving the datasheet value behind in about two seconds]({{ '/assets/images/control/control-library/rls_motor_inertia.png' | relative_url }})

## Situation

Everything model-based in the library (LQR, MPC, computed torque, feedforward) wants a model, and the model
I have is usually the motor's datasheet. The datasheet knows the rotor. It has never met the coupling,
the gearbox or whatever got bolted on the far side. On the pendulum page the LQR got the true model for
free; on a real rig it won't.

## Task

Use `ctl::RecursiveLeastSquares` twice. First on a servo axis, fitting the physics directly:
J·ω' + b·ω + τc·sign(ω) + τL = Kt·i, four unknowns. Second on a cart-pole that falls over if you leave it
alone, so it has to be identified in closed loop: four RLS instances of five parameters, one per row of
x(k+1) = Ad·x(k) + Bd·u(k). Then design an LQR from what was identified and compare with the design that
knew the truth.

## Action

Servo: the true inertia is 200e-6 kg·m², the "drawing" says 20e-6. Twelve seconds of ramped speed commands,
no spin-down test, no dynamometer:

```
  identified J                                   189.4276 1e-6 kg m^2
  identified Coulomb friction                      3.5945 mNm
  identified constant load                         2.0737 mNm
  error in J                                       5.2862 %        ok
  error in the constant load                       3.6865 %        ok
```

Friction and load are only separable because the axis reverses: friction flips sign with direction, the
load doesn't. Run the same experiment in one direction only and RLS still answers, confidently:

```
  identified Coulomb, one direction             -125.3380 mNm
  identified load, one direction                 130.4009 mNm
  each of them separately is not                3233.4512 %        ok
```

Their sum is right to 16 %, each one alone is out by 3200 %, and a negative friction is physically
impossible. The residual barely moves in these cases (18.55 vs 18.78 mNm in the filter-mismatch run), so a
sign check on the physical parameters catches what the fit error doesn't.

Cart-pole: a rough LQR designed from a drawing 25 % wrong keeps it upright (pole-angle gain −93.5 N/rad), and
a dither on top of its command gives RLS something to look at. Without the dither, u = −Kx is an exact linear
function of the state, the regressor is singular, and the fit is garbage that the estimator happily returns:

```
  worst error in Ad, as % of its largest entry       0.0241 %
  gain on pole angle, from the fit               -81.5214 N/rad
  gain on pole angle, from the truth             -81.9910 N/rad
  worst error in Ad, no dither                   336.0524 %
  and the design from it does NOT stabilise the true model          yes          ok
```

## Result

On the servo, RLS recovers J to 5.3 %, Coulomb friction to 10 % and the load to 3.7 % from 11 330 samples of
ordinary motion, and the identified model in a feedforward cuts tracking error about 20× with the same
feedback gains. On the cart-pole, Ad comes back to 0.024 % and Bd to 0.0055 % of scale, and the LQR from the
fit lands within 0.6 % of the true design. Both identifiability failures are measured, not just described:
one-way motion (3200 % on the split) and no dither (336 %, unstable design).

![Feedforward from the drawing, from the identified model and from the truth]({{ '/assets/images/control/control-library/rls_motor_tracking.png' | relative_url }})

## What I'd do next

The forgetting factor is fixed. A real axis warms up and the load changes slowly, so I want to try a
directional forgetting variant and see how it behaves when the excitation dies for a minute.

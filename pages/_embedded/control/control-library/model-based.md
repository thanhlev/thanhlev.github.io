---
layout: default
title: "Computed torque, MRAC, Smith predictor: right, wrong or missing model"
short_description: "Three laws that lean on a model, each run with the true model, a wrong one and none: a one-link arm, a first-order plant that isn't what I seeded, and a 0.5 s dead time"
status: "Done"
picture: "assets/images/control/control-library/model_based_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-23: first write-up, measured in double and float"
index: 6
publish: true
permalink: /embedded/control/control-library/model-based
board_parent: control-library
result: "Computed torque 0.14 % overshoot from both poses (9.5 % and 1.5 % without gravity); MRAC model error 0.245 -> 0.0011; Smith predictor turns a 6.81 swing into a settled loop while its delay is 0.45-0.60 s of the true 0.50"
tags: [control, simulation, cpp]
---

# Computed torque, MRAC, Smith predictor: right, wrong or missing model

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![The result first]({{ '/assets/images/control/control-library/model_based_cover.jpg' | relative_url }})
*The result first: with the exact model, computed torque gives 0.14 % overshoot from 0.2 rad and from 1.4 rad alike. In simulation.*

![Normalised arm angle for three models and two starting angles]({{ '/assets/images/control/control-library/adv_computed_torque.png' | relative_url }})
*Blue, exact model: both starts on one curve. Red, no gravity in the model: two different shapes, and 0.019 rad of sag at the end.*

## Situation

The [robust story]({{ '/embedded/control/control-library/robust-control' | relative_url }}) was about laws
that cope without a model. The opposite camp in the library uses one on purpose: computed torque cancels
the arm's dynamics, MRAC learns the model while it runs, the Smith predictor simulates the plant to see
past a dead time. Their unit tests all pass, but a pass only says the claim holds with the model the test
handed in. What I care about on a real rig is the other case, because my model will be off.

## Task

Three experiments, each with the true model, a wrong one and none. A one-link arm (inertia 0.4 kg·m²,
gravity torque 3·cos q N·m) regulated to zero by `ctl::ComputedTorque` at 20 rad/s and ζ = 0.9, from
0.2 rad and from 1.4 rad, where gravity's share differs a lot. A first-order plant y' = -0.7y + 1.1u
under `ctl::FirstOrderMrac`, seeded for a = 1, b = 1, with adaptation on and off. And
`ctl::SmithPredictor` on a 1 s lag behind a 0.50 s dead time, with a PI gain of 6 that makes the loop
oscillate without it, sweeping the delay the predictor believes in from 0.10 to 1.00 s.

## Action

The runs live in the same measurement demo as the robust story, `controller_traces`; the setups are the
ones from the unit tests, which I copied and then varied. Built in double and float, same numbers.

Computed torque first:

```
no gravity model, from 0.2 rad: overshoot  9.53%, peak at 0.3626 s, final -0.01875 rad
no gravity model, from 1.4 rad: overshoot  1.48%, peak at 0.3658 s, final -0.01875 rad
exact model     , from 0.2 rad: overshoot  0.14%, peak at 0.3624 s, final -0.00000 rad
exact model     , from 1.4 rad: overshoot  0.14%, peak at 0.3624 s, final -0.00000 rad
model 25% low   , from 0.2 rad: overshoot  5.16%, peak at 0.2898 s, final -0.00625 rad
model 25% low   , from 1.4 rad: overshoot  2.42%, peak at 0.2904 s, final -0.00625 rad
```

With the exact model the arm behaves like the second-order system I asked for, 0.14 % overshoot, the
same from both angles. That's the whole promise of feedback linearisation, and it holds. Without gravity
in the model it's a PD scaled by the inertia: the shape depends on where it starts (9.5 % against
1.5 %) and it sags 0.019 rad at the end, which is 3 N·m over 0.4 × 20². With inertia and gravity both
25 % low, the sag drops to a third of that, 0.006 rad, but the shape depends on the pose again and the
peak comes 70 ms earlier. A wrong model doesn't break computed torque, it quietly turns it back into
the PD it replaced, in proportion to how wrong the model is.

MRAC is the version that fixes its own model. Frozen at my nominal seed (gamma 0), the plant drifts up to
0.245 away from the reference model it's supposed to copy. Adapting at gamma 8, the distance is 0.0068 at
worst between 5 and 15 s and 0.0011 after 150 s, and both gains end within 0.5 % of the values the true
plant needs (1.8245 and 1.1867 against 1.8182 and 1.1818). The reference here is two sines, chosen so the
adaptation always has something to learn from; with a constant setpoint the gains would have nothing to
converge on, and I didn't run that case.

![Distance between plant and reference model, fixed vs adaptive]({{ '/assets/images/control/control-library/adv_mrac_error.png' | relative_url }})
*Red, gains frozen at my guess: around 0.2 forever. Blue, adapting: under 0.01 within 15 s, about 0.001 from there on.*

The Smith predictor was the one I expected to be fragile. Without it the PI at gain 6 swings 6.81 peak
to peak and never settles. With an exact model the swing is 0.00002. Then I lied to it about the delay:

```
0.10 s: overshoot  272.9%, swing 5.6728
0.30 s: overshoot   27.4%, swing 0.0000
0.40 s: overshoot    9.8%, swing 0.0000
0.45 s: overshoot    0.1%, swing 0.0000
0.60 s: overshoot   -0.0%, swing 0.0000
0.70 s: overshoot    8.1%, swing 0.0000
0.80 s: overshoot  168.2%, swing 3.4820
```

It's lopsided. Believing a delay 20 % too long (0.60 s) costs nothing visible, 20 % too short (0.40 s)
costs 9.8 % overshoot. Too short degrades slowly and still settles at 0.20 s; too long works fine up to a
point and then falls off: settled with 8.1 % at 0.70 s, limit cycle at 0.80 s. So if I'm unsure, I'd
rather guess a little long, but not much.

![Overshoot over the delay the predictor believes in]({{ '/assets/images/control/control-library/adv_smith_delay_sweep.png' | relative_url }})
*True dead time 0.50 s. Blue settles cleanly (0.45 to 0.60 s), orange settles with overshoot, red never settles.*

## Result

With the exact model, computed torque gives 0.14 % overshoot from both starting angles; without gravity
in its model it's 9.5 % and 1.5 % with 0.019 rad of sag, and a model 25 % low lands in between
(0.006 rad). MRAC takes a plant that sits 0.245 away from its reference model to 0.0011, its gains within
0.5 % of the true values. The Smith predictor turns a loop that swings 6.81 into one that settles, and
keeps it settled within 0.15 % overshoot for a believed delay of 0.45 to 0.60 s of the true 0.50; it
limit-cycles again at 0.10 s and from 0.80 s. Same numbers in the float build. All in simulation.

## What I'd do next

Combine the last two: a Smith predictor whose delay is identified online, the way the
[RLS story]({{ '/embedded/control/control-library/rls-identification' | relative_url }}) identifies inertia.
And run computed torque on the two-link arm from the plant library, where the Coriolis term is no
longer zero and a wrong inertia matrix couples the joints.

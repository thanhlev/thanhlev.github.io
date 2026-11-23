---
layout: default
title: "Plant models and fourteen small products"
short_description: "My act library of plants with the ugly parts switchable (backlash, stiction, delay, heat), and product-sized demos that drive them"
status: "In Progress"
picture: "assets/images/control/plant-models/cnc_following_error.png"
latest_release: "2026-11-22: hub page, six STAR write-ups, all 14 demos re-run in double and float"
index: 32
publish: true
permalink: /embedded/control/plant-models/
notes_hub: true
tags: [simulation, control, motor, cpp, testing]
---

# Plant models and fourteen small products

![CNC axis following error: S-curve only, plus a notch, plus feedforward]({{ '/assets/images/control/plant-models/cnc_following_error.png' | relative_url }})

The [control library]({{ '/embedded/control/control-library/' | relative_url }}) only does maths, so it needs
something to push against. When a demo writes its own plant it writes the flattering one: a clean first-order
lag with no saturation, no friction, no delay, where any controller looks good. So the plants got their own
library, `act`: DC and stepper motors, valves, heaters, converters, a cart-pole, a two-link arm, a vehicle, a
piezo stack, a PV panel, a battery cell. Header-only, SI units, RK4 where the dynamics need it. The parts that
break controllers on real hardware are explicit switches: actuator limits, gearbox backlash, stiction, encoder
quantisation, a sample of ADC delay, thermal derating.

On top of the two libraries I wrote fourteen demos, each shaped like a product instead of a plot: a CNC axis,
a 3D-printer hotend, cruise control, ABS, a battery charger, MPPT, a grid-tie inverter, a piezo nanopositioner,
a drone rate loop, a robot arm, a two-tank rig, a cart-pole swing-up, and two identification demos. Each one
asserts its own headline numbers and exits non-zero if the physics changed, so the folder doubles as a
regression test.

```
$ cmake -S demos/actuator-controller -B build/products && cmake --build build/products -j
$ cmake -S demos/actuator-controller -B build/products_f -DCMAKE_CXX_FLAGS=-DCTL_REAL_FLOAT
```

On 2026-11-22 all fourteen printed `all expectations met` in both builds. The tank rig and the two
identification demos are written up on the control library hub; the rest that I found worth a story are below.

## The stories

{% include board_children.html board="plant-models" %}

## Still open

All simulation. The models are as honest as I could make them, but a model's resonance or friction is still a
number I typed in. The drone rate loop and the two-link arm ran fine and have numbers (37 ms rise with no
integrator; an unknown 1 kg payload still adds 26 mrad of sag under computed torque, 38.5 under plain PD), but I haven't written them up.

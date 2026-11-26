---
layout: default
title: "Power loops: a charger with no state machine, MPPT, and an inverter's sine"
short_description: "CC-CV as the minimum of two loops, perturb-and-observe on a panel that heats up, and resonant vs repetitive control on a grid-tie inverter"
status: "Done"
picture: "assets/images/control/plant-models/power_loops_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 6
publish: true
permalink: /embedded/control/plant-models/power-loops
board_parent: plant-models
result: "Charger 99.5 % full vs 90.0 % with a state machine; MPPT 92.7 % -> 99.97 % of available energy; inverter RMS error 0.225 -> 0.067 A, THD 0.085 %"
tags: [control, simulation, cpp]
---

# Power loops: a charger with no state machine, MPPT, and an inverter's sine

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "Three power loops": 99.5 % full, vs 90.0, a charger with no states]({{ '/assets/images/control/plant-models/power_loops_cover.jpg' | relative_url }})
*The result first: the two-loop charger ends 99.5 % full against 90.0 % for the state machine; MPPT harvests 99.97 %.*

![Charge current: the CC-CV state machine vs the minimum of two loops]({{ '/assets/images/control/plant-models/charger_current.png' | relative_url }})

## Situation

Three power-electronics loops I'd only ever seen as application notes. Each one has a trick the app note
states and doesn't prove: a CC-CV charger doesn't need a state machine, MPPT is a maximum to find and not a
setpoint to hold, and a PI can't follow a sine. I wanted the numbers.

## Task

Charger: a 2.5 Ah lithium cell (35 mΩ, an RC branch with τ = 22.5 s), 1C charge to 4.2 V. Compare an explicit CC-CV
state machine with two loops (current and voltage) always running, output = the minimum. MPPT: a 60-cell panel whose
peak moves with irradiance and temperature, fixed voltage vs 76 % of Voc vs perturb-and-observe. Inverter: a 50 Hz grid
with 1 % 3rd and 2 % 5th harmonic, 5 mH filter, 20 kHz loop, inject a clean sine of current.

## Action

The state machine switches to CV on the terminal voltage. It doesn't hunt on these cell parameters, but it ends at
90 % and steps the current command by the full 2.5 A in one sample at the switch, a transient the converter and the
cell have to absorb:

```
1: explicit CC-CV state machine, switching on terminal voltage
  final state of charge                           90.0028 %
  worst single-sample jump in the current command       2.5000 A
2: both loops always running, output is the minimum
  final state of charge                           99.4895 %
  worst overvoltage                                1.0835 mV
  worst single-sample jump in the current command       0.0439 A
```

The minimum-of-two version takes longer (63 vs 45 minutes) because it actually fills the cell, and the handover is
continuous by construction: no states, no hysteresis.

MPPT, over a run where irradiance and temperature change (a cloud, then a hot afternoon). The optimum is 31.8 V
at 1000 W/m² and 25 °C but 28.4 V at 950 W/m² and 55 °C, so there is no setpoint to hold:

```
  fixed voltage                                   92.7237 %
  constant-voltage heuristic                      94.6641 %
  perturb and observe, coarse                     99.9576 %
4: perturb and observe, 50 mV steps
  tracking efficiency                             99.9719 %
  steady-state voltage dither                      0.1000 V
```

Inverter: a PI alone, no feedforward, misses the fundamental amplitude by 56 % (an integrator has infinite gain only at
DC). Adding a resonant term at 50 Hz fixes the fundamental, and a repetitive controller (one whole grid period of memory)
also chases the harmonics:

```
1: PI plus grid-voltage feedforward
  RMS tracking error                               0.2252 A
2: PI + resonant term, with feedforward
  RMS tracking error                               0.1252 A
3: PI + repetitive controller, with feedforward
  RMS tracking error                               0.0666 A
  total harmonic distortion                        0.0845 %
```

## Result

The two-loop charger ends at 99.5 % state of charge against the state machine's 90.0 %, never more than 1.1 mV over
the limit, with no command step (0.04 A vs 2.5 A). Perturb-and-observe with 50 mV steps harvests 99.97 % of the
available energy against 92.7 % for a fixed voltage. On the grid-tie inverter, RMS current error falls 0.225 → 0.125 →
0.067 A and distortion sits at 0.085 % against a 5 % limit. All the same in the float build.

![Power harvested against power available as the panel heats up]({{ '/assets/images/control/plant-models/mppt_power.png' | relative_url }})

## What I'd do next

The MPPT panel here has one peak. Partial shading gives a P-V curve with several local maxima, and perturb-and-observe
happily climbs the wrong one. That's the case worth simulating.

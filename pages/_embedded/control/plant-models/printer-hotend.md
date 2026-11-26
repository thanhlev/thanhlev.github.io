---
layout: default
title: "3D printer hotend: one step test, SIMC gains, and the thermistor that falls out"
short_description: "Fit gain, time constant and dead time from one step, compute a PI from them, and catch thermal runaway by watching response, not temperature"
status: "Done"
picture: "assets/images/control/plant-models/printer_hotend_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 4
publish: true
permalink: /embedded/control/plant-models/printer-hotend
board_parent: plant-models
result: "PI from one step test: 5.1 % overshoot, 0.10 K steady error, 2.1 K dip when the fan starts; runaway caught in 20.0 s at 231 °C"
tags: [control, simulation, sensor, cpp]
---

# 3D printer hotend: one step test, SIMC gains, and the thermistor that falls out

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "Hotend from one step": 20.0 s to the trip, SIMC gains, runaway check]({{ '/assets/images/control/plant-models/printer_hotend_cover.jpg' | relative_url }})
*The result first: 5.1 % overshoot from one step test, and the fallen-out thermistor is caught in 20.0 s at 231 °C.*

![The thermistor falls out: it reads 25 °C forever while the block keeps heating, and the monitor trips at 20 s]({{ '/assets/images/control/plant-models/hotend_runaway.png' | relative_url }})

## Situation

A desktop printer's hotend: a 40 W cartridge heater in an aluminium block, a thermistor in a well next to it,
a MOSFET switching at a few hertz, and a part-cooling fan that takes heat away the moment a print starts. The
plant is so slow that a trial-and-error tuning round costs half an hour. And the failure that matters is not a
bad tuning, it's a thermistor that comes loose and reads room temperature while the heater runs flat out.

## Task

Fit a first-order-plus-dead-time model from a single step of heater power, compute PI gains with Skogestad's
SIMC rules, check it against a fan coming on at 300 s, then pull the thermistor out of the block and make sure
something notices.

## Action

The step test (0.4 duty) gives three numbers. The model in the simulator is actually two thermal nodes with
radiation, so the fit is an approximation on purpose:

```
  fitted gain                                    272.0954 K per unit duty
  fitted time constant                           118.5462 s
  fitted dead time                                 3.8357 s
  controllability ratio (theta/tau)                0.0324
```

![Step test and the first-order-plus-dead-time fit]({{ '/assets/images/control/plant-models/hotend_step_fit.png' | relative_url }})

θ/τ = 0.03 means lag-dominant, so a PI is enough. SIMC gives Kp = 0.057 duty/K and an integral time of 30.7 s, plus
a feedforward duty of 0.51 for the setpoint:

```
  overshoot                                        5.1365 %
  settling time (2% band)                        203.3500 s
  steady-state error                               0.0967 K
  worst dip when the fan starts                    2.0602 K
```

For runaway, an absolute temperature limit is useless here: the loose thermistor reads a believable 25 °C, so the
loop commands full power forever and the limit never sees anything. The check that works watches *response*: full
power must produce a rise within 20 s. If it doesn't, it doesn't matter whether the sensor, the heater or the
mechanics failed, the safe action is the same.

```
Thermal runaway: the thermistor falls out of the block
  block temperature when the trip fired          231.4713 C
  time to trip                                    20.0000 s
```

## Result

From one step test the SIMC PI reaches the setpoint with 5.1 % overshoot, settles in 203 s, holds 0.10 K steady error
and dips only 2.1 K when the fan starts. When the thermistor falls out, the response check trips in 20.0 s with the block
at 231 °C, a case no absolute limit would have caught. Same in the float build.

## What I'd do next

231 °C in 20 s is fast enough to scorch PLA. The trip window could depend on the commanded duty, so a full-power
command gets a shorter window. I'd also like to rerun the step fit with heater power ±10 %, since cheap cartridges vary.

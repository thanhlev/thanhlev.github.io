---
layout: default
title: "When it goes wrong: chip fault, a hot winding, a dead encoder"
short_description: "Three failure scenarios on the simulated drive: fault and reset through CiA 402, I²t derating on a pump, back-EMF fallback when the encoder line dies"
status: "Done"
picture: "assets/images/control/dc-motor-drive/protection_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 3
publish: true
permalink: /embedded/control/dc-motor-drive/protection
board_parent: dc-motor-drive
result: "Fault in 1.05 ms; winding peaks at 95.6 °C under a 110 °C limit with nothing tripped; dead encoder to back-EMF speed in 5.0 ms, still running"
tags: [motor, control, simulation, cpp, testing]
---

# When it goes wrong: chip fault, a hot winding, a dead encoder

[Back to the DC motor drive hub]({{ '/embedded/control/dc-motor-drive/' | relative_url }})

![The result first]({{ '/assets/images/control/dc-motor-drive/protection_cover.jpg' | relative_url }})
*The result first: Fault in 1.05 ms, the winding peaks at 95.6 °C under a 110 °C limit, and a dead encoder hands over to back-EMF speed in 5.0 ms.*

![Encoder line dies at 1.0 s: true shaft, the frozen encoder estimate, the back-EMF estimate]({{ '/assets/images/control/dc-motor-drive/dcm_encoderloss_switch.png' | relative_url }})

## Situation

The happy path of a drive is maybe a third of the code. The rest is what happens when the bridge pulls its
fault pin mid-move, when the load is heavier than the motor's rating for minutes at a time, or when a
connector shakes loose. On a bench you find those by breaking things. In the simulator I can break them on
purpose, at the same tick, every run.

## Task

Three scenarios, all on the commissioned model. (c) The bridge asserts nFAULT for 100 ms during a 40 rad
move: go to Fault, refuse a reset while the fault is held, recover, finish the move. (d) A pump load that
needs about 2.6 A at 280 rad/s on a motor rated 1.5 A, four cycles of 25 s pumping and 5 s stopped: the winding
must not reach 110 °C and nothing should trip. (e) The encoder line dies at 200 rad/s: keep running on the
back-EMF speed, and refuse any position command, because without an encoder there is no angle.

## Action

Fault first. Protection maps the chip fault to "coast now", and the state machine walks to Fault:

```
   0.1000 s  nFAULT asserted at 200.2 rad/s
   0.1001 s  OperationEnabled    -> FaultReactionActive
   0.1011 s  FaultReactionActive -> Fault
  failed resets while asserted                          1
   0.2310 s  Fault               -> SwitchOnDisabled
  shaft speed when enabled again                 162.8830 rad/s
  brought to rest under control in                 0.0433 s        ok
```

The interesting line is the speed when enabled again: the shaft is still coasting at 163 rad/s. The servo has
to come up idle (torque mode, 0 A), not resume the old move, then stop the shaft under control and only then
take the new position command.

![The winding temperature on four pump cycles, and the I²t estimate on top of it]({{ '/assets/images/control/dc-motor-drive/dcm_thermal_temperature.png' | relative_url }})

Thermal: from 80 °C the protection derates the current limit towards 1.5 A at 110 °C. The speed loop then runs
into its limit and the pump just gets slower, which is the right thing to give up:

```
  first derating (estimate at 80 C) at            47.0911 s
  peak true winding temperature                   95.6319 C
  lowest derated limit                             2.2038 A
  speed at the end of the last pumping phase     259.4872 rad/s
  estimate above the truth by at most              0.2931 K
```

The I²t estimate runs slightly high (by the identified R's error), which is the safe side.

Encoder loss: the cross-check between encoder speed and back-EMF speed has to disagree for 5 ms before it
switches, so a single glitch doesn't do it.

```
  line dead to the switch                          5.0000 ms       ok
  worst |w - 200| in the 200 ms after             11.2217 rad/s    ok
  still OperationEnabled, Warning set                 yes          ok
  position refused: PositionWithoutEncoder            yes          ok
```

## Result

The chip fault reaches Fault in 1.05 ms, a reset is refused while nFAULT is held, and after recovery the move
finishes 0.18 counts from target. Under the pump duty the winding peaks at 95.6 °C (hard limit 110 °C) with the
limit derated to 2.20 A and nothing latched; the pump drops to 259 rad/s instead. With a dead encoder the drive
switches to back-EMF speed in 5.0 ms, stays within 11.2 rad/s of 200, and refuses the position move with
`PositionWithoutEncoder`, then ramps down and faults. The float build passes the same checks (peak 95.633 °C, switch at 5.0 ms).

## What I'd do next

The back-EMF speed depends on Ke, and a real motor's Ke drops as its magnets warm up. On the simulator that
never happens. That's the first thing I'd measure on a real motor, together with the thermal time constant
(here it's a model value, 40 s).

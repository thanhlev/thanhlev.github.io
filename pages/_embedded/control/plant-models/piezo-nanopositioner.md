---
layout: default
title: "Piezo stage: learning control vs an inverse model, 168 nm vs 118 nm RMS"
short_description: "13 % hysteresis on a sub-nanometre actuator; iterative learning with no model against a closed-form Prandtl-Ishlinskii inverse"
status: "Done"
picture: "assets/images/control/plant-models/piezo_nanopositioner_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: re-run in double and float"
index: 5
publish: true
permalink: /embedded/control/plant-models/piezo-nanopositioner
board_parent: plant-models
result: "RMS error per scan line 567 nm open loop, 168 nm with learning, 118 nm with the inverse model; opening the Q-filter makes learning diverge to 38.8 µm"
tags: [control, simulation, cpp]
description: "13 % hysteresis on a sub-nanometre actuator; iterative learning with no model against a closed-form Prandtl-Ishlinskii inverse"
date: 2026-11-22
last_modified_at: 2026-11-27
---

# Piezo stage: learning control vs an inverse model, 168 nm vs 118 nm RMS

[Back to the plant models hub]({{ '/embedded/control/plant-models/' | relative_url }})

![Plant models cover, "Learning vs a model": 118 nm RMS per line, the inverse model wins]({{ '/assets/images/control/plant-models/piezo_nanopositioner_cover.jpg' | relative_url }})
*118 nm RMS per scan line with the inverse model, 168 nm with learning, 567 nm open loop.*

![Learning pass by pass: Q-filter at 0.08 converges, the same gain at 0.30 diverges]({{ '/assets/images/control/plant-models/piezo_learning.png' | relative_url }})
*Learning pass by pass: the Q-filter at 0.08 converges, the same gain at 0.30 diverges, out to 38.8 µm.*

## Situation

A piezo stack resolves sub-nanometre steps and has 13 % hysteresis, which on a 15 µm scan is about 2 µm of
error on an actuator sold for its resolution. The scanning stage of a microscope runs the same raster line over
and over, so the error isn't noise, it repeats. I wrote this demo expecting iterative learning control (ILC) to win:
it learns the repeating error with no model at all.

## Task

One 40 ms raster line on a 20 µm stage (resonance at 4 kHz, ζ = 0.012). Compare open loop, a feedforward inverse of
the hysteresis (Prandtl-Ishlinskii, closed form), ILC from the nominal command, and ILC on top of the inverse.

## Action

The scan is a raised cosine, not a triangle: a triangle's corners have energy at the 4 kHz resonance, where the gain
is forty times its DC value, and the ringing would swamp every number after it.

```
1: open loop, nominal gain only
  RMS tracking error                             566.7650 nm
  forward-versus-reverse offset                  940.4163 nm
2: feedforward hysteresis inversion
  RMS tracking error                             118.0219 nm
3a: learning from the nominal command, no hysteresis model
  pass  1   RMS error     566.77 nm
  pass  2   RMS error     409.40 nm
  pass 15   RMS error     168.35 nm
```

ILC gets most of the way, but its floor is set by the Q-filter, which has to throw away enough spectrum to stay
stable against that lightly damped resonance. Opening the Q-filter (0.08 → 0.30) with the same learning gain makes
it blow up instead:

```
3b: the same gain with the Q-filter opened up
  pass 15   RMS error   38808.17 nm
```

And learning on top of the inverse doesn't help either. It starts at 118 nm, goes *up* to 179 nm on pass 2, and ends
at 169 nm, i.e. back at the learning-only floor.

## Result

RMS error per scan line: 567 nm open loop, 168 nm after 15 passes of ILC with no model, 118 nm with the closed-form
hysteresis inverse. The inverse wins here because the dominant error is a memoryless nonlinearity that a model
captures exactly, while ILC is limited by its Q-filter. With the Q-filter opened to 0.30 the same ILC diverges to
38.8 µm. Same verdict in the float build.

## What I'd do next

I think the result is generous to the model: the inverse was written for the hysteresis I simulated, so it fits it
well. With a hysteresis shape the inverse doesn't match, and creep (1.5 % per decade in the model) over a longer run,
I'd expect ILC to catch up. Not run yet.

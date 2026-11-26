---
layout: default
title: "ADRC and sliding mode on a plant 3× off, and the 7× where ADRC breaks"
short_description: "ADRC against a PID while the plant gain drifts from 0.5× to 8× of what both were told, sliding mode over a 5× range, and super-twisting against two sliding-mode baselines"
status: "Done"
picture: "assets/images/control/control-library/robust_control_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-23: first write-up, measured in double and float"
index: 5
publish: true
permalink: /embedded/control/control-library/robust-control
board_parent: control-library
result: "Plant gain 3× off: ADRC IAE 0.171 vs PID 0.275; ADRC holds to 6× and limit-cycles at 7×; sliding mode lands within 0.33 % over a 5× range; super-twisting's biggest output step 0.35 vs 12 for the sign law"
tags: [control, simulation, cpp]
---

# ADRC and sliding mode on a plant 3× off, and the 7× where ADRC breaks

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![Control library cover, "Plant gain 3× off": 0.171 IAE (PID 0.275), ADRC is fine to 6×, gone at 7×]({{ '/assets/images/control/control-library/robust_control_cover.jpg' | relative_url }})
*With the plant gain 3× what it was told, ADRC's integrated error is 0.171 against the PID's 0.275. At 7× it falls apart. In simulation.*

![PID and ADRC on the same plant, gain 3× off, load step at 5 s]({{ '/assets/images/control/control-library/adv_adrc_vs_pid.png' | relative_url }})
*Same plant, same actuator limit: the PID overshoots 16 %, ADRC 0.3 %, and the load step at 5 s barely shows on either.*

## Situation

ADRC and sliding mode are the two laws in the library that sell themselves on "you don't need a good
model". ADRC needs one number, b0, the plant's input gain; its header says a factor-of-two error in it
is tolerable because the observer swallows the rest. Sliding mode needs a switching gain larger than
whatever it doesn't know. My controller gallery demo printed one line for each, ADRC 0.171 against a
PID's 0.275 on a plant 3× stronger than both were told, and that was all I knew. One point doesn't tell
you where the claim stops.

## Task

Take the gallery's setups unchanged and push on them. Sweep the true plant gain from 0.5× to 8× of what
ADRC and the PID were told, same tuning everywhere, same load step at 5 s, and score integrated error,
overshoot and how much the actuator moves. Run the gallery's sliding-mode controller on three plant
gains. Then put `ctl::SuperTwisting` against the two first-order sliding-mode laws it exists to replace,
on the bare surface dynamics s' = u + d with an unknown constant push d = 2.

## Action

I wrote a small measurement demo next to the gallery, `controller_traces`, that runs these loops,
prints the numbers and writes CSV traces for the plots. It adds no control law; the only inline code is
the two sliding-mode baselines, two lines each. Built in double and in float:

```
$ g++ -std=c++20 -O2 -I components/controller/include demos/controllers/controller_traces/traces.cpp -o traces
$ g++ -std=c++20 -O2 -DCTL_REAL_FLOAT -I components/controller/include demos/controllers/controller_traces/traces.cpp -o traces_f
```

The sweep is where it got interesting:

```
gain x1.0  PID IAE 0.2851 overshoot  12.3% travel  6.8 | ADRC IAE 0.1747 overshoot  0.0% travel    10.4
gain x3.0  PID IAE 0.2752 overshoot  15.9% travel  6.6 | ADRC IAE 0.1709 overshoot  0.3% travel    21.5
gain x5.0  PID IAE 0.2733 overshoot  16.6% travel  7.1 | ADRC IAE 0.1704 overshoot  0.4% travel    72.3
gain x6.0  PID IAE 0.2728 overshoot  16.8% travel  7.5 | ADRC IAE 0.1712 overshoot  0.9% travel   243.5
gain x7.0  PID IAE 0.2724 overshoot  16.9% travel  7.9 | ADRC IAE 1.6147 overshoot 23.1% travel 35599.2
```

ADRC's error stays between 0.170 and 0.183 from 0.5× to 6×. That's far better than the factor of two its
own header promises. But the travel column tells the story before the error does: the actuator moves
7× more at 5× than at 1×, 23× more at 6×, and at 7× the loop limit-cycles, the output banging between +40 and -40 and the plant swinging 0.75 to 1.23. The
PID's overshoot creeps up from 8.0 % at 0.5× to 16.9 % at 7× and it never breaks. My reading is that a b0 that's too small makes
ADRC's effective gain too big by the same factor, until the observer can't keep up with its own
controller; I didn't work out the exact bound. On this plant the edge sits between 6× and 7×, and it's
sharp.

![IAE of PID and ADRC over the gain ratio, log scale]({{ '/assets/images/control/control-library/adv_adrc_gain_sweep.png' | relative_url }})
*Same tuning across the sweep: ADRC stays at 0.17 until 6×, then jumps to 1.61 at 7×. The PID sits at 0.27 the whole way.*

The gallery's sliding-mode controller (λ 6, k 40, boundary layer 0.4) settled at 0.9967, 0.9983 and
0.9989 on plant gains 0.5, 1.0 and 2.5, reaching 95 % in 0.50 to 0.52 s every time. Inside the boundary
layer it's a high-gain proportional law, so it doesn't land exactly on 1, but it lands within 0.33 % on
all three without retuning.

Then super-twisting. The textbook sign law, u = -6·sign(s), reaches s = 0 first (0.249 s) and then
switches between +6 and -6 every sample, forever: steps of 12 at 1 kHz on an actuator. The usual fix, a
boundary layer of 0.05, is smooth but never gets s below 1e-4; it parks at 0.017, because inside the
layer it's proportional and a proportional law needs an error to push back against d. Super-twisting
takes longer to arrive (0.414 s) and then holds s at 1.4e-5 on average with a continuous output whose
largest step after the start is 0.35, settling on exactly -2.0000, the push it never measured.

![Controller output of the three sliding-mode laws over the first 1.2 s]({{ '/assets/images/control/control-library/adv_super_twisting.png' | relative_url }})
*The red band is the sign law chattering ±6 every millisecond. Green (boundary layer) and blue (super-twisting) both end on -2; only blue also gets s to zero.*

## Result

With the plant gain 3× what both controllers were told, ADRC's integrated error is 0.171 against the
PID's 0.275, with 0.3 % overshoot instead of 15.9 %. It keeps that up to a 6× error, paying in actuator
travel (243 against the PID's 7.5), and limit-cycles at 7× (IAE 1.61). Sliding mode lands within 0.33 %
of the setpoint on plants whose gain spans 5×, unchanged. Super-twisting holds the surface at 1.4e-5 with
a largest output step of 0.35, where the sign law steps 12 every sample and the boundary layer parks at
0.017. The float build prints the same numbers to the last digit, except actuator travel, which moves
by 0.1 in a few rows. All in simulation.

## What I'd do next

Watch the actuator travel online and treat a jump in it as "b0 is wrong", before the loop limit-cycles.
And try ADRC with b0 too large instead of too small; I only swept one side far.

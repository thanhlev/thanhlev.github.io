---
layout: default
title: "Complementary filter at 0.0044 rad, once I stopped trusting the gyro for 0.5 s"
short_description: "A complementary filter on a biased gyro and a noisy accelerometer, swept over its one parameter, and an EKF and a UKF finding a pendulum rate they never measure"
status: "Done"
picture: "assets/images/control/control-library/estimators_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-23: first write-up, measured in double and float"
index: 8
publish: true
permalink: /embedded/control/control-library/estimators
board_parent: control-library
result: "Complementary filter 0.0151 -> 0.0044 rad RMS with tau 0.1 s instead of 0.5 s (gyro alone 1.039, accelerometer alone 0.046); EKF and UKF find an unmeasured pendulum rate in 0.08 s and hold it to 0.0051 rad/s RMS, identically"
tags: [control, simulation, cpp]
description: "A complementary filter on a biased gyro and a noisy accelerometer, swept over its one parameter, and an EKF and a UKF finding a pendulum rate they never measure"
date: 2026-11-23
last_modified_at: 2026-11-27
---

# Complementary filter at 0.0044 rad, once I stopped trusting the gyro for 0.5 s

[Back to the control library hub]({{ '/embedded/control/control-library/' | relative_url }})

![Control library cover, "Estimators, measured": 0.0044 rad RMS, my hand-over time was too long]({{ '/assets/images/control/control-library/estimators_cover.jpg' | relative_url }})
*The same complementary filter, hand-over time 0.1 s instead of 0.5 s, tracks the angle to 0.0044 rad RMS instead of 0.0151. In simulation.*

![Angle estimates over 20 s, and the RMS error over the hand-over time]({{ '/assets/images/control/control-library/adv_complementary.png' | relative_url }})
*Top: the gyro alone walks away, the accelerometer alone is noise, the filter sits on the truth. Bottom: the error against tau, best at 0.1 s.*

## Situation

Every control law in the library assumes it knows the state, and a real board measures less than that.
The library has three answers: a complementary filter for the IMU case, and an EKF and a UKF for anything
with a model. My controller gallery ran the complementary filter once, on a synthetic IMU (true angle
0.3·sin(0.5t) rad, a gyro with a 0.03 rad/s bias, an accelerometer angle with ±0.08 rad of noise), and
printed 0.0151 rad RMS against 1.039 for the gyro alone and 0.046 for the accelerometer alone. Better
than either input, so I'd left it there. The hand-over time, 0.5 s, was a number I'd picked because it
looked reasonable.

## Task

Sweep the filter's single parameter, tau, from 0.02 to 5 s on the same 60 s run and see whether 0.5 s
was any good. Then run the EKF and the UKF side by side on the pendulum from the unit tests: angle
measured with ±0.01 rad of noise at 100 Hz, rate never measured, both filters starting with the angle
wrong and no idea of the rate. Once released from 1.0 rad, once from 2.5 rad, where sin θ is far from θ and
an EKF's linearisation is supposed to hurt.

## Action

Both runs are in `controller_traces`, the measurement demo next to the gallery, built in double and
float. The sweep:

```
tau sweep, fused RMS: 0.02:0.0072 0.05:0.0048 0.10:0.0044 0.20:0.0064 0.50:0.0151 1.00:0.0298 2.00:0.0588 5.00:0.1410
```

From 0.5 s up the error doubles every time tau doubles, and the numbers are almost exactly 0.03 × tau:
0.015, 0.030, 0.060, 0.150 by that rule, 0.0151, 0.0298, 0.0588, 0.1410 measured. That's the gyro bias
coming through. A complementary filter integrates the gyro over a window of about tau, so a constant bias
b leaves an angle error of about b·tau. Below 0.1 s the bias term is small and the accelerometer's noise
takes over, because the filter now trusts it more. The best of the eight is 0.1 s at 0.0044 rad, 3.4×
better than the 0.5 s I had. The optimum moves with the bias and the noise, so on a real IMU I'd measure
both first and set tau from them, not from this run.

The Kalman filters were the opposite of exciting:

```
from 1.0 rad: rate error < 0.1 rad/s after EKF 0.08 s, UKF 0.08 s; RMS 10..20 s EKF 0.0046, UKF 0.0046 rad/s
from 2.5 rad: rate error < 0.1 rad/s after EKF 0.08 s, UKF 0.08 s; RMS 10..20 s EKF 0.0051, UKF 0.0051 rad/s
```

Both find a rate they never see in 0.08 s, eight samples, and track it to about 0.005 rad/s. From
2.5 rad, where I expected the EKF's first-order Jacobian to fall behind the UKF's sigma points, they
agree to four digits. With an angle measured directly and 100 Hz updates, each prediction step is short
enough that the linearisation error stays tiny. I couldn't make them differ on this plant, and that's
the result: here the UKF's extra cost (5 sigma points through the model each step) buys nothing.

![Rate error of the EKF and the UKF over 20 s, log scale]({{ '/assets/images/control/control-library/adv_ekf_ukf.png' | relative_url }})
*Released from 2.5 rad: both errors drop under 0.1 rad/s in 0.08 s and lie on top of each other for the rest of the run.*

## Result

With tau 0.1 s instead of 0.5 s the complementary filter's error drops from 0.0151 to 0.0044 rad RMS,
against 1.039 rad for the gyro alone and 0.046 for the accelerometer alone; above 0.1 s the error tracks
the bias times tau almost exactly. The EKF and the UKF both recover an unmeasured pendulum rate in 0.08 s
and hold it to 0.0046 rad/s RMS from 1.0 rad and 0.0051 from 2.5 rad, with identical numbers. Same
results in the float build. All in simulation, on a synthetic IMU with uniform noise and a constant bias.

## What I'd do next

Give the EKF/UKF a case where they should differ: a range-and-bearing measurement, or a slow update rate
where one prediction step spans a big part of the swing. And put the complementary filter on a real
MPU6050 from the driver library, where the bias isn't constant.

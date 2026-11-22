---
layout: default
title: "Humanoid (17-servo biped)"
short_description: "My thesis robot, brought back as a model: my own C++ kinematics library, MuJoCo physics, an online walker with IMU feedback"
status: "In Progress"
picture: "assets/images/robotics/humanoid/walk_push.png"
latest_release: "2026-11-22: hub page with three STAR write-ups"
index: 3
publish: true
permalink: /robotics/humanoid/
board_hub: true
---

# Humanoid (17-servo biped)

![Same sideways push in MuJoCo: open loop falls, IMU feedback stays up]({{ '/assets/images/robotics/humanoid/walk_push.png' | relative_url }})

This is the small biped from my undergraduate thesis: 17 hobby servos, a gait planned
completely offline in MATLAB, sent as ASCII position commands over a 9600 baud UART to a
microcontroller that played the frames back. It never read anything back from a servo. The
original build, with the video of the real thing, is still on its own page:
[where it started]({{ '/robotics/humanoid/thesis' | relative_url }}).

In September 2026 I ported the code to Python and C++ and asked a simple question: does the
inverse kinematics actually hit its targets? It didn't. Every frame of the walk was off by
166 mm (median), and the 42 unit tests passed anyway because they only checked array shapes.
That started a month of evenings on the model.

What works now is all in simulation, and I want to be clear about that. The leg IK runs on my own
C++ kinematics library and reaches every gait target to 1 µm. The robot lives in MuJoCo with the
servos I actually own (DYNAMIXEL MX-28 for the legs, AX-12A for the arms), held inside their
torque and speed limits. A walker running at 50 Hz keeps it upright with IMU feedback, and it can
wave, squat, dance, kick and do a very small jump. The masses are my guesses (about 1.3 kg in
plastic), not weighed parts.

## The stories

{% include board_children.html board="humanoid" coll="robotics" %}

## Still open

None of this has touched a real servo yet. I have a ten-phase plan for the hardware (read one
servo, set IDs and baud rates, hold a pose, then walk) and the bench scripts for the first phases,
but they've only run against a fake port. There's no IMU on the robot either, so the feedback that
pays off in the sim is still hypothetical. Smaller gaps: the pelvis can't bow, the arms have no
collision, and the masses and servo stiffness need measuring on a bench before I trust any margin
to better than ±100 mN·s.

---
layout: default
title: "Humanoid Robot — Thesis Project"
short_description: "A full humanoid robot built from scratch for my undergraduate thesis"
status: "Done"
picture: "assets/images/humanoid_robot.jpg"
latest_release: "Complete"
index: 0
publish: true
---

# Humanoid Robot — Thesis Project
{: .no_toc }

<div class="info">
  <p>This humanoid robot was designed and built as my graduation thesis project. It walks, balances, and performs choreographed movements autonomously.</p>
</div>

## Demo Video

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QPzHcvkoI2M" title="Humanoid Robot Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Table of Contents
{: .no_toc }

1. TOC
{:toc}

## Overview

This project involved designing and building a bipedal humanoid robot from the ground up — mechanical structure, electronics, firmware, and control algorithms. The robot is capable of walking, maintaining balance, and executing pre-programmed motion sequences.

## Key Features

- **Bipedal locomotion** — stable walking gait using servo-based joint control
- **Multiple degrees of freedom** — servos at each joint (hip, knee, ankle, shoulder, elbow) for human-like movement
- **Custom mechanical frame** — designed and fabricated specifically for this project
- **Microcontroller-based control** — real-time servo coordination and motion planning
- **Choreographed motion sequences** — programmable routines for demonstration

## Hardware

| Component | Description |
|-----------|-------------|
| Actuators | High-torque digital servo motors |
| Controller | Microcontroller (ARM-based) |
| Frame | Custom aluminum/3D-printed structure |
| Power | LiPo battery pack |
| Sensors | Gyroscope/Accelerometer for balance |

## Software Architecture

The firmware handles:

1. **Motion planning** — trajectory generation for smooth joint movements
2. **Servo control** — PWM signal generation for coordinated multi-joint actuation
3. **Gait generation** — walking pattern algorithms for stable bipedal locomotion
4. **Sensor fusion** — IMU data processing for balance correction
5. **Sequence player** — executing pre-recorded motion routines

## Challenges & Lessons Learned

- **Center of gravity management** — keeping the robot balanced during dynamic movements required careful weight distribution and real-time compensation
- **Servo synchronization** — coordinating 16+ servos simultaneously while maintaining smooth motion
- **Power management** — high-torque servos draw significant current; battery life and voltage stability were critical concerns
- **Mechanical tolerances** — small misalignments in the frame accumulate and affect gait stability

## Results

The robot successfully demonstrated:
- Autonomous bipedal walking
- Stable standing and balance recovery
- Choreographed dance/movement routines
- Repeatable and reliable operation

## Related Videos

### Walking Test

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/DHY4RAcjgU8" title="Walking Test" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Motion Sequence Demo

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/OWGxAKyjUtg" title="Motion Sequence Demo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Balance & Stability Test

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QfWlphdsuPc" title="Balance and Stability Test" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Choreographed Routine

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/kSviBGft97s" title="Choreographed Routine" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

---

*This project was completed as part of my undergraduate thesis, combining mechanical engineering, electronics, and embedded software into a single integrated system.*

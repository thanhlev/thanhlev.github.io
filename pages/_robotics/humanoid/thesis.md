---
layout: default
title: "Humanoid Robot: my thesis project"
short_description: "A small humanoid on SG90 servos: SolidWorks model, DH table, inverse kinematics, then the real thing"
status: "Done"
picture: "assets/images/robotics/humanoid/hum_thesis_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-11-22: moved under Robotics, written as a STAR story"
index: 0
publish: true
permalink: /robotics/humanoid/thesis
redirect_from:
  - /embedded/humanoid-robot
board_parent: humanoid
result: "17 SG90s walking on the floor from angles I computed myself, played back over 9600-baud serial"
tags: [robotics, kinematics, servo, cad]
description: "A small humanoid on SG90 servos: SolidWorks model, DH table, inverse kinematics, then the real thing"
date: 2026-06-12
last_modified_at: 2026-11-27
---
<!-- 2026-11-22: moved from pages/_embedded/humanoid_robot.md into the Robotics humanoid hub (user «Humanoid
     Robot: my thesis project nên đưa vào Robotics») and rewritten in STAR form; same facts and the same five
     YouTube videos as before. The old URL /embedded/humanoid-robot redirects here (jekyll-redirect-from). -->

[Back to the humanoid hub](/robotics/humanoid/)

![Thesis humanoid cover: 17 SG90 servos walking]({{ '/assets/images/robotics/humanoid/hum_thesis_cover.jpg' | relative_url }})
*17 SG90s walking on the floor from angles I computed myself. The photo is version 2: I 3D-printed the frame again, same size, same servos.*

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QPzHcvkoI2M" title="Humanoid robot with SG90 Motor - My Thesis project" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Situation

This is the robot I built for my undergraduate thesis: a small biped with 17 blue SG90 hobby servos (10 in the legs, 7 in the upper body), aluminium brackets holding them together, and a ribbon cable trailing behind it on the floor. SG90s are the tiny plastic-gear servos everyone has in a drawer. They are weak, so the whole robot had to stay small and light, because every gram on the upper body is something the hips and knees have to hold up.

## Task

Make it walk from angles I worked out myself, not from a canned servo sequence: a model of the body, the kinematics of the legs, a planned path for the feet and hips, and only then the real servos.

## Action

I modelled the body in SolidWorks first, so I knew where every servo sat and how long every link was.

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/kSviBGft97s" title="Design a humanoid robot with Solidwork" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

From the model came the Denavit-Hartenberg table for the legs and the transform matrices. Boring, and one wrong sign here breaks everything after it.

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QfWlphdsuPc" title="Calculate the transform matrix from the DH table" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

Forward kinematics tells you where the foot is for a set of joint angles. Walking needs the opposite: I want the foot *here* and need the angles that put it there. So I solved the inverse kinematics and planned the path for the feet and the hips.

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/OWGxAKyjUtg" title="Kinematics, Inverse Kinematics, Path Planning for Humanoid Robot" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

Then I ran the trajectories in a simulation with the controller in the loop, so the mistakes showed up on screen instead of on the floor. The whole walk was planned offline in MATLAB, turned into servo pulses, and uploaded frame by frame over a 9600-baud serial link to a microcontroller that played them back at a fixed delay.

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/DHY4RAcjgU8" title="Humanoid Robot - Trajectory design and simulation (With controller)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Result

The angles went to the SG90s and the robot walked on the floor; that is the first video on this page. I uploaded the step-by-step videos in March 2019.

## What I'd do next

Because the walk was played back blind, with no feedback from the servos or an IMU, it only worked on a flat floor; and at 9600 baud a frame for all 17 servos takes about 106 ms, so it could never react fast. Years later I picked the same problem up again in simulation with my own kinematics library; that story is on the [humanoid hub](/robotics/humanoid/).

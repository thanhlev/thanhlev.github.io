---
layout: default
title: "Humanoid Robot: my thesis project"
short_description: "A small humanoid on SG90 servos: SolidWorks model, DH table, inverse kinematics, then the real thing"
status: "Done"
picture: "assets/images/humanoid_robot.jpg"
latest_release: "2026-11-22: rewritten from my own videos, invented specs removed"
index: 0
publish: true
---

# Humanoid Robot: my thesis project
{: .no_toc }

This is the robot I built for my undergraduate thesis. A small biped with blue SG90 hobby servos
at the joints, aluminium brackets holding them together, and a ribbon cable trailing behind it on
the floor. The first video is the real thing; the rest of the page is the design and the math
behind it.

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QPzHcvkoI2M" title="Humanoid robot with SG90 Motor - My Thesis project" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Table of Contents
{: .no_toc }

1. TOC
{:toc}

## Why it is so small

SG90s are the tiny plastic-gear servos everyone has in a drawer. They are weak, so the whole
robot has to stay small and light: every gram on the upper body is something the hips and
knees have to hold up.

## From a drawing to angles on a servo

The work splits into the steps below, and each one has its own video (I uploaded those in
March 2019).

1. **Draw it.** The body is modelled in SolidWorks, so I know where every servo sits and what
   the link lengths are.
2. **DH table.** From the model, the Denavit-Hartenberg table for the legs, turned into the
   transform matrices. Boring, and one wrong sign here breaks everything after it.
3. **Kinematics, inverse kinematics, path planning.** Forward kinematics tells you where the foot
   is for a set of joint angles. Walking needs the opposite: I want the foot *here*, which
   angles do I send? Then plan the path for the feet and the hips.
4. **Trajectory and simulation.** Run the trajectories in a simulation with the controller in the
   loop, so the mistakes show up on screen instead of on the floor.
5. **Real robot.** The angles go to the SG90s. That's the video at the top.

## The videos

### Design a humanoid robot with SolidWorks

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/kSviBGft97s" title="Design a humanoid robot with Solidwork" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Calculate the transform matrix from the DH table

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/QfWlphdsuPc" title="Calculate the transform matrix from the DH table" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Kinematics, inverse kinematics, path planning

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/OWGxAKyjUtg" title="Kinematics, Inverse Kinematics, Path Planning for Humanoid Robot" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

### Trajectory design and simulation (with the controller)

<div style="max-width: 560px; margin: 24px 0;">
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
  <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;" src="https://www.youtube.com/embed/DHY4RAcjgU8" title="Humanoid Robot - Trajectory design and simulation (With controller)" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>

## Not on this page yet

How many servos, which board drove them, how the gait was tuned. I still owe this page those
three.

*Update (2026-11-22): I cut the hardware table from the earlier version of this page (gyro,
LiPo pack, "16+ high-torque servos"). It didn't come from my notes, and the videos don't show it.*

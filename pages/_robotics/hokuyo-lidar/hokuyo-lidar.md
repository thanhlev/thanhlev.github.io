---
layout: default
title: "Hokuyo URG-04LX lidar (2D, 240°)"
short_description: "An old USB laser scanner: talking SCIP 2.0 by hand, then fixing the demos that ran on it"
status: "In Progress"
picture: "assets/images/robotics/hokuyo-lidar/scan_gd.png"
latest_release: "2026-11-22: hub page with two STAR write-ups"
index: 5
publish: true
permalink: /robotics/hokuyo-lidar/
board_hub: true
---

# Hokuyo URG-04LX lidar (2D, 240°)

![One GD scan from my desk, plotted from the raw distances]({{ '/assets/images/robotics/hokuyo-lidar/scan_gd.png' | relative_url }})

The URG-04LX-UG01 is Hokuyo's small 2D laser scanner. It spins at 600 rpm, sweeps 240° in 682 steps of 0.3516° (360/1024, exactly), and
measures 20 to 5600 mm. It's USB powered and shows up on Linux as a plain CDC-ACM serial port,
`/dev/ttyACM0`, no driver. Mine reports firmware 3.4.03 from December 2012. Hokuyo discontinued it
and says indoor use only.

I had eight little demos for it on top of Hokuyo's open-source `urg_cpp` library (a point reader,
an object clusterer, safety zones, a CSV logger, a people counter and a few more). In September
2026 I plugged it in again and wanted two things: see the protocol for myself, without the library,
and find out whether those demos actually worked. Most of them had never run on the sensor.

## The stories

{% include board_children.html board="hokuyo-lidar" coll="robotics" %}

## Still open

Three checks need someone in front of the sensor: wave a hand or a box through the scan while
`scan_diff` runs (I only proved it no longer raises false alarms, not that it still catches real
changes), put an object down for `dimension_measure`, and hold a hand on the sensor's left to see
whether the zones called LEFT and RIGHT are swapped. I suspect they are, because angles grow
counter-clockwise on the URG line, but I haven't checked. I also never measured how the error codes
behave on dark, shiny or edge-on surfaces, and I haven't tried the commands that change the bit
rate or motor speed.

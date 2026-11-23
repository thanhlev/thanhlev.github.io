---
layout: default
title: "A safety zone that was always CLEAR, and an intrusion alarm that never stopped"
short_description: "Running my eight urg_cpp demos on the sensor for the first time: a step-versus-index bug and mixed pixels"
status: "Done"
picture: "assets/images/robotics/hokuyo-lidar/hok_bugs_cover.jpg"   # 2026-11-23 cover, story_cover.py
latest_release: "2026-09-27: step-to-index fix, mixed-pixel filter in scan_diff"
index: 2
publish: true
permalink: /robotics/hokuyo-lidar/demo-bugs
board_parent: hokuyo-lidar
result: "zone_monitor now flags the object at 113 mm it used to call CLEAR; scan_diff: 0 false alarms in 280 frames (before: every frame)"
tags: [robotics, lidar]
---

# A safety zone that was always CLEAR, and an intrusion alarm that never stopped

[Back to the Hokuyo hub]({{ '/robotics/hokuyo-lidar/' | relative_url }})

![Demo bugs cover: 0 false alarms in 280 frames]({{ '/assets/images/robotics/hokuyo-lidar/hok_bugs_cover.jpg' | relative_url }})
*0 false alarms in 280 frames, where the old scan_diff fired on every one.*

## Situation

Of my eight `urg_cpp` demos, only two (`urg_reader` and `csv_logger`) had ever run on the sensor.
All eight built cleanly, which proves nothing. With the raw SCIP client from the
[previous story]({{ '/robotics/hokuyo-lidar/scip-by-hand' | relative_url }}) I finally had
something to compare their output against.

## Task

Run the other six on the real sensor, compare what they report with a raw scan of the same desk,
and fix what's wrong.

## Action

Four of them loop until Ctrl+C, so I ran them under `timeout -s INT 4`. All six opened the sensor
and ran. Two looked wrong straight away. `scan_diff 200`, on a desk where nothing moved, printed a
change on every frame:

```
Reference OK (726 points). Monitoring changes > 200mm
[CHANGE] 2 points differ | biggest: -84.7° 164mm->565mm (Δ401mm) at (52,-563)
[CHANGE] 3 points differ | biggest: -75.6° 1030mm->1630mm (Δ600mm) at (406,-1579)
```

That's the mixed-pixel effect: a beam that hits the edge of an object sometimes returns the object
and sometimes the wall behind it, and the reference was a single scan. And `zone_monitor` printed
`Read error` on Ctrl+C because the signal cut into a read and the loop left through its error
branch.

While fixing the Ctrl+C thing in `zone_monitor` I read `check_zone()` and found a worse bug. It
loops from `deg2step(min)` to `deg2step(max)` and uses that as the array index. But steps are
counted from straight ahead (0 = front), and the array starts at the beginning of the scan range.
I checked it with a few lines of C++ before touching anything:

```
deg2step(-90)=-256
deg2step(-45)=-128
range -135..+135: size 726 index2deg(0)=-135.00 index2deg(size-1)=119.88 step2index(0)=384
```

So the −90° to −45° zone mapped to negative indices, got skipped, and always said CLEAR.
`dimension_measure` had the same bug and only looked at half of its ±45° window. The other demos
use `index2rad(i)` on array indices and were fine. The fix is `step2index()`.

For `scan_diff` I first planned a median of several scans as the reference. When I wrote it I
switched to a [min, max] band per step over 10 scans: an edge pixel that flips between two values
is off the median half the time, but if it flipped while the reference was taken, both values are
inside its band. On top of that an alarm needs at least 3 adjacent steps out of band for at least
3 frames in a row. The price, written in the file header: about 300 ms of delay, and nothing
narrower than 3 steps (roughly 18 mm at 1 m) is seen.

## Result

```
Reference OK: 586 of 726 steps usable, widest band 144 mm at -107.2 deg
Alarm when >= 3 adjacent steps are > 200 mm outside the band for >= 3 frames
Done. 280 frames, 5 with raw point changes, 0 alarm(s)
```

0 alarms in 280 frames (30 s) on a still desk, where the old version fired on every frame. The band
alone cut raw differences to 5 of 280 frames, and the adjacency and duration rules removed those.

`zone_monitor` now agrees with a raw scan in all three zones. The −90..−45° zone has an object at
113 mm (at −62.6°) and says DANGER, where the old build said CLEAR. Ctrl+C prints `Stopping.` and
nothing else.

## What I'd do next

The other direction is untested: does `scan_diff` still catch a real change? That needs a hand in
the beam. And I want to settle which side "LEFT" really is before anyone trusts these zone names.

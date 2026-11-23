---
layout: default
title: "Two bugs in the DynamixelSDK Python package, found with no servo plugged in"
short_description: "A fake serial port under the real SDK: every e-manual example matches, byte stuffing silently doesn't happen, and Bulk Read on Protocol 1.0 crashes"
status: "Done"
picture: "assets/images/robotics/dynamixel/write_sequence.png"
latest_release: "2026-11-22: re-run on the pinned SDK commit"
index: 1
publish: true
permalink: /robotics/dynamixel/sdk-on-a-fake-port
board_parent: dynamixel
result: "All 6 e-manual packet examples match byte for byte; a write of FF FF FD goes out unstuffed (LEN 9, not 10); GroupBulkRead on Protocol 1.0 raises TypeError"
tags: [robotics, servo, python]
---

# Two bugs in the DynamixelSDK Python package, found with no servo plugged in

[Back to the DYNAMIXEL hub]({{ '/robotics/dynamixel/' | relative_url }})

## Situation

I had servos and no adapter, and I wanted to know what the bus would carry before I spent
evenings guessing at a scope. The ROBOTIS e-manual gives example packets for ping, read, write and
sync write, so the SDK's output can be checked against them without any hardware.

Later the humanoid walker needed to read ten servos every 20 ms, eight MX-28 and two AX-12A, all
on Protocol 1.0. That's a Bulk Read for the MX-28 and single reads for the AX-12A (Bulk Read isn't
supported on the AX).

## Task

Run the real DynamixelSDK (pinned at commit a8d35d51, 2026-10-16) against a port that records what
is written and plays back a scripted reply, print every byte, and compare with the e-manual.

## Action

The fake port is the SDK's own `PortHandler` with only the serial I/O replaced. Its timeout code
stays the SDK's, unchanged, so the timing logic is tested too.

```python
class FakePort(PortHandler):
    """The SDK's own PortHandler with only the serial I/O replaced: it captures
    what is written and plays back a scripted reply.  The timeout code
    (setPacketTimeout, isPacketTimeout) is the SDK's, unchanged."""
```

Every case with an e-manual reference came out `MATCH`: ping, read, write, sync write, and the
Protocol 1.0 checksum and ping. Then the case the e-manual doesn't cover. Protocol 2.0 says that if
`FF FF FD` shows up inside a packet, the sender inserts an extra `FD` so the receiver doesn't
take it for a new header. Goal Position `0x00FDFFFF` has exactly those bytes:

```
$ python3 tools/dxl_wire_check.py stuffing
Write 0x00FDFFFF to 116 of ID 1: the data bytes are FF FF FD 00,
which looks like a header, so Protocol 2.0 says the sender must stuff a 0xFD
  addStuffing() return value: FF FF FD 00 01 0A 00 03 74 00 FF FF FD FD 00 00 00  (length field 10)
  what txPacket() wrote   : FF FF FD 00 01 09 00 03 74 00 FF FF FD 00 C9 07
  length field on the wire: 9, stuffed 0xFD present: False
```

`addStuffing()` builds the right packet. But when the length grows it rebinds its local `packet`
to a new list, and `txPacket()` calls it without using the return value. The caller's list never
changes, and the unstuffed packet goes out. In Extended Position mode, −131073 is `FF FF FD FF`, so
this isn't only a weird corner value. What I'd expect on a real bus is a "no status packet" or a CRC
error for a few specific positions only, which would be a nightmare to chase (I haven't seen that
on hardware, it's my guess). The one-line workaround is
`txpacket[:] = self.addStuffing(txpacket)`. From reading the C++ SDK, it stuffs in place, so it
should be fine; I didn't run it.

The second bug came from the humanoid's bus code:

```
read_positions(): Bulk Read for 8 MX-28, then 2 single Reads for the AX-12
  FF FF FE 1B 92 00 02 01 24 02 02 24 02 03 24 02 04 24 02 0B 24 02 0C 24 02 0D 24 02 0E 24 E8
  ...
DynamixelSDK GroupBulkRead.txRxPacket() on Protocol 1.0:
  TypeError: Protocol1PacketHandler.bulkReadTx() takes 4 positional arguments but 5 were given
```

`GroupBulkRead` passes one argument too many to the Protocol 1.0 `bulkReadTx()`. So my walker
builds that Bulk Read packet itself; the line above is the packet it sends.

## Result

Re-run today on the same pinned commit: all 6 reference cases match, the stuffing case still
writes LEN 9 with no extra `FD`, and `GroupBulkRead` on Protocol 1.0 still raises `TypeError`. On
the fake port, the walker's command and read-back agree to within 0.042° (one encoder tick), and
the standing-pose command is one 38-byte Sync Write, 380 µs at 1 Mbps.

## What I'd do next

Buy the U2D2, find out which protocol my MX-28s actually speak, and check that the bytes on a real
bus look like these. And file both bugs with ROBOTIS, after checking whether a newer commit has
fixed them.

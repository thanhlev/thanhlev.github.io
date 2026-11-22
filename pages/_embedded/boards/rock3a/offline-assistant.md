---
layout: default
title: "A Vietnamese voice assistant with the network unplugged"
short_description: "Speech to text, a 0.6B LLM and Vietnamese TTS on the RK3568's four A55 cores under Android 14, recorded 17 times"
status: "Done"
picture: "assets/images/boards/rock3a/offline_assistant.png"
latest_release: "2026-11-19: 17 recorded runs, 16 fully offline"
index: 16
publish: true
permalink: /embedded/boards/rock3a/offline-assistant
board_parent: rock3a
result: "First spoken word 11.8 s after the question (median of 12), LLM 4.0 tok/s, about 4 in 10 answers right"
---

# A Vietnamese voice assistant with the network unplugged

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }}) · built and recorded 2026-11-19

![The assistant's HDMI screen mid-answer]({{ '/assets/images/boards/rock3a/offline_assistant.png' | relative_url }})

The board's HDMI output during one of the runs. The question was "who was the first person to set foot
on the Moon", the speech model heard "Mặt Trăng" (Moon) as "mặt trắng" (white face), and the LLM
politely repeated the question back as its answer. The red badge says "no network".

## Situation

After the Android 14 port I had llama.cpp, Whisper and Vietnamese TTS benchmarks running on this board,
each one on its own. Benchmarks are numbers in a log. I wanted to see what it feels like to actually talk
to a 4-core A55 board in Vietnamese with no cloud behind it.

## Task

A full voice loop on the board's CPU, with Wi-Fi and Ethernet switched off for the whole run: question
audio in, text out on HDMI, spoken answer out. Measure every stage, and record enough runs to say
honestly how good it is.

## Action

The chain:

| Step | What | Median while recording |
|---|---|---|
| Speech to text | sherpa-onnx zipformer-vi, 30M, int8 | 1009 ms |
| Think | llama-server, Qwen3-0.6B Q4_0, bound to `127.0.0.1` only, tokens streamed | first token 1624 ms, 4.0 tok/s |
| Speak | Piper `vi_VN-25hours_single-low`, one sentence at a time as soon as it's finished | RTF 1.45 |
| Screen | my Android app: question, answer typing in, the sentence being spoken in yellow, a timer per stage | |

The questions were WAV files, not a microphone (generated with a cloud TTS beforehand, played back on the board), so every run is
repeatable.

The traps, in the order they hit me:

- **20 seconds per question for nothing.** The sherpa-onnx command-line tool spends 20.1 to 20.9 s
  creating its recognizer every time it starts, then 0.96 s decoding. My first run showed "ASR 22638 ms".
  I wrote a small daemon, `r3a_speech`, that loads the ASR and TTS models once and stays up.
- **My own app was eating the LLM's memory bandwidth.** It redrew at 60 fps forever. Dropping it to 4 Hz
  gave the tokens back.
- **4 + 2 threads on 4 cores.** LLM on 4 threads and TTS on 2 fight each other. Default is now 2 + 2.
- **Piper skips digits.** It just doesn't say them, so numbers are turned into words before TTS.
- **The network came back by itself mid-recording.** My `net_off` starts a failsafe that turns the
  network back on after 600 s, so I never leave the board offline by accident. An older session's
  failsafe saw the newer session's flag and switched Ethernet and Wi-Fi on at 12:48:16, in the middle of a
  recorded run. The flag now holds a token of the session that wrote it.

```
[  4.19 s] ASR 1285 ms (RTF giải mã 0.475): "Ai là người đầu tiên đặt chân lên mặt trắng"
TỔNG KẾT  ASR 1285 ms | token đầu 1560 ms | 4.07 tok/s (13 token) | TTS RTF 1.37 (1 câu, 2.6 s tiếng) | tiếng nói đầu 9.36 s | xong 9.36 s  (tính từ lúc câu hỏi kết thúc)
```

(The summary line is in Vietnamese: first token, tok/s, first voice 9.36 s, all counted from the end of
the question.)

## Result

- **17 recorded runs**, 16 of them with Wi-Fi and Ethernet off the whole time (12 with Qwen3-0.6B, 4 with
  Gemma-3-1B), and 1 Gemma run spoiled by the failsafe bug above.
- Median over the 12 Qwen3 runs: ASR **1009 ms**, first token **1624 ms**, **4.0 tok/s**, TTS RTF 1.45,
  first spoken word **11.8 s** after the question ends (range 6.6 to 19.2 s).
- Quality, judged by me by hand: Qwen3-0.6B gets about **4 in 10** right. It said 17×23 = 339, that a cat
  has 2 legs, and that the ROCK 3A uses a Snapdragon 660. Gemma-3-1B gets about 7 in 10 but is 2 to 3
  times slower.

## What I'd do next

11.8 s to the first word is too long for a conversation. I think most of it is the LLM: a 0.6B model at 4 tok/s
on two threads, plus TTS that runs slower than real time (RTF 1.45). The NPU could run the ASR, which would free the CPU for the LLM; I haven't tried that.
And I'd like a real microphone in the loop instead of WAV files.

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
edge_ai: true   # 2026-11-22: listed on /edge-ai/ (user «Thêm 1 page là Edge AI … gom các project có liên quan đến AI»)
edge_ai_index: 2
---

# A Vietnamese voice assistant with the network unplugged

[Back to the ROCK 3A hub]({{ '/embedded/boards/rock3a/' | relative_url }})

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

![The assistant chain on the board]({{ '/assets/images/boards/rock3a/assist_chain.png' | relative_url }})

The whole chain on the four A55s, with the medians: question WAV in, ASR in `r3a_speech` (1009 ms), `llama-server` on `127.0.0.1` with Qwen3-0.6B (first token 1624 ms, 4.0 tok/s), Piper TTS sentence by sentence (RTF 1.45), then the app on HDMI. First voice 11.8 s after the question.

## Action

Speech to text is sherpa-onnx with the 30M zipformer-vi model in int8. The thinking is `llama-server`
running Qwen3-0.6B Q4_0, bound to `127.0.0.1` only, with the tokens streamed out. Piper
(`vi_VN-25hours_single-low`) speaks one sentence at a time, as soon as the LLM has finished it. My Android
app shows the question, the answer typing in, the sentence being spoken in yellow and a timer per stage.

The questions were WAV files, not a microphone (generated with a cloud TTS beforehand, played back on the board), so every run is
repeatable.

My first run showed "ASR 22638 ms", for a 0.96 s decode. The sherpa-onnx command-line tool spends
20.1 to 20.9 s creating its recognizer every time it starts. So I wrote a small daemon, `r3a_speech`,
that loads the ASR and TTS models once and stays up.

Then I found my own app eating the LLM's memory bandwidth: it redrew at 60 fps forever. Dropping it to
4 Hz gave the tokens back. LLM on 4 threads plus TTS on 2 on a 4-core chip was also a bad idea (they fight
each other), so the default is 2 + 2 now. Piper just doesn't say digits, so numbers are turned into
words before TTS.

The silliest one: the network came back by itself mid-recording. My `net_off` starts a failsafe that
turns the network back on after 600 s, so I never leave the board offline by accident. An older
session's failsafe saw the newer session's flag and switched Ethernet and Wi-Fi on in the middle of a
recorded run. The flag now holds a token of the session that wrote it.

```
[  4.19 s] ASR 1285 ms (RTF giải mã 0.475): "Ai là người đầu tiên đặt chân lên mặt trắng"
TỔNG KẾT  ASR 1285 ms | token đầu 1560 ms | 4.07 tok/s (13 token) | TTS RTF 1.37 (1 câu, 2.6 s tiếng) | tiếng nói đầu 9.36 s | xong 9.36 s  (tính từ lúc câu hỏi kết thúc)
```

(The summary line is in Vietnamese: first token, tok/s, first voice 9.36 s, all counted from the end of
the question.)

## Result

I recorded 17 runs, 16 of them with Wi-Fi and Ethernet off the whole time (12 with Qwen3-0.6B, 4 with
Gemma-3-1B); the last Gemma run was spoiled by the failsafe bug above. Over the 12 Qwen3 runs the
medians are ASR **1009 ms**, first token **1624 ms**, **4.0 tok/s**, TTS RTF 1.45, and the first spoken
word comes **11.8 s** after the question ends (anywhere from 6.6 to 19.2 s).

Quality, judged by me by hand: Qwen3-0.6B gets about **4 in 10** right. It said 17×23 = 339, that a cat
has 2 legs, and that the ROCK 3A uses a Snapdragon 660. Gemma-3-1B gets about 7 in 10 but is 2 to 3
times slower.

![17 times 23 is 339, says Qwen3]({{ '/assets/images/boards/rock3a/assist_math.png' | relative_url }})

One of the wrong ones, as it showed on HDMI: "17 times 23 is how much?" and Qwen3-0.6B answers 339 (it's 391), first voice after 10.9 s.

![The ROCK 3A uses a Snapdragon 660, says Qwen3]({{ '/assets/images/boards/rock3a/assist_chip.png' | relative_url }})

And my favourite: asked (typed this time) which chip the ROCK 3A uses, it said a Snapdragon 660. Fast though: 4.4 tok/s, voice at 9.5 s.


## What I'd do next

11.8 s to the first word is too long for a conversation. I think most of it is the LLM: a 0.6B model at 4 tok/s
on two threads, plus TTS that runs slower than real time (RTF 1.45). The NPU could run the ASR, which would free the CPU for the LLM; I haven't tried that.
And I'd like a real microphone in the loop instead of WAV files.

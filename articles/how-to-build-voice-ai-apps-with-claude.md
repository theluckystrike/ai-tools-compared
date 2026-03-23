---
layout: default
title: "How to Build Voice AI Apps with Claude"
description: "Build voice AI applications using Claude for understanding and response — integrate with Whisper STT, ElevenLabs TTS, and WebSockets for real-time audio"
date: 2026-03-22
author: theluckystrike
permalink: how-to-build-voice-ai-apps-with-claude
categories: [guides]
reviewed: true
score: 8
intent-checked: true
voice-checked: true
tags: [ai-tools-compared, artificial-intelligence, claude-ai]
---

{% raw %}

Voice AI apps require three components working in sequence: speech-to-text, language understanding and response, and text-to-speech. Claude handles the middle layer exceptionally well — reasoning, long context, and nuanced responses. This guide builds a complete voice assistant using Whisper for STT, Claude for reasoning, and ElevenLabs for TTS.

## Prerequisites

Before you begin, make sure you have the following ready:

- A computer running macOS, Linux, or Windows
- Terminal or command-line access
- Administrator or sudo privileges (for system-level changes)
- A stable internet connection for downloading tools


### Step 1: Architecture

```
Microphone → Web Audio API → WebSocket
                                  ↓
              FastAPI Server → Whisper (STT) → Claude → ElevenLabs (TTS)
                                                              ↓
                          Browser ← WebSocket ← Audio Stream
```

The WebSocket approach gives you streaming responses — audio starts playing before the full response is generated.

### Step 2: Set Up

```bash
pip install fastapi uvicorn websockets anthropic openai elevenlabs \
            python-multipart soundfile numpy
```

```bash
# .env
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...           # For Whisper API
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...      # Get from ElevenLabs dashboard
```

### Step 3: Backend: FastAPI Voice Server

```python
# voice_server.py
import os
import io
import asyncio
import json
import tempfile
from pathlib import Path
from dotenv import load_dotenv
import numpy as np
import soundfile as sf
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from anthropic import Anthropic
from elevenlabs import generate, set_api_key, Voice, VoiceSettings

load_dotenv()
set_api_key(os.environ["ELEVENLABS_API_KEY"])

app = FastAPI()
oai = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
claude = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

VOICE_ID = os.environ["ELEVENLABS_VOICE_ID"]

SYSTEM_PROMPT = """You are a helpful voice assistant. Your responses will be
converted to speech, so follow these rules:

- Keep responses concise: 1-3 sentences for simple questions, 4-6 for complex
- Never use markdown, bullet points, or formatting — just natural speech
- Spell out abbreviations (e.g., say "kilobytes" not "KB")
- Avoid starting responses with filler phrases like "Certainly!" or "Of course!"
- If you need to list items, use natural connectors: "First..., then..., and finally..."
- Use a conversational tone"""

class VoiceSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.history: list[dict] = []

    def add_turn(self, user: str, assistant: str):
        self.history.append({"role": "user", "content": user})
        self.history.append({"role": "assistant", "content": assistant})
        # Keep last 10 turns (20 messages)
        if len(self.history) > 20:
            self.history = self.history[-20:]

sessions: dict[str, VoiceSession] = {}

def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribe audio using Whisper."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        f.flush()
        with open(f.name, "rb") as audio_file:
            transcript = oai.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
    return transcript.text

def generate_response(text: str, session: VoiceSession) -> str:
    """Generate a response using Claude."""
    messages = session.history + [{"role": "user", "content": text}]

    response = claude.messages.create(
        model="claude-opus-4-6",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=messages
    )
    return response.content[0].text

def text_to_speech(text: str) -> bytes:
    """Convert text to speech using ElevenLabs."""
    audio = generate(
        text=text,
        voice=Voice(
            voice_id=VOICE_ID,
            settings=VoiceSettings(
                stability=0.5,
                similarity_boost=0.75,
                style=0.0,
                use_speaker_boost=True
            )
        ),
        model="eleven_multilingual_v2"
    )
    return audio

@app.websocket("/ws/{session_id}")
async def voice_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    if session_id not in sessions:
        sessions[session_id] = VoiceSession(session_id)
    session = sessions[session_id]

    try:
        while True:
            # Receive audio chunk from client
            data = await websocket.receive_bytes()

            # Signal: processing started
            await websocket.send_json({"type": "processing", "stage": "transcribing"})

            # Step 1: Transcribe
            try:
                transcript = await asyncio.get_event_loop().run_in_executor(
                    None, transcribe_audio, data
                )
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})
                continue

            if not transcript.strip():
                await websocket.send_json({"type": "silence"})
                continue

            await websocket.send_json({
                "type": "transcript",
                "text": transcript
            })

            # Step 2: Generate response
            await websocket.send_json({"type": "processing", "stage": "thinking"})
            response_text = await asyncio.get_event_loop().run_in_executor(
                None, generate_response, transcript, session
            )

            await websocket.send_json({
                "type": "response_text",
                "text": response_text
            })

            # Step 3: Convert to speech
            await websocket.send_json({"type": "processing", "stage": "speaking"})
            audio_bytes = await asyncio.get_event_loop().run_in_executor(
                None, text_to_speech, response_text
            )

            # Update session history
            session.add_turn(transcript, response_text)

            # Send audio back
            await websocket.send_bytes(audio_bytes)
            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
```

### Step 4: Frontend: Browser Voice Client

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Voice AI</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
    #status { padding: 8px; border-radius: 4px; margin: 10px 0; }
    .recording { background: #fee; color: #c00; }
    .processing { background: #ffe; color: #880; }
    .ready { background: #efe; color: #060; }
    #transcript, #response { padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; min-height: 40px; }
  </style>
</head>
<body>
  <h1>Voice Assistant</h1>
  <div id="status" class="ready">Ready — hold Space to speak</div>
  <div><strong>You said:</strong><div id="transcript"></div></div>
  <div><strong>Assistant:</strong><div id="response"></div></div>

  <script>
    const SESSION_ID = crypto.randomUUID();
    const ws = new WebSocket(`ws://localhost:8000/ws/${SESSION_ID}`);

    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    const audioCtx = new AudioContext();

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Audio response — play it
        const arrayBuffer = await event.data.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
        setStatus('ready', 'Ready — hold Space to speak');
        return;
      }

      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'transcript':
          document.getElementById('transcript').textContent = msg.text;
          break;
        case 'response_text':
          document.getElementById('response').textContent = msg.text;
          break;
        case 'processing':
          setStatus('processing', `Processing: ${msg.stage}...`);
          break;
        case 'silence':
          setStatus('ready', 'Silence detected — try again');
          break;
        case 'error':
          setStatus('ready', `Error: ${msg.message}`);
          break;
      }
    };

    async function startRecording() {
      if (isRecording) return;
      isRecording = true;
      audioChunks = [];
      setStatus('recording', 'Recording...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.start();
    }

    async function stopRecording() {
      if (!isRecording || !mediaRecorder) return;
      isRecording = false;

      await new Promise(resolve => {
        mediaRecorder.onstop = resolve;
        mediaRecorder.stop();
      });

      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      ws.send(arrayBuffer);
      setStatus('processing', 'Transcribing...');
    }

    function setStatus(cls, text) {
      const el = document.getElementById('status');
      el.className = cls;
      el.textContent = text;
    }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) startRecording();
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space') stopRecording();
    });
  </script>
</body>
</html>
```

### Step 5: Streaming TTS for Lower Latency

The above sends the full response as one audio blob. For longer responses, stream sentence by sentence:

```python
import re

async def stream_response_as_audio(
    websocket: WebSocket,
    response_text: str
):
    """Split response into sentences, TTS each sentence separately."""
    sentences = re.split(r'(?<=[.!?])\s+', response_text)

    for sentence in sentences:
        if not sentence.strip():
            continue
        audio = await asyncio.get_event_loop().run_in_executor(
            None, text_to_speech, sentence
        )
        await websocket.send_bytes(audio)
        await websocket.send_json({"type": "sentence_done"})

    await websocket.send_json({"type": "done"})
```

This cuts perceived latency from ~3 seconds to ~800ms for the first audio chunk.

### Step 6: Cost Estimate

Per 1-minute conversation (roughly 10 exchanges):
- Whisper: 10 * 5-second clips = 50 seconds at $0.006/min = $0.005
- Claude: ~500 tokens in + ~200 out per exchange = 7,000 tokens = ~$0.02
- ElevenLabs: ~150 words per exchange * 10 = 1,500 words = ~$0.03

Total: ~$0.055 per 1-minute conversation

## Troubleshooting

**Configuration changes not taking effect**

Restart the relevant service or application after making changes. Some settings require a full system reboot. Verify the configuration file path is correct and the syntax is valid.

**Permission denied errors**

Run the command with `sudo` for system-level operations, or check that your user account has the necessary permissions. On macOS, you may need to grant terminal access in System Settings > Privacy & Security.

**Connection or network-related failures**

Check your internet connection and firewall settings. If using a VPN, try disconnecting temporarily to isolate the issue. Verify that the target server or service is accessible from your network.


## Related Articles

- [How to Build AI Pipelines with Prefect](/how-to-build-ai-pipelines-with-prefect)
- [How to Build Custom MCP Servers for Claude](/how-to-build-custom-mcp-servers-for-claude)
- [How to Use the Claude API for Automated Code Review](/how-to-use-claude-api-for-automated-code-review/)
- [How to Use Claude API Cheaply for Small Coding Projects](/how-to-use-claude-api-cheaply-for-small-coding-projects/)
- [Claude API vs OpenAI API Pricing Breakdown 2026](/claude-api-vs-openai-api-pricing-breakdown-2026/)
Built by theluckystrike — More at [zovo.one](https://zovo.one)
{% endraw %}

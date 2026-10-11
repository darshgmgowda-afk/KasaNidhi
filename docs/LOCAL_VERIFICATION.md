# Windows local verification — 2026-10-11

Launch from the outer workspace or `KasaNidhi-main` folder: **`npm start`**.
Web/UI/API: **http://localhost:3001**. Drishti: **127.0.0.1:8001**.
Existing services on 3000/8000 were preserved. Explicit stop: **`npm stop`**.

## Installed and configured

- Existing Node 24.21.0/npm 11.19.0; root and server npm dependencies installed.
- Isolated Python 3.13.7 virtual environment, installed from cached public
  package wheels. FastAPI 0.143.0, Uvicorn 0.54.0, OpenCV-headless 5.0.0.93,
  PyTorch 2.14.1, torchvision 0.29.1, Transformers 5.19.0 and all dependencies.
  `pip check` reports no broken requirements. Exact versions are recorded in
  `scan-service/requirements-lock-windows.txt`; npm lockfiles are present.
- Official Python 3.12.10 also installed under ignored `.local/python` as a
  fallback; it is not the active AI interpreter.
- `openai/clip-vit-base-patch32` cached under ignored `.local/huggingface` and
  successfully loaded. Cached loads are attempted before network downloads.
- Ignored `server/.env` created with empty credential fields and correct ports.
- Existing VS Code Python/Pylance and PowerShell extensions inspected;
  interpreter setting and a **Start KasaNidhi** task added.

## Results

| Check | Result |
| --- | --- |
| One-command startup | Both services start and pass health checks; scanner starts before Express. |
| Stop/restart | `npm stop` terminates the Windows process tree and releases both ports; restart succeeds. |
| Dependency/setup rerun | Setup completes again without replacing `.env`; dependencies and model verify. |
| UI | Profile form, home, chat, scanner and file-upload workflows exercised in installed headless Chrome; no uncaught JavaScript errors. |
| Token detection | Six synthetic colored objects yield all six expected categories, boxes and disposal actions through the Express proxy. |
| Real Waste AI | Actual CPU CLIP inference returns B-clip classification; annotated image, actions and saved scan appear in UI. Scanner health confirms `clip_loaded: true` after inference. Synthetic image checks do not establish waste accuracy. |
| Data APIs | Profiles, scans, corrections, disposal guidance, collector listings, prototype pickup records and impact totals pass. |
| Chat | Live Groq completion passes with the subsequently configured key. Both personas are named Swaccha Sakhi and Swaccha Mitra in UI and provider prompts. |
| Voice capture | Actual Windows-generated speech -> Groq Whisper -> live Groq assistant -> device speech playback and replay pass in Chrome. Device voice is now the default and does not call Orpheus. Optional Groq voice remains selectable; when account terms prevent it, playback falls back explicitly to device speech. Closing a recording cancels it. Physical microphone and speaker audibility still require an interactive check. |
| Camera capture | Synthetic camera preview -> frame capture -> backend -> scanner -> displayed result passes. Physical camera permission/device still needs an interactive check. |
| Invalid input | Invalid image rejected; missing Groq voice key returns explicit 503. |
| Memory reset | A stale cached profile returns to profile setup after server memory is reset. |
| Custom datasets/weights | None supplied in this archive. TACO/YOLO training scripts retained; custom segmentation cannot be validated without data/weights. No replacement detector or fake model result used. |

## Repairs

Windows SPA path conversion, server-relative environment loading, IPv4 scanner
URL, coordinated launcher with health/port checks and process-tree shutdown,
complete AI setup with checked command exit codes and pinned runtime versions,
model cache loading, plural battery guidance, expired memory-profile recovery,
and elimination of silent segmentation-classifier failure were repaired.
Existing UI design and AI feature paths were preserved.

## Remaining user actions

1. The real **`GROQ_API_KEY`** is now configured and the app restarted. Accept
   [Orpheus terms](https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english)
   in the Groq organization, then select **Groq voice** in Mitra to enable it.
   **Device voice** is the default and needs no Orpheus acceptance. Configured
   chat model: `openai/gpt-oss-20b`; STT: `whisper-large-v3-turbo`; TTS:
   `canopylabs/orpheus-v1-english`, voice `hannah`. Run
   `node scripts/verify-groq.mjs` from the project folder to verify actual calls.
   [Groq speech API reference](https://console.groq.com/docs/api-reference) and
   [Orpheus docs](https://console.groq.com/docs/text-to-speech/orpheus).
2. Open Chrome/Edge, allow camera and microphone, and check physical preview,
   speech capture and speaker playback.
3. Optional persistence: set `MONGO_URI`. Current storage is the repository's
   memory fallback; data resets on restart. Optional custom segmentation:
   provide the trained `drishti_waste_seg.pt` and rerun setup; training uses a
   Roboflow key and dataset as described in `README_SEG.md`.

The workspace is a downloaded source archive with no Git metadata, so remote
revision verification was unavailable. No commit or push was made. Secret
files, environments, Node packages, datasets, weights and local test/model
artifacts are ignored. No API key was invented or embedded in source.

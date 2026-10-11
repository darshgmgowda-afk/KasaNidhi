# Local Windows setup inventory

The downloaded folder is a source archive with no `.git` directory. No remote
revision was available to compare; setup uses the code in this archive.

## Architecture actually present

| Component | Implementation |
| --- | --- |
| UI | Plain HTML/CSS/JavaScript; `server/public/index.html` loads V3 scripts and `mitra.js`. No React/Vite build. V2 and older files are retained but not the entrypoint. |
| Web/API | Express, Node 24 installed on this machine; native fetch/FormData/Blob used for scanner and voice proxy requests. |
| Scanner | FastAPI/Uvicorn, existing Python 3.13.7, project-local virtual environment. A Python 3.12.10 installation was also prepared under ignored `.local/python` as an alternative. |
| Token detection | OpenCV HSV thresholds, contours and bounding boxes; six colored tokens, not semantic AI. |
| Real Waste AI | CPU PyTorch + Transformers, `openai/clip-vit-base-patch32`, six streams aggregated from eleven text prompts. Zero-shot classification; scores are not calibrated probabilities. |
| Segmentation | Existing YOLOv8-seg code activates only when `scan-service/weights/drishti_waste_seg.pt` exists. No such weights or training images were supplied. No generic detector was substituted. |
| Guidance data | `server/data/waste_rules.json` and `collectors.json`; these are disposal rules and prototype listings, not image-training datasets. |
| Chat | Groq `openai/gpt-oss-20b`, grounded in guidance rules, profile and latest saved scan. Existing deterministic guidance fallback works without a key. |
| Voice | Browser getUserMedia + MediaRecorder -> `/api/voice/transcribe` -> Groq `whisper-large-v3-turbo` -> `/api/chat` -> Groq `canopylabs/orpheus-v1-english`, voice `hannah` -> WAV playback. |
| Storage | Mongoose/MongoDB if configured; existing in-memory prototype storage otherwise. Browser localStorage remembers the profile ID, but server data is lost on restart. |
| Training tools | `training/download_dataset.py` uses a Roboflow TACO project; `training/train.py` trains 50 epochs and copies the resulting weights. Dataset download requires `ROBOFLOW_API_KEY`. Training is not needed for the existing CLIP path. |

The browser calls relative `/api` URLs. Express proxies images to Drishti over
loopback; direct browser-to-Python CORS is unnecessary. No separate frontend,
audio server, Firebase login, verified collection integration or GPU is required
by this runtime.

## Configuration and launch

Local ignored `server/.env` contains:

```dotenv
PORT=3001
SCAN_SERVICE_URL=http://127.0.0.1:8001
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GROQ_STT_MODEL=whisper-large-v3-turbo
GROQ_TTS_MODEL=canopylabs/orpheus-v1-english
GROQ_TTS_VOICE=hannah
MONGO_URI=
MONGO_DB=kasanidhi
```

Paste the real Groq key only in `GROQ_API_KEY` in that file. Optional persistence
requires a real `MONGO_URI`; no database account or key was invented. Restart
after editing. Provider model access and credentials must be tested with the
real account; health reports configured provider, not verified authentication.

From either workspace folder or project folder:

```powershell
npm start
```

Open http://localhost:3001 in current Chrome or Edge. Allow camera/microphone
when prompted. Windows Settings > Privacy & security must also permit camera
and microphone access for desktop apps. Physical devices, sound output and
live cloud speech cannot be certified by synthetic browser tests.

`npm run setup:win` reruns installation. Setup uses the ignored project-local
Python 3.13 installation when available, then project-local Python 3.12,
otherwise `py -3.12`. It preserves existing `.env`, checks
command exit codes, installs CLIP dependencies, and verifies the model. If
custom segmentation weights are provided later, rerun setup to install the
segmentation dependencies. Cached wheels in `.local/wheelhouse` allow offline
Python package installation on this machine. The configured VS Code task is **Start KasaNidhi**;
existing Python/Pylance and PowerShell extensions are sufficient.

Health: http://localhost:3001/api/health and http://127.0.0.1:8001/health.
The launcher waits for scanner health before starting Express, checks occupied
ports, and stops both children when interrupted or when a required service exits.
`npm stop` provides an explicit shutdown command scoped to this workspace;
it uses a local control pipe rather than killing arbitrary processes on ports.
Startup, explicit shutdown, released ports and subsequent restart were tested
with ordinary Windows permissions.

## Repeatable verification

From the project folder, with the app running:

```powershell
scan-service/.venv/Scripts/python.exe scripts/verify-local.py
```

This creates test profile/scan/pickup records and checks UI assets, scanner
proxying, all six color categories, actual CLIP inference, storage, impact,
corrections, guidance, chat and honest missing-key voice errors. Synthetic
images establish that inference runs; they do not measure waste accuracy.

After adding a real Groq key and restarting, `node scripts/verify-groq.mjs`
checks actual provider chat, WAV speech generation, transcription and the
STT -> assistant -> TTS chain. It consumes real API quota and fails if chat
uses the offline fallback.

No `.env`, virtual environment, Node packages, downloaded models, browser
artifacts or datasets belong in Git history. `.local/` and the existing ignore
rules cover these artifacts. npm lockfiles and runtime source changes are
reviewable source files.

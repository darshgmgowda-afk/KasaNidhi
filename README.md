# KasaNidhi — Waste Intelligence

KasaNidhi is the TPSYOPIANS hackathon prototype for **AI-Powered Image-Based Waste Classification**.

## Current prototype

- **KasaNidhi Drishti** — browser camera capture, controlled multi-object token demo, and experimental real-waste CLIP mode.
- **Swaccha Sakhi** — waste guidance assistant with Groq when configured and a deterministic guidance fallback.
- **My Waste / Waste Action / Impact Intelligence** — saved scans, circular-action guidance, Waste Circle concepts, Zero-Out Organic, and item-count impact tracking.
- **UI V3** — responsive light/dark interface with the Kachra is Cool hero, circular-action flow, mobile navigation, profile menu and pseudo logout.

The prototype is transparent about experimental and planned features. Mass/weight measurement, a trained waste detector, verified collector integrations and municipal-scale analytics remain roadmap items.

## Run locally

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1
npm start
```

### macOS / Linux / GitHub Codespaces

```bash
bash ./setup_mac.sh
npm run dev:mac
```

Open `http://localhost:3000`.

On the configured Windows workspace, use `npm start` from either the outer
`KasaNidhi-main-v5final` folder or this project folder. The local `.env` uses
web/API port **3001** and Drishti port **8001**, because 3000/8000 were occupied
by an existing application. Open **http://localhost:3001**. Ctrl+C stops both
services. `npm stop` also stops this workspace's services, including the Python
process tree. The launcher checks ports and waits for health before reporting ready.

Setup now installs the existing CLIP AI dependencies and downloads/verifies
`openai/clip-vit-base-patch32`. Runtime packages use an isolated virtual
environment (Python 3.13.7 on this machine); model cache lives in ignored `.local/huggingface`.

Paste `GROQ_API_KEY` into `server/.env` and restart to enable live Sakhi chat and
Mitra voice. Voice uses Groq Whisper STT and Orpheus TTS, not local speech
packages. `MONGO_URI` is optional; without it, saved data resets on restart.
See [the local setup inventory](docs/LOCAL_WINDOWS.md) for details and checks.

## Services

- Express web/API server: port `3000`
- FastAPI Drishti scan service: port `8000`
- MongoDB Atlas when configured; in-memory fallback otherwise
- Groq when configured; deterministic Sakhi fallback otherwise

## Demo note

Colour Token mode is a controlled computer-vision demonstration and is **not** semantic waste AI. Real Waste AI is experimental zero-shot CLIP classification. Human correction is stored for review and is not claimed as instant retraining.

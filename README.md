# KasaNidhi — Waste Intelligence

KasaNidhi is the TPSYOPIANS hackathon prototype for **AI-Powered Image-Based Waste Classification**.

## Current prototype

- **KasaNidhi Drishti** — browser camera capture, controlled multi-object token demo, and experimental real-waste CLIP mode.
- **Swacha Sakhi** — waste guidance assistant with Groq when configured and a deterministic guidance fallback.
- **My Waste / Waste Action / Impact Intelligence** — saved scans, circular-action guidance, Waste Circle concepts, Zero-Out Organic, and item-count impact tracking.
- **UI V3** — responsive light/dark interface with the Kachra is Cool hero, circular-action flow, mobile navigation, profile menu and pseudo logout.

The prototype is transparent about experimental and planned features. Mass/weight measurement, a trained waste detector, verified collector integrations and municipal-scale analytics remain roadmap items.

## Run locally

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1
npm run dev:win
```

### macOS / Linux / GitHub Codespaces

```bash
bash ./setup_mac.sh
npm run dev:mac
```

Open `http://localhost:3000`.

## Services

- Express web/API server: port `3000`
- FastAPI Drishti scan service: port `8000`
- MongoDB Atlas when configured; in-memory fallback otherwise
- Groq when configured; deterministic Sakhi fallback otherwise

## Demo note

Colour Token mode is a controlled computer-vision demonstration and is **not** semantic waste AI. Real Waste AI is experimental zero-shot CLIP classification. Human correction is stored for review and is not claimed as instant retraining.

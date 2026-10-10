# KasaNidhi — Hackathon Prototype

KasaNidhi is an AI-powered waste intelligence prototype for **Code Breaker Challenge 2.0 — Problem Statement 45: AI-Powered Image-Based Waste Classification**.

## Protected demo flow

**Profile → Drishti phone scan → multi-object segregation / AI classification → confidence → guidance → correction → action routing → save → Impact dashboard → Swacha Sakhi**

## Working prototype

- Mobile-responsive KasaNidhi web app served by Express.
- Individual / Organization profile + environment + area.
- **Drishti Mode A:** OpenCV HSV multi-object detection for six coloured physical waste tokens.
- **Drishti Mode B:** optional CLIP zero-shot classification for one real waste item.
- Six waste streams: Organic, Recyclable, Hazardous, E-Waste, Biomedical, General.
- Confidence display, uncertainty handling, profile-aware deterministic guidance and human correction.
- My Waste scan history / prototype Waste Passport.
- Waste Action: Zero-Out Organic calculator, Waste Circle concept and demo specialized collection routing.
- Impact Intelligence generated from saved scans.
- Swacha Sakhi: Groq when configured; safe deterministic guidance fallback when not configured.
- MongoDB Atlas persistence when configured; in-memory fallback when Atlas is unavailable.

## Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1
npm run dev:win
```

Open `http://localhost:3000`.

## macOS / Linux

```bash
bash setup_mac.sh
npm run dev:mac
```

## Phone demo token mapping

Green → Organic · Blue → Recyclable · Red → Hazardous · Yellow → E-Waste · Purple → Biomedical · Orange → General.

Use saturated paper balls/tokens, good lighting and a plain background. Colour Token mode is explicitly a controlled physical-token demonstration, **not semantic AI waste recognition**.

## Optional Real Waste AI

Install `scan-service/requirements-ai.txt` to enable CLIP. It is a whole-image zero-shot classifier in this prototype, not a production multi-object detector.

## Secrets

Copy `server/.env.example` to `server/.env`. `MONGO_URI` and `GROQ_API_KEY` are optional for first boot because the app has safe demo fallbacks. Never commit `server/.env` or credentials.

## Prototype vs production

This repository optimizes for a reliable hackathon demo. The proposed scalable production architecture remains separate: **Next.js/React + FastAPI + Firebase Authentication + MongoDB Atlas + independently scalable AI inference + Cloud Run/Vercel + stronger custom/open-vocabulary vision models**.

## Demo honesty

Demo collector records are not verified partnerships. Corrections are saved for review and do not retrain the model instantly. The dashboard uses live prototype counts rather than fabricated city statistics. A single RGB image is not claimed to provide verified mass or dimensions.

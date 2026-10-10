# KasaNidhi Hackathon Team Workflow

## Prototype architecture

```text
PHONE / LAPTOP BROWSER
        │
        ▼
Express web app + API (:3000)
   │        │        │
   │        │        └── Swacha Sakhi → Groq if configured / safe rules fallback
   │        └─────────── MongoDB Atlas if configured / memory fallback
   ▼
Drishti Python service (:8000)
   ├── Mode A: OpenCV colour-token multi-object detection
   └── Mode B: optional CLIP real-waste zero-shot classification
```

## Protected demo sequence

1. Create Individual/Organization profile + environment.
2. Open Drishti and photograph six coloured waste tokens.
3. Show bounding boxes, stream mapping and confidence.
4. Open disposal guidance and correct one result.
5. Save the scan and show it in My Waste.
6. Show Zero-Out Organic / specialized collection in Waste Action.
7. Ask Swacha Sakhi a profile-aware question.
8. Open Impact and show the live scan updated metrics.

Token mapping: Green Organic; Blue Recyclable; Red Hazardous; Yellow E-Waste; Purple Biomedical; Orange General.

Windows: `powershell -ExecutionPolicy Bypass -File .\setup_windows.ps1` then `npm run dev:win`.

macOS/Linux: `bash setup_mac.sh` then `npm run dev:mac`.

Open `http://localhost:3000`.

Secrets are optional for first boot. Never commit `server/.env`. Without MongoDB the demo uses memory storage; without Groq, Swacha Sakhi uses deterministic safe guidance. The production architecture remains separate and uses proper authentication/RBAC and independently scalable services.

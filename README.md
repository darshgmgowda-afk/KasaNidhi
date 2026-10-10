# KasaNidhi

**AI-powered waste intelligence and segregation prototype** for Code Breaker Challenge 2.0 (Team CBC 115, AI/ML).

KasaNidhi combines **Drishti** (camera-based waste identification and segregation), deterministic waste guidance, profile-aware recommendations, impact metrics, and **Swacha Sakhi** (AI waste assistant).

## Hackathon prototype flow

1. Demo sign-in
2. Create an Individual or Organization profile
3. Open Drishti on a phone or laptop
4. Capture/upload a scene containing colour-coded waste tokens
5. Detect multiple objects and segregate them into waste streams
6. Show confidence and category-specific guidance
7. Allow human correction
8. Record the scan and update impact metrics
9. Ask Swacha Sakhi for waste-management guidance

## Prototype stack

- Python + Streamlit
- OpenCV + NumPy for the controlled multi-object Drishti demo
- MongoDB Atlas (optional persistence; app also runs in local demo mode)
- Plotly for impact charts
- Botpress Webchat for Swacha Sakhi integration

## Production architecture

The production design evolves to Next.js/React + FastAPI + MongoDB Atlas + secure authentication/RBAC + independently scalable vision inference and chatbot services.

## Local run

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
streamlit run streamlit_app.py
```

The app works without credentials in demo mode. Optional MongoDB/Botpress integration can be configured later using Streamlit secrets; never commit secrets to GitHub.

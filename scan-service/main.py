import base64,io
import cv2,numpy as np
from fastapi import FastAPI,File,HTTPException,UploadFile
from PIL import Image,ImageOps
import drishti_color
app=FastAPI(title="KasaNidhi Drishti scan service")
def _read(data):
 try:return ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
 except Exception:raise HTTPException(400,"Not a valid image")
def _jpeg(rgb):
 ok,buf=cv2.imencode(".jpg",cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,85]);return "data:image/jpeg;base64,"+base64.b64encode(buf.tobytes()).decode()
@app.get("/health")
def health():return {"ok":True}
@app.post("/scan")
async def scan(image:UploadFile=File(...),min_area:float=.002,sat_min:int=0):
 img=_read(await image.read());annotated,dets=drishti_color.detect(np.array(img),min_area,sat_min)
 return {"mode":"A-color","annotated":_jpeg(annotated),"confidence_note":"Token confidence is a contour-quality heuristic, not a calibrated AI probability.","items":[{"object":d["label"],"category":d["category"],"confidence":round(d["confidence"],3),"uncertain":False,"bbox":[int(v) for v in d["bbox"]]} for d in dets]}
@app.post("/scan-ai")
async def scan_ai(image:UploadFile=File(...)):
 try:import drishti_clip
 except ImportError:raise HTTPException(501,"AI libraries not installed: pip install -r requirements-ai.txt")
 img=_read(await image.read());r=drishti_clip.classify(img);uncertain=r["confidence"]<.45
 return {"mode":"B-clip","annotated":_jpeg(np.array(img)),"confidence_note":"CLIP zero-shot score is a relative model score, not a calibrated probability.","items":[{"object":r["label"].capitalize(),"category":r["category"],"confidence":round(r["confidence"],3),"uncertain":uncertain,"alternatives":[{"category":c,"score":round(p,3)} for c,p in r["ranked"][1:3]]}]}

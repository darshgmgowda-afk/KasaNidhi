"""Drishti segmenter: YOLOv8-seg trained on TACO (single class 'waste') finds each waste item;
each cropped item is then assigned one of the six KasaNidhi streams (CLIP if installed)."""
from functools import lru_cache
from pathlib import Path
import cv2, numpy as np
from PIL import Image

WEIGHTS = Path(__file__).parent / "weights" / "drishti_waste_seg.pt"
DRAW_RGB = {"Organic":(46,160,67),"Recyclable":(30,90,220),"Hazardous":(220,30,30),"E-Waste":(230,190,0),"Biomedical":(140,60,190),"General":(240,130,20)}

def available(): return WEIGHTS.exists()

@lru_cache(maxsize=1)
def _model():
    from ultralytics import YOLO
    return YOLO(str(WEIGHTS))

def _classify(crop):
    import drishti_clip
    r = drishti_clip.classify(Image.fromarray(crop)); return r["category"], r["confidence"], r["label"]

def detect(rgb, conf=0.25, max_objects=10):
    res = _model().predict(rgb, conf=conf, imgsz=640, verbose=False)[0]
    out = rgb.copy(); items = []
    if res.boxes is None or len(res.boxes) == 0: return out, items
    H, W = rgb.shape[:2]
    order = np.argsort(-res.boxes.conf.cpu().numpy())[:max_objects]
    for rank, i in enumerate(order, 1):
        x1, y1, x2, y2 = [int(v) for v in res.boxes.xyxy[i].cpu().numpy()]
        det_conf = float(res.boxes.conf[i])
        crop = rgb[max(0,y1):min(H,y2), max(0,x1):min(W,x2)]
        if crop.size == 0: continue
        cat, cls_conf, label = _classify(crop)
        col = DRAW_RGB[cat]
        if res.masks is not None:
            poly = res.masks.xy[i].astype(np.int32)
            overlay = out.copy(); cv2.fillPoly(overlay, [poly], col); out = cv2.addWeighted(overlay, .35, out, .65, 0)
            cv2.polylines(out, [poly], True, col, 2)
        cv2.rectangle(out, (x1,y1), (x2,y2), col, 2)
        cv2.putText(out, f"{rank} {cat}", (x1, max(18,y1-8)), cv2.FONT_HERSHEY_SIMPLEX, .7, col, 2)
        items.append({"object": f"Object {rank} ({label})", "category": cat,
                      "confidence": round(det_conf * (cls_conf if cls_conf else 0.5), 3),
                      "uncertain": cls_conf < .45, "bbox": [x1, y1, x2-x1, y2-y1]})
    return out, items

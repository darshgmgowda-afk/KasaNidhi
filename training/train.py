"""Train the Drishti waste segmenter (YOLOv8-seg). Output: scan-service/weights/drishti_waste_seg.pt"""
import shutil, sys
from pathlib import Path
from ultralytics import YOLO

here = Path(__file__).parent
yaml = next((here / "data").glob("**/data.yaml"), None)
if not yaml: sys.exit("Run training/download_dataset.py first.")

model = YOLO("yolov8s-seg.pt")
model.train(data=str(yaml), epochs=50, imgsz=640, batch=16, project=str(here / "runs"), name="waste_seg", exist_ok=True)

best = here / "runs" / "waste_seg" / "weights" / "best.pt"
dest = here.parent / "scan-service" / "weights"; dest.mkdir(exist_ok=True)
shutil.copy(best, dest / "drishti_waste_seg.pt")
print("Saved ->", dest / "drishti_waste_seg.pt")

"""Download TACO (instance segmentation, COCO polygons) from Roboflow and collapse to ONE class: waste.
Usage:
  export ROBOFLOW_API_KEY=xxxx
  python training/download_dataset.py
"""
import glob, os, re, sys
from pathlib import Path

WORKSPACE = "ftpaligemmabackup"
PROJECT = "taco-trash-annotations-in-context-n8rj1"
VERSION = int(os.getenv("ROBOFLOW_VERSION", "1"))
OUT = Path(__file__).parent / "data"

key = os.getenv("ROBOFLOW_API_KEY")
if not key:
    sys.exit("Set ROBOFLOW_API_KEY first.")

from roboflow import Roboflow
ds = Roboflow(api_key=key).workspace(WORKSPACE).project(PROJECT).version(VERSION).download("yolov8", location=str(OUT / "taco"))
root = Path(ds.location)

n = 0
for f in glob.glob(str(root / "**" / "labels" / "*.txt"), recursive=True):
    lines = [re.sub(r"^\d+", "0", l) for l in Path(f).read_text().splitlines() if l.strip()]
    Path(f).write_text("\n".join(lines)); n += 1

yaml = root / "data.yaml"
txt = yaml.read_text()
txt = re.sub(r"^nc:.*$", "nc: 1", txt, flags=re.M)
txt = re.sub(r"^names:.*$", "names: ['waste']", txt, flags=re.M)
yaml.write_text(txt)
print(f"Done. Rewrote {n} label files. Dataset at: {root}\nNext: python training/train.py")

"""Download and verify the model used by the existing Real Waste AI path."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scan-service'))
import drishti_clip
drishti_clip._load()
import drishti_seg
if drishti_seg.available():
    drishti_seg._model()
    print('Custom waste segmentation weights loaded.')
else:
    print('No custom segmentation weights present; existing CLIP-only mode is active.')
print(f'CLIP ready: {drishti_clip.MODEL_ID}')

# Drishti segmentation kit

Adds a trained "find only waste" segmenter to KasaNidhi's Real Waste AI mode.

Pipeline: YOLOv8-seg (TACO, single class `waste`) → mask per item → CLIP assigns one of the six KasaNidhi streams.

If `scan-service/weights/drishti_waste_seg.pt` is missing, Real Waste AI falls back to the original CLIP-only behaviour.

## Install AI dependencies

```bash
bash ./setup_ai.sh
```

## Download and train

```bash
export ROBOFLOW_API_KEY=your_key
scan-service/.venv/bin/python training/download_dataset.py
scan-service/.venv/bin/python training/train.py
```

GPU is strongly recommended for training. The resulting file is `scan-service/weights/drishti_waste_seg.pt`.

Do not commit the downloaded dataset or `.pt` weights to normal Git history.

Dataset: TACO, Proenca & Simoes 2020, CC BY 4.0; arXiv:2003.06975.

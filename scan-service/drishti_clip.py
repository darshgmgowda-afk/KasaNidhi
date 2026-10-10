"""Zero-shot semantic classification of one real waste photo using CLIP (no custom training)."""
from functools import lru_cache
import torch
MODEL_ID="openai/clip-vit-base-patch32"
CANDIDATES=[("organic food waste","Organic"),("a banana peel or fruit and vegetable scraps","Organic"),("plastic recyclable waste","Recyclable"),("paper or cardboard recyclable waste","Recyclable"),("glass recyclable waste","Recyclable"),("metal recyclable waste","Recyclable"),("electronic waste","E-Waste"),("battery or hazardous waste","Hazardous"),("a light bulb","Hazardous"),("biomedical waste","Biomedical"),("general non-recyclable waste","General")]
@lru_cache(maxsize=1)
def _load():
 from transformers import CLIPModel,CLIPProcessor
 return CLIPModel.from_pretrained(MODEL_ID).eval(),CLIPProcessor.from_pretrained(MODEL_ID)
def classify(image):
 model,proc=_load();texts=[f"a photo of {d}" for d,_ in CANDIDATES];inputs=proc(text=texts,images=image.convert("RGB"),return_tensors="pt",padding=True)
 with torch.no_grad(): probs=model(**inputs).logits_per_image.softmax(dim=1)[0].tolist()
 per={}
 for (_,cat),p in zip(CANDIDATES,probs): per[cat]=per.get(cat,0.)+p
 best=max(per,key=per.get);idx=max((i for i,(_,c) in enumerate(CANDIDATES) if c==best),key=lambda i:probs[i])
 return {"category":best,"confidence":per[best],"label":CANDIDATES[idx][0],"ranked":sorted(per.items(),key=lambda kv:kv[1],reverse=True)}

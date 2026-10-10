"""Controlled multi-object demo: HSV colour thresholds -> contours -> bounding boxes. This does not semantically understand waste."""
import cv2
import numpy as np
HSV_RANGES={"Organic":[((40,80,50),(85,255,255))],"Recyclable":[((95,100,50),(130,255,255))],"Hazardous":[((0,120,70),(8,255,255)),((172,120,70),(179,255,255))],"E-Waste":[((20,100,100),(35,255,255))],"Biomedical":[((130,60,50),(160,255,255))],"General":[((9,120,100),(19,255,255))]}
COLOR_NAMES={"Organic":"green","Recyclable":"blue","Hazardous":"red","E-Waste":"yellow","Biomedical":"purple","General":"orange"}
DRAW_RGB={"Organic":(46,160,67),"Recyclable":(30,90,220),"Hazardous":(220,30,30),"E-Waste":(230,190,0),"Biomedical":(140,60,190),"General":(240,130,20)}
def detect(rgb,min_area_frac=.002,sat_min=0,max_objects=10):
 h0,w0=rgb.shape[:2];scale=min(1.,800/max(w0,h0));img=cv2.resize(rgb,(int(w0*scale),int(h0*scale))) if scale<1 else rgb.copy();hsv=cv2.cvtColor(cv2.GaussianBlur(img,(5,5),0),cv2.COLOR_RGB2HSV);H,W=img.shape[:2];kernel=np.ones((5,5),np.uint8);cands=[]
 for cat,ranges in HSV_RANGES.items():
  mask=np.zeros((H,W),np.uint8)
  for lo,hi in ranges: mask|=cv2.inRange(hsv,np.array((lo[0],max(lo[1],sat_min),lo[2])),np.array(hi))
  mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,kernel);mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,kernel);cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
  for c in cnts:
   area=cv2.contourArea(c)
   if area<min_area_frac*H*W: continue
   x,y,w,h=cv2.boundingRect(c);extent=area/float(w*h);cands.append({"category":cat,"bbox":(x,y,w,h),"area":area,"confidence":float(min(.99,.55+.45*extent))})
 cands.sort(key=lambda d:d["area"],reverse=True);kept=[]
 for d in cands:
  cx,cy=d["bbox"][0]+d["bbox"][2]/2,d["bbox"][1]+d["bbox"][3]/2
  if any(k["bbox"][0]<=cx<=k["bbox"][0]+k["bbox"][2] and k["bbox"][1]<=cy<=k["bbox"][1]+k["bbox"][3] for k in kept): continue
  kept.append(d)
  if len(kept)>=max_objects: break
 kept.sort(key=lambda d:(round(d["bbox"][1]/(H/4)),d["bbox"][0]));out=img.copy()
 for i,d in enumerate(kept,1):
  x,y,w,h=d["bbox"];d["color"]=COLOR_NAMES[d["category"]];d["label"]=f"Object {i} ({d['color']} token)";col=DRAW_RGB[d["category"]];cv2.rectangle(out,(x,y),(x+w,y+h),col,3);cv2.putText(out,f"{i} {d['category']}",(x,max(18,y-8)),cv2.FONT_HERSHEY_SIMPLEX,.7,col,2)
 return out,kept

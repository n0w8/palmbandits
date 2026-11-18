import numpy as np, cv2, sys
from PIL import Image
R=r"C:\Users\Mike\.claude\GTA 6 Community\merch\nordwald\hase-a-raw.png"
OLD=r"C:\Users\Mike\.claude\GTA 6 Community\merch\nordwald\druck-hasenkopf.png"
OUT=sys.argv[1]
r=np.array(Image.open(R).convert('RGB')).astype(np.float32)
H,W=3369,2353; ox,oy=881,288
rgb=r[oy:oy+H,ox:ox+W].copy()
A_old=np.array(Image.open(OLD))[...,3].astype(np.float32)
L=rgb.max(-1)
rule=lambda v: np.clip((v-20)/45,0,1)*255
d=np.abs(rule(L)-A_old); print('alpha rule check: mean abs diff',d.mean().round(2),'p99',np.percentile(d,99))
def ss(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
# silhouette: L>20, close, fill holes
m=(L>20).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(61,61)))
pad=cv2.copyMakeBorder(m,2,2,2,2,cv2.BORDER_CONSTANT,0)
ff=pad.copy(); mask=np.zeros((pad.shape[0]+2,pad.shape[1]+2),np.uint8)
cv2.floodFill(ff,mask,(0,0),128)
sil=(ff[2:-2,2:-2]!=128).astype(np.float32)
sil=cv2.GaussianBlur(sil,(0,0),6)
yy=np.arange(H,dtype=np.float32)[:,None]
w=ss(2880,2980,yy)*sil
# Mund aussparen: dunkle Flaeche (L<20) im Mundbereich, verbunden, aufgeweitet
dark=((L<20)&(sil>0.5)).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(dark,8)
mouth=np.zeros_like(dark)
for i in range(1,n):
    x,y,ww,hh,area=st[i]
    if area>20000 and y>2400 and y<3100: mouth[lab==i]=1
print('mouth px',mouth.sum())
mouth=cv2.dilate(mouth,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(51,51))).astype(np.float32)
mouth=cv2.GaussianBlur(mouth,(0,0),8)
w=w*(1-mouth)
lift=45*ss(20,36,L)*(1-ss(70,150,L))
Ln=L+w*lift
scale=np.where(L>0,Ln/np.maximum(L,1e-3),1)
rgb2=rgb*scale[...,None]
# angehobene Partie leicht entsaettigen (Rot-/Magenta-Flecken daempfen)
gain=np.clip((Ln-L)/40,0,1)[...,None]
lum0=rgb2.mean(-1,keepdims=True)
rgb2=rgb2*(1-0.4*gain)+lum0*np.array([1.04,0.98,0.97])*(0.4*gain)
# teal rim light -> neutral
lum=rgb2.mean(-1,keepdims=True)
teal=np.clip((np.minimum(rgb2[...,1],rgb2[...,2])-rgb2[...,0]-2)/14,0,1)[...,None]
rgb2=rgb2*(1-teal)+lum*np.array([1.03,0.98,0.97])*teal
rgb2=np.clip(rgb2,0,255)
A=np.maximum(A_old, rule(rgb2.max(-1))*(w>0.01))
# report
for n,(x0,y0,x1,y1) in {'kinn':(222,2903,2062,3341),'oberlippe':(693,2689,1708,2924)}.items():
    a=A[y0:y1,x0:x1]; ao=A_old[y0:y1,x0:x1]
    print(n,'semi vorher',((ao>0)&(ao<230)).sum(),'nachher',((a>0)&(a<230)).sum(),'alpha mean vorher',ao[ao>0].mean().round(0),'nachher',a[a>0].mean().round(0))
print('teal px changed',(teal[...,0]>0.05).sum())
B=40
out=np.zeros((H+2*B,W+2*B,4),np.uint8)
out[B:B+H,B:B+W,:3]=np.round(rgb2).astype(np.uint8)
out[B:B+H,B:B+W,3]=np.round(A).astype(np.uint8)
out[...,:3][out[...,3]==0]=0
Image.fromarray(out,'RGBA').save(OUT,optimize=True)
# previews
def comp(p):
    im=Image.open(p).convert('RGBA'); bg=Image.new('RGBA',im.size,(11,11,13,255)); return Image.alpha_composite(bg,im).convert('RGB')
a=comp(OLD); b=comp(OUT).crop((B,B,B+W,B+H))
both=Image.new('RGB',(2*W+20,H),(255,0,255)); both.paste(a,(0,0)); both.paste(b,(W+20,0))
both.resize(((2*W+20)//3,H//3),Image.LANCZOS).save('vergleich-gesamt.jpg',quality=90)
ca=a.crop((150,2600,2250,3369)); cb=b.crop((150,2600,2250,3369))
k=Image.new('RGB',(2100,769*2+20),(255,0,255)); k.paste(ca,(0,0)); k.paste(cb,(0,789)); k.resize((1050,(769*2+20)//2),Image.LANCZOS).save('vergleich-kinn.jpg',quality=92)
ea=a.crop((1500,700,2353,1400)); eb=b.crop((1500,700,2353,1400))
e=Image.new('RGB',(853*2+20,700),(255,0,255)); e.paste(ea,(0,0)); e.paste(eb,(873,0)); e.save('vergleich-ohr.jpg',quality=92)
import os; print('size KB',os.path.getsize(OUT)//1024)

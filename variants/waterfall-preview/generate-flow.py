#!/usr/bin/env python3
"""Derive tier velocity, landing foam and looping detail for the approved image.
Opaque flow RGB encodes signed image-pixels/second (+256 max) in RG and local
phase in B. Landing foam goes in matte B. Do not put data in transparent PNG
pixels: browser premultiplication can discard their velocity channels.
Noise is a repeatable POT texture, not new photographic detail.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent / 'assets'
image = Image.open(root/'waterfall.webp')
w,h = image.size
rows,cols = np.mgrid[:h,:w]
x,y = cols/w,rows/h
# Follow visible cascades: nearly vertical high falls, left-sloping rock shelves,
# then accelerating foreground streams. Direction changes are spatial, not time
# oscillations. Speed variation forms separate neighbouring streams.
def smooth(edge0,edge1,value):
    t=np.clip((value-edge0)/(edge1-edge0),0,1)
    return t*t*(3-2*t)
s1,s2,s3=smooth(.25,.29,y),smooth(.38,.42,y),smooth(.48,.52,y)
foreground=-.59+.24*smooth(.58,.64,x)
dx=-.13-.06*s1-.38*s2+(foreground+.57)*s3
dy = np.sqrt(1-dx*dx)
speed = (48+28*s1+20*s2+29*s3)*(1+.13*np.sin(cols*.051)+.045*np.sin(cols*.13))
vx,vy = dx*speed,dy*speed
phase = .13+.24*s1+.24*s2+.22*s3+.015*np.sin(cols*.035)
# Landing points are broad envelopes intersected with the photograph's water
# matte by the shader: these ellipses cannot turn rock or forest into foam.
foam = np.zeros((h,w),dtype=np.float32)
for cx,cy,rx,ry in [(.752,.181,.045,.011),(.769,.247,.052,.01),(.730,.391,.06,.012),(.769,.478,.07,.014),(.545,.715,.065,.025),(.659,.793,.087,.023)]:
    foam = np.maximum(foam,np.exp(-2*((x-cx)/rx)**2-2*((y-cy)/ry)**2))
field=np.stack((vx/512+.5,vy/512+.5,phase),axis=2)
Image.fromarray((np.clip(field,0,1)*255).astype(np.uint8)).save(root/'tier-flow.png')
matte_image=Image.open(root/'water-matte.png').convert('RGB')
red,green,_=matte_image.split()
foam_contour=foam*np.asarray(red,dtype=np.float32)/255
blue=Image.fromarray((np.clip(foam_contour,0,1)*255).astype(np.uint8))
Image.merge('RGB',(red,green,blue)).save(root/'water-matte.png')

rng=np.random.default_rng(54)
def layer(sw,sh,blur: float=0.0):
    raw=rng.uniform(0,255,(sh,sw)).astype(np.uint8)
    im=Image.fromarray(raw).resize((512,512),Image.Resampling.BICUBIC)
    if blur:im=im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im,dtype=np.float32)
# Narrow, irregular stream texture elongated along the flow, plus local foam.
stream=.64*layer(192,48,.45)+.36*layer(64,20,.65)
turbulence=.55*layer(128,64,.4)+.45*layer(32,24,.8)
foam_noise=layer(224,192,.45)
Image.fromarray(np.stack((stream,turbulence,foam_noise),axis=2).astype(np.uint8)).save(root/'water-detail.png')
matte=np.asarray(Image.open(root/'water-matte.png'))
water=matte[:,:,0]>150
print('Flow: all falling-water vectors downward:',bool(np.all(vy[water]>0)))
print('Tier speed range:',float(speed[water].min()),float(speed[water].max()),'image pixels/second')
print('Water-only landing foam pixels:',int(np.sum(water&(foam>.25))))

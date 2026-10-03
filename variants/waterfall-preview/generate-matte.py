#!/usr/bin/env python3
"""Generate an image-derived water matte, not geometric water cut-outs.
The broad ROIs exclude unrelated highlights. Pixel colour gives every contour.
Red = falling water; green = pool. This is a preview approximation.
Requires Pillow and NumPy only when regenerating; normal build uses stdlib.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).resolve().parent / 'assets'
image = Image.open(root / 'waterfall.webp').convert('RGB')
a = np.asarray(image, dtype=np.float32)
h, w = a.shape[:2]
y, x = np.mgrid[:h, :w]
x, y = x / w, y / h
ranges = [(.71,.81,.055,.185),(.725,.845,.18,.27),(.665,.83,.295,.4),(.665,.91,.40,.49),(.515,.81,.49,.70),(.485,.795,.64,.835)]
region = np.zeros((h,w),dtype=bool)
for x1,x2,y1,y2 in ranges:
    region |= (x>x1)&(x<x2)&(y>y1)&(y<y2)
minimum = a.min(axis=2)
chroma = a.max(axis=2)-minimum
brightness = np.clip((minimum-145)/65,0,1)
neutrality = np.clip((65-chroma)/45,0,1)
water = brightness*neutrality*region
water_img = Image.fromarray((water*255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.4))
# Pool segmentation follows the actual green/blue water colours; shoreline rocks are excluded.
pool = (y>.655)&(y<.97)&(x<.75)&(a[:,:,1]>a[:,:,0]*1.12)&(a[:,:,2]>a[:,:,0]*1.1)&(a[:,:,1]>45)
pool_img = Image.fromarray((pool*255).astype('uint8')).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2))
Image.merge('RGB',(water_img,pool_img,Image.new('L',image.size))).save(root/'water-matte.png')
print('Image-derived matte', image.size, 'water pixels', int(np.sum(np.asarray(water_img)>128)), 'pool pixels', int(np.sum(np.asarray(pool_img)>128)))

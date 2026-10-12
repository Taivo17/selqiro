#!/usr/bin/env python3
"""Synthetic encoded test images only; no user photos or location data.
Generation is not part of the Mac installer. Pillow is not a runtime dependency.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageCms, PngImagePlugin
from PIL.TiffImagePlugin import IFDRational
import json
root = Path(__file__).resolve().parent
im = Image.new('RGB', (96, 64))
colors = [(240, 20, 20), (20, 220, 20), (20, 20, 235), (235, 220, 20)]
for y in range(64):
    for x in range(96):
        im.putpixel((x, y), colors[(y >= 32) * 2 + (x >= 48)])
exif = Image.Exif()
exif[274] = 6
exif[271] = 'SYNTHETIC_CAMERA_NOT_A_PERSON'
exif[270] = 'SYNTHETIC_PRIVATE_DESCRIPTION'
exif[34853] = {1:'N', 2:(IFDRational(12), IFDRational(34), IFDRational(56)),
               3:'E', 4:(IFDRational(23), IFDRational(45), IFDRational(6))}
icc = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
im.save(root / 'orientation-gps.jpg', quality=98, subsampling=0, exif=exif, icc_profile=icc)
# PNG eXIf is a separate path from JPEG APP1. Text must not reach the WebP.
info = PngImagePlugin.PngInfo()
info.add_text('Location', 'SYNTHETIC_PRIVATE_LOCATION')
im.save(root / 'orientation-text.png', exif=exif, pnginfo=info, icc_profile=icc)
alpha = im.convert('RGBA')
alpha.putalpha(128)
alpha.save(root / 'alpha.png')
im.save(root / 'plain.webp', lossless=True)
im.save(root / 'still.webp', lossless=True, exif=exif, icc_profile=icc)
second = Image.new('RGB', (96, 64), (0, 0, 0))
im.save(root / 'animated.webp', save_all=True, append_images=[second], duration=100, loop=0)
im.save(root / 'animated.png', save_all=True, append_images=[second], duration=100, loop=0)
files = {}
for p in sorted(root.iterdir()):
    if p.suffix in ('.jpg', '.png', '.webp'):
        b = p.read_bytes(); files[p.name] = {'bytes':len(b), 'sha256':sha256(b).hexdigest()}
(root / 'manifest.json').write_text(json.dumps({'kind':'generated_synthetic_images_no_user_data',
    'jpeg_orientation':6,'jpeg_gps':'synthetic test coordinates', 'files':files}, indent=2)+'\n')

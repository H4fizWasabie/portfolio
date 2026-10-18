#!/bin/sh
# Rebuild the House: model and bake in Blender (the sky is a CC0 Poly Haven HDRI, fetched once into a cache), render the backdrop
# plate and the lake's ripple map, then quantize and compress with gltfpack and turn the textures into webp. Writes house.glb,
# house-light.webp, house-wet.webp, backdrop.webp and water-normal.webp (together under 2.5 MB; publish-test checks).
# Usage: BLENDER=/path/to/blender ./build-house.sh        (HOUSE_DRAFT=1 for a quick, noisy bake while iterating)
set -e
cd "$(dirname "$0")"
# kloofendal_overcast_puresky, 2k, by Greg Zaal (polyhaven.com, CC0). Used at bake time only; it is not shipped.
HOUSE_HDRI="${HOUSE_HDRI:-${XDG_CACHE_HOME:-$HOME/.cache}/portfolio-house/kloofendal_overcast_puresky_2k.hdr}"
if [ ! -f "$HOUSE_HDRI" ]; then
  mkdir -p "$(dirname "$HOUSE_HDRI")"
  curl -fL -o "$HOUSE_HDRI" https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_overcast_puresky_2k.hdr
  echo "26462123fc5ce757a331553d05e4db37  $HOUSE_HDRI" | md5sum -c -
fi
export HOUSE_HDRI
"${BLENDER:-blender}" -b --factory-startup --python build_house.py -- "$PWD/house-raw.glb" "$PWD/house-light-raw.png" "$PWD/house-wet-raw.png"
"${BLENDER:-blender}" -b --factory-startup --python build_backdrop.py -- "$PWD/backdrop-raw.png"
"${BLENDER:-blender}" -b --factory-startup --python build_water.py -- "$PWD/water-normal-raw.png"
npx --no-install gltfpack -i house-raw.glb -o house.glb -cc -kn -kv -vtf
python3 -I -c '
from PIL import Image, ImageFilter
Image.open("house-light-raw.png").convert("RGB").filter(ImageFilter.GaussianBlur(0.5)).save("house-light.webp", "WEBP", quality=88, method=6)
Image.open("house-wet-raw.png").convert("L").resize((1024, 1024), Image.LANCZOS).save("house-wet.webp", "WEBP", quality=82, method=6)
Image.open("backdrop-raw.png").convert("RGB").save("backdrop.webp", "WEBP", quality=90, method=6)
Image.open("water-normal-raw.png").convert("RGB").save("water-normal.webp", "WEBP", quality=85, method=6)'
rm house-raw.glb house-light-raw.png house-wet-raw.png backdrop-raw.png water-normal-raw.png
ls -l house.glb house-light.webp house-wet.webp backdrop.webp water-normal.webp

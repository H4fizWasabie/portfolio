#!/bin/sh
# Rebuild workshop.glb: model and bake in Blender, then quantize and compress with gltfpack.
# Usage: BLENDER=/path/to/blender ./build.sh
set -e
cd "$(dirname "$0")"
"${BLENDER:-blender}" -b --factory-startup --python build_workshop.py -- "$PWD/workshop-raw.glb"
npx --no-install gltfpack -i workshop-raw.glb -o workshop.glb -cc -kn -kv -vtf
rm workshop-raw.glb

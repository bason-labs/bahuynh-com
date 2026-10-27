#!/usr/bin/env bash
# Builds the site image for the arm64 server and pushes it to GHCR as :<short sha> and :latest.
# Needs Docker with buildx and `docker login ghcr.io`.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "build-image: the working tree has uncommitted changes; commit them first" >&2
  exit 1
fi

image=ghcr.io/bason-labs/bahuynh-com
tag=$(git rev-parse --short HEAD)

docker buildx build --platform linux/arm64 --tag "$image:$tag" --tag "$image:latest" --push .
echo "build-image: pushed $image:$tag and $image:latest"

# bahuynh.com

Ba Huynh's site. The homepage tells the BS Kara story (karaoke for the whole group); a portfolio
page comes later.

Built through VTC Lite: requirements, design and tickets live in `bason-labs/bahuynh-com-vtc`;
this repo only receives `vtc/<ticket>` branches and pull requests.

## Deploy

The site ships as a container image: `pnpm build` writes the static export to `out/`, and Caddy
serves it on port 80. Each route is served from its `index.html`, `/en` redirects to `/en/`, and
a missing path gets the 404 page. `/_next/static/*` is cached for a year; HTML is `no-cache`.

Build and push from a clean `main` (needs Docker with buildx and `docker login ghcr.io`):

```bash
scripts/build-image.sh
```

It pushes `ghcr.io/bason-labs/bahuynh-com:<short sha>` and `:latest` for linux/arm64. The server
pulls the image and puts it behind its own reverse proxy; that setup lives with the server, not here.

Try the image locally:

```bash
docker build -t bahuynh-com . && docker run --rm -p 8080:80 bahuynh-com
```

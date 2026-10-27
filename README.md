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

### Automatic build and rollout

`.github/workflows/deploy.yml` runs on every push to `main`, and can be started by hand from the
Actions tab. Job `image` builds the image on a native arm64 runner and pushes
`ghcr.io/bason-labs/bahuynh-com:<short sha>` and `:latest`, using `GITHUB_TOKEN`.

Job `deploy` runs only when the `DEPLOY_SSH_KEY` secret is set. It logs in to the server over
SSH. In `/opt/bs-kara` it pulls the new image, sets `SITE_IMAGE_TAG` in `.env` and runs
`docker compose up -d site`. It then waits up to 90 s for `https://bahuynh.com/` to serve the
site and for `/slide/` to return 200.

Set these in the repository settings (Secrets and variables, then Actions):

| Name | Kind | Value |
|---|---|---|
| `DEPLOY_SSH_KEY` | secret | private key of a deploy key for `ubuntu` on the server |
| `DEPLOY_HOST` | variable | the server's host name or IP |
| `DEPLOY_KNOWN_HOSTS` | variable | the server's `known_hosts` line(s), for example from `ssh-keyscan <host>` checked against the server |

Without the secret, the workflow still pushes the image, and the deploy job is skipped.

Try the image locally:

```bash
docker build -t bahuynh-com . && docker run --rm -p 8080:80 bahuynh-com
```

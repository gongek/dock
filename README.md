# dock

Next.js app with Turbopack for local development.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The dev server uses Turbopack (`next dev --turbopack`).

## Scripts

- `npm run dev` — start dev server with Turbopack
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint
- `npm run test:page-access` — run page access unit tests
- `npm run test:custom-domains` — run custom domain validator tests

## Custom domains (Pro+)

Customer domains are registered through **Cloudflare Custom Hostnames** (SSL for SaaS), not in the Vercel project Domains tab. Set these Convex environment variables:

- `CLOUDFLARE_API_TOKEN` — token with Custom Hostnames permission on the `dock.surf` zone
- `CLOUDFLARE_ZONE_ID` — Cloudflare zone ID for `dock.surf`

Cloudflare must have SSL for SaaS enabled with fallback origin pointing at the Vercel deployment (`dock.surf`).

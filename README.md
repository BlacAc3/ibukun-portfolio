# Ibukun Odedele — Portfolio

React + Vite + TypeScript, Tailwind v4, Framer Motion, React Three Fiber.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Editing content

All words live in `src/data/` — no layout code needs to change.

- `src/data/profile.ts` — about, skills, tools, vision, mission, contact details.
- `src/data/projects.ts` — the four projects (Clario, TBMI, One Sip, Oasis of Peace).
- `src/data/photos.ts` — which portraits appear where, and the polaroid captions.

### Adding real work samples

Each project has `media` slots that currently show "Coming soon" frames. Replace one with:

```ts
// image: put the file in src/assets/work/ and import it at the top of projects.ts
import clarioReel from '../assets/work/clario-reel.jpg?w=1200&format=webp'
{ kind: 'image', src: clarioReel, alt: 'Still from the Clario brand video', caption: 'Brand explainer, 2025' }

// video: put the file in public/videos/
{ kind: 'video', src: '/videos/clario.mp4', poster: '/videos/clario.jpg', caption: 'Brand explainer' }
```

## 3D

Three 3D moments, all built in code (no downloaded models):

- `src/three/Polaroids.tsx` — her photos as draggable floating polaroids (About).
- `src/three/Magazine.tsx` + `magazinePages.ts` — a magazine whose pages turn as you scroll (Work). Pages are drawn on canvas from `projects.ts`, so they update automatically.
- `src/three/CoffeeCup.tsx` — cup, saucer, latte art and shader steam (One Sip).

Scenes only load when scrolled near, pause when off screen, and fall back to plain images for
visitors with reduced motion turned on or no WebGL.

## Deploying

Any static host works. On Vercel or Netlify, add a rewrite of all paths to `/index.html` so
`/work/...` links load directly (`vercel.json` / `public/_redirects` are included).

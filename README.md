# OBS Tech & AI Stream Assets

A self-contained, dependency-light **OBS overlay engine** for streaming about the Web, Google Developer Expert (GDE) technologies, and AI/ML.
It serves dynamic OBS Browser Sources plus a web dashboard that controls them in real time, with a library of **100+ creative assets**: scene layouts, styling themes, animated canvas backgrounds, lower thirds, tech badges, interactive widgets, and synthesized sound effects.

> **▶ Live demo:** https://seagomezar.github.io/obs_assets/
> The demo runs the real overlays and dashboard entirely in your browser - no install, no backend.

---

## Table of contents

- [What it is](#what-it-is)
- [Live demo](#live-demo)
- [Quick start (local + OBS)](#quick-start-local--obs)
- [Commands](#commands)
- [Asset library (100+)](#asset-library-100)
- [How it works](#how-it-works)
- [Demo architecture (serverless)](#demo-architecture-serverless)
- [Project structure](#project-structure)
- [Using it with OBS](#using-it-with-obs)
- [Contributing](#contributing)
- [License](#license)

---

## What it is

Streamers who talk about tech usually stitch together a pile of paid overlay packs, browser plugins, and alert services.
This project replaces that with one small Node process you run locally:

- An **Express + WebSocket server** that holds a single source of truth (`state.json`) and pushes changes to every connected overlay in under ~50ms.
- A set of **vanilla HTML/CSS/JS overlays** (16:9 unified and 9:16 vertical) that OBS loads as Browser Sources.
- A **glassmorphic web dashboard** to switch layouts/themes/backgrounds, edit speaker cards, drive widgets, and fire alerts and synth sounds live.

No React, no Tailwind, no build step. Just `express`, `ws`, and the browser platform (Canvas + Web Audio API).

## Live demo

The [GitHub Pages demo](https://seagomezar.github.io/obs_assets/) is the whole app running **without a server**.
Because GitHub Pages is static hosting, there's no WebSocket hub - so the front end auto-detects that and falls back to a client-side shim that replicates the server's logic and syncs state across browser tabs via [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel).

In the demo you can:

- Flip through all 10 layouts, 8 themes, 6 backgrounds, and 8 lower-third styles.
- Toggle widgets, edit speaker cards, run a countdown, and update the ticker.
- Trigger alerts and play each of the 6 synthesized sounds.
- Open the **Dashboard** in one tab and an **Overlay** in another and watch them stay in sync.

The same code runs against the real WebSocket server when you start it locally - the transport swap is automatic.

## Quick start (local + OBS)

Requires Node.js 18+.

```bash
git clone https://github.com/seagomezar/obs_assets.git
cd obs_assets
npm install
npm start
```

Then open:

- **Dashboard:** http://localhost:3000/dashboard/
- **Unified overlay (16:9):** http://localhost:3000/overlays/unified.html
- **Vertical overlay (9:16):** http://localhost:3000/overlays/vertical.html

Change something in the dashboard and watch the overlay update instantly.

## Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install `express` and `ws`. |
| `npm start` | Run the server on port 3000 (`node server.js`). |
| `npm run reset` | Reset `state.json` to the default template (`node server.js --reset`). |
| `npm run demo` | Serve the static `public/` folder at http://localhost:8080 with **no** WebSocket server, exactly as GitHub Pages does - useful for previewing the serverless demo. |

## Asset library (100+)

| Category | Count | Examples |
|----------|:-----:|----------|
| **Scene layouts** | 10 | Solo, solo + chat, guest split, podcast panel, speaker + slide/code, pair programming, fireside, VS battle, Q&A queue, BRB lobby |
| **Styling themes** | 8 | Gemini Glow, GDE Neon, Matrix Terminal, Synthwave Cyber, Minimalist Frost, Dracula Dark, Pixel Hacker, Gold Corporate |
| **Canvas backgrounds** | 6 | Particle web, binary stream, perspective grid, neural nodes, fluid wave, tech bubbles (all 60fps) |
| **Lower thirds** | 8 | Slide slate, glass capsule, GDE ribbon, AI core box, CLI command line, split blade, brutalist box, tag bubble |
| **Tech badges (SVG)** | 50 | Web core, Google & frameworks, AI/ML & data, socials & streaming, general tech |
| **Interactive widgets** | 12 | Ticker, chat box, countdown, topic card, poll, code panel, social rotator, guest bio, goal bar, Q&A card, AI assist, audio visualizer |
| **Synth sound FX** | 6 | Bloop intro, cyber swoosh, glitch error, sub drop, chime bell, tech fanfare |

The full breakdown, including every layout and badge, lives in [`SPEC.md`](./SPEC.md).

## How it works

```
┌──────────────┐   WebSocket    ┌────────────────────┐   WebSocket    ┌──────────────┐
│  Dashboard   │ ─────────────▶ │  server.js         │ ─────────────▶ │  Overlays    │
│ (controller) │ ◀───────────── │  Express + ws hub  │ ◀───────────── │ (OBS sources)│
└──────────────┘   state sync   │  state.json (DB)   │   state sync   └──────────────┘
                                 └────────────────────┘
```

1. The server loads `state.json` (or the built-in default) as the single source of truth.
2. Clients connect over WebSocket and receive the current state on connect.
3. The dashboard sends actions (`UPDATE_STATE`, `TRIGGER_ALERT`, `PLAY_SOUND`, `ADD_CHAT_MESSAGE`, `VOTE_POLL`, ...).
4. The server applies each action, persists to `state.json`, and broadcasts the new snapshot to every client.
5. Overlays re-render (theme, layout, canvas background, widgets) and play synth audio on the relevant events.

## Demo architecture (serverless)

GitHub Pages can't run Node, so the front end shares one small abstraction, [`public/assets/connection.js`](./public/assets/connection.js) (`OverlayConnection`):

- It first tries a real WebSocket to `ws://<host>:3000`.
- If nothing connects (as on Pages), it falls back to a **shim** that reproduces the server's reducer in the browser, seeds state from [`public/assets/demo-state.js`](./public/assets/demo-state.js), and relays messages across tabs with `BroadcastChannel`.
- `OverlayConnection` exposes the same surface as `WebSocket` (`onopen`, `onmessage`, `send`, `readyState`, ...), so the overlay and dashboard code is identical in both modes.

Deployment is handled by [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml), which runs a smoke test (entry point exists, no root-absolute asset paths that would break under the `/obs_assets/` subpath) and then publishes `public/` on every push to `main`.

> **Keep in sync:** `demo-state.js` mirrors `DEFAULT_STATE` in `server.js`. If you change the default state on the server, update the demo state too.

## Project structure

```
obs_assets/
├── server.js                     # Express web server + WebSocket hub
├── state.json                    # Live state (local "database")
├── package.json                  # Manifest, scripts, deps (express, ws)
├── SPEC.md                       # Full system specification
├── SPEC-demo.md                  # Spec for the GitHub Pages demo + README
├── TASKS.md                      # Build task breakdown
├── .github/workflows/
│   └── deploy-pages.yml          # CI: smoke test + GitHub Pages deploy
└── public/                       # Static assets (served locally and on Pages)
    ├── index.html                # Demo landing / showcase page (Pages entry)
    ├── assets/
    │   ├── icons.js              # 50 SVG tech badges
    │   ├── synth.js              # Web Audio synth engine (6 sounds)
    │   ├── demo-state.js         # Embedded default state for the demo
    │   └── connection.js         # Transport: real WebSocket OR serverless shim
    ├── dashboard/                # Stream controller panel (HTML/CSS/JS)
    └── overlays/                 # OBS Browser Sources (unified + vertical)
```

## Using it with OBS

1. Run `npm start`.
2. In OBS, add a **Browser Source** for each overlay you want:
   - Unified (16:9): URL `http://localhost:3000/overlays/unified.html`, size `1920 × 1080`.
   - Vertical (9:16): URL `http://localhost:3000/overlays/vertical.html`, size `1080 × 1920`.
3. Open the dashboard at http://localhost:3000/dashboard/ on a second monitor.
4. Drive layouts, speakers, widgets, alerts, and sounds - the OBS sources update live.

Tip: the overlays are sized to exact OBS canvas dimensions, so leave the Browser Source at 100% scale for pixel-perfect placement.

## Contributing

- Keep it dependency-light: no new heavy runtime packages or build steps without discussion (see the boundaries in [`SPEC.md`](./SPEC.md)).
- Use relative asset paths so the site keeps working under the `/obs_assets/` Pages subpath.
- Preserve the WebSocket behavior; the demo shim is additive and must not change real OBS/local use.

## License

MIT

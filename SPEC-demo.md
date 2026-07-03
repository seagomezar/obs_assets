# Spec: GitHub Pages Live Demo + Comprehensive README

> This is a **feature spec**. It adds a browsable, serverless demo of the existing OBS assets and a project README.
> It does not replace the root [`SPEC.md`](./SPEC.md), which remains the source of truth for the local OBS server itself.

## Objective

Let anyone open a URL and **see the assets working** - the overlays, themes, backgrounds, lower thirds, icons, widgets, and synth sounds - without cloning the repo, installing Node, or running the WebSocket server.

Ship two things:

1. A **live, interactive demo on GitHub Pages**, deployed automatically by a GitHub Actions pipeline.
   The demo runs the *real* dashboard driving the *real* overlay in the browser, with no backend.
2. A **comprehensive README** that explains the project, catalogs the 100+ assets, documents local/OBS setup, and links prominently to the live demo.

### Users & success

| User | Wants | Success looks like |
|------|-------|--------------------|
| A streamer evaluating the project | To judge if the overlays look good before installing | Opens the demo, flips through themes/layouts/backgrounds, hears a synth alert - all in-browser |
| A developer browsing the repo | To understand what this is and how to run it | README answers "what/why/how" in under a minute; demo link works |
| The maintainer (you) | Zero-maintenance publishing | Push to `main`, Pages updates automatically; local OBS behavior is unchanged |

### Acceptance criteria

- [ ] `https://<user>.github.io/obs_assets/` loads a showcase landing page with a live demo, no console errors, no failed network requests.
- [ ] The demo dashboard changes (layout, theme, background, lower third, widget toggles, alerts, sounds) update the embedded overlay **live**, with no server running.
- [ ] Opening the overlay in one tab and the dashboard in another tab syncs state between them (via `BroadcastChannel`).
- [ ] Running `node server.js` locally still works **exactly as before** - overlays and dashboard connect over WebSocket to `:3000` with real persistence.
- [ ] Every asset category is reachable from the demo: 10 layouts, 8 themes, 6 backgrounds, 8 lower thirds, 50 icons, 12 widgets, 6 sounds.
- [ ] A GitHub Actions workflow deploys Pages on every push to `main` and shows a green run.
- [ ] `README.md` covers: overview, live-demo link, feature/asset catalog, local + OBS setup, project structure, demo architecture, and contributing/license.

---

## Tech Stack

No new runtime dependencies. Same stack as the base project.

- **Deploy**: GitHub Actions + GitHub Pages (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`).
- **Client sync shim**: Browser-native [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) API (cross-tab), with an in-memory fallback for single-page use.
- **Embedded state**: `public/assets/demo-state.js` - a JS copy of the default state (mirrors `DEFAULT_STATE` in `server.js`), so the demo has data with no `/api/state` fetch.
- Everything else: existing Vanilla HTML5/CSS3/JS, Web Audio, Canvas.

> **Ask-first boundary respected:** no React/Tailwind/build step. The base project's "dependency-light" rule holds - the demo adds zero npm packages.

---

## Commands

```bash
# Local (unchanged - real WebSocket server for OBS)
npm install
npm start                 # node server.js  -> http://localhost:3000
npm run reset             # node server.js --reset

# Preview the static demo exactly as GitHub Pages will serve it (no WebSocket server).
# Any static file server works; example uses Python (no new dependency):
npm run demo              # -> python3 -m http.server 8080 --directory public
                          #    then open http://localhost:8080/

# Deploy: push to main. GitHub Actions publishes Pages automatically.
git push origin main
```

A `demo` script will be added to `package.json`. It must serve the `public/` directory over plain HTTP (not `file://`) so `BroadcastChannel` and module loading behave like production.

---

## Project Structure

New and changed files (everything under `public/` continues to be the deployed root):

```
obs_assets/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml      # NEW: build-free Pages deploy on push to main
├── README.md                     # NEW: comprehensive project README
├── SPEC-demo.md                  # NEW: this spec
├── public/                       # <- published as the Pages site root
│   ├── index.html                # NEW: demo landing / showcase page (Pages entry point)
│   ├── assets/
│   │   ├── connection.js         # NEW: transport abstraction (WebSocket OR BroadcastChannel shim)
│   │   ├── demo-state.js         # NEW: embedded default state for serverless mode
│   │   ├── icons.js              # unchanged
│   │   └── synth.js              # unchanged
│   ├── dashboard/                # existing files, minimally edited to use connection.js
│   └── overlays/                 # existing files, minimally edited to use connection.js
└── server.js                     # unchanged
```

**Path rule:** GitHub Pages serves a project site under `/obs_assets/`. All asset references in HTML/JS must be **relative** (`../assets/synth.js`, `./assets/connection.js`) - never root-absolute (`/assets/...`), which would 404 under the repo subpath.

---

## Code Style

Follow the base project's style (ES6+ classes, `requestAnimationFrame`, CSS variables). The one genuinely new abstraction is the transport layer. It must present the **same interface** the current code already expects (`send`, `onmessage`, `readyState`) so existing call sites barely change.

```javascript
// public/assets/connection.js
// Auto-detecting transport: real WebSocket when a server answers, else a
// client-side BroadcastChannel shim seeded with embedded demo state.
// Presents a WebSocket-like surface so overlay/dashboard code is unchanged.
class OverlayConnection {
  constructor({ onMessage }) {
    this.onMessage = onMessage;
    this.readyState = 0;
    this._connectWebSocketOrFallback();
  }

  _connectWebSocketOrFallback() {
    // GitHub Pages is https:// with no ws server -> probe fails fast -> shim.
    const wsUrl = `ws://${location.hostname || 'localhost'}:3000`;
    try {
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => { this.mode = 'ws'; this.readyState = 1; };
      socket.onmessage = (e) => this.onMessage(JSON.parse(e.data));
      socket.onerror = () => this._useShim();   // Pages path
      this.socket = socket;
    } catch {
      this._useShim();
    }
  }

  _useShim() {
    this.mode = 'shim';
    this.channel = ('BroadcastChannel' in self)
      ? new BroadcastChannel('obs-assets-demo')
      : null;                                     // single-tab fallback
    // Seed from embedded state so the overlay has content immediately.
    queueMicrotask(() => this.onMessage({ type: 'STATE_UPDATE', state: DEMO_STATE }));
  }

  send(data) { /* ws: socket.send; shim: apply locally + channel.postMessage */ }
}
```

Conventions: 2-space indent, single quotes, `const`/`let`, no trailing whitespace, comments explain *why* not *what*. Every sentence in Markdown docs on its own line.

---

## Testing Strategy

No unit-test framework is introduced (the base project has none). Verification is behavior-based, matching the base project's manual testing approach, plus a CI smoke check.

1. **Local regression (must not break):**
   Run `npm start`, open dashboard + unified + vertical overlays. Confirm WebSocket still connects, edits persist to `state.json`, and sync latency is imperceptible - identical to pre-change behavior.

2. **Serverless demo (the new path):**
   Run `npm run demo` (no `server.js`). Open `index.html`.
   - Console shows the shim engaged, not repeated WebSocket errors.
   - Dashboard controls change the embedded overlay live.
   - Two tabs (overlay + dashboard) stay in sync via `BroadcastChannel`.
   - Each of the 6 synth sounds plays on a user gesture.

3. **Path/base-URL check:**
   Serve `public/` from a subpath (e.g. `http://localhost:8080/obs_assets/` via a symlink) to catch any root-absolute path that would break under the Pages repo prefix.

4. **CI smoke test (in the workflow, before deploy):**
   A headless check that `public/index.html` exists and that no HTML references a `/`-absolute local asset. Deploy only proceeds if it passes.

5. **Cross-browser spot check:** Chrome + Firefox for `BroadcastChannel` and Web Audio.

---

## Boundaries

- **Always:**
  - Keep `server.js` and real WebSocket behavior working unchanged - the demo is additive.
  - Use relative asset paths so the site works under the `/obs_assets/` Pages subpath.
  - Keep `demo-state.js` in sync with `DEFAULT_STATE` in `server.js` (note this coupling in the README).
  - Degrade gracefully: no server -> shim; no `BroadcastChannel` -> single-tab in-memory.

- **Ask first:**
  - Adding any npm dependency or a build/bundler step (base project is deliberately dependency-light).
  - Changing the default Pages entry point away from `public/index.html`.
  - Restructuring existing overlay/dashboard files beyond the minimal transport swap.

- **Never:**
  - Commit secrets or tokens into the workflow (use the built-in `GITHUB_TOKEN` with Pages permissions only).
  - Load demo assets from unverified external URLs (offline-safe rule from base spec).
  - Delete or rewrite the root `SPEC.md`.

---

## Success Criteria (recap, testable)

1. Live demo URL loads clean (no console/network errors) and is linked at the top of the README.
2. Demo dashboard drives the demo overlay live with **no** server; two tabs sync via `BroadcastChannel`.
3. All 100+ assets are reachable/visible from the demo.
4. `node server.js` local + OBS flow is byte-for-byte unchanged in behavior.
5. GitHub Actions deploys on push to `main` with a green run and a passing pre-deploy smoke check.
6. README comprehensively covers overview, demo link, asset catalog, local/OBS setup, structure, demo architecture, and license.

---

## Open Questions

1. **Demo landing scope:** Should `public/index.html` be a *dedicated showcase* page (hero + embedded dashboard/overlay side-by-side + asset gallery), or simply *redirect* to the existing dashboard? (Assumption: dedicated showcase - richer first impression.)
2. **Pages URL:** Confirm the repo will be public and named `obs_assets` (affects the demo URL and relative-path base). A custom domain or `user.github.io` root repo would change the base path.
3. **Vertical overlay in demo:** Include the 9:16 vertical overlay as a selectable preview alongside the 16:9 unified one? (Assumption: yes, both shown.)
4. **Attract mode:** Want an optional auto-cycling "attract mode" on the landing page that rotates themes/layouts for a hands-off preview loop? (Assumption: nice-to-have, not required for v1.)
```
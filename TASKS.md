# Task List: OBS Tech & AI Stream Assets Server

The project will be built in vertical, verifiable slices. After each task, we can run the server and test.

---

### Task 1: Project Initialization & Directory Structure
- **Description**: Initialize `package.json`, install dependencies, and create standard folders.
- **Files**:
  - `package.json`
  - `.gitignore`
- **Acceptance Criteria**:
  - NPM dependencies (`express`, `ws`) are installed.
  - Project directory structure matches the spec.
- **Verify**: `npm run` runs without errors, folders exist.

---

### Task 2: Express Server & WebSocket Sync Hub
- **Description**: Write `server.js` to serve static pages, manage state loading/saving to `state.json`, and coordinate websocket broadcast sync.
- **Files**:
  - `server.js`
  - `state.json` (Initial state)
- **Acceptance Criteria**:
  - Server starts on port 3000.
  - Express serves the `public/` directory.
  - Restoring state from `state.json` works. Running with `--reset` restores default configurations.
  - WebSockets broadcast dashboard updates to overlays.
- **Verify**: Run `node server.js` and verify port 3000 is open.

---

### Task 3: Technology SVG Badges & Icons Library (50 Assets)
- **Description**: Write `public/assets/icons.js` containing 50 scalable technology, frameworks, AI, and social SVG path graphics.
- **Files**:
  - `public/assets/icons.js`
- **Acceptance Criteria**:
  - File exports an object `TechIcons` containing exactly 50 distinct SVG paths.
  - SVGs are categorized: Web Core, Google/Frameworks, AI/ML/Data, Socials, General.
- **Verify**: Read the file size and structure to ensure all 50 keys exist.

---

### Task 4: Web Audio API Synth Engine (6 Assets)
- **Description**: Write `public/assets/synth.js` to construct and play synthesized alerts and sweeps on the fly.
- **Files**:
  - `public/assets/synth.js`
- **Acceptance Criteria**:
  - Contains methods for: `playBloop()`, `playSwoosh()`, `playGlitch()`, `playSubDrop()`, `playChime()`, `playFanfare()`.
  - Uses standard Web Audio API oscillators, filters, gain nodes, and envelopes.
- **Verify**: Ensure the class compiles and can be invoked on user interaction.

---

### Task 5: Dynamic Unified Overlay (HTML, CSS, JS)
- **Description**: Implement the OBS overlay renderer including layout boxes, visual themes, canvas-based animated backgrounds, widgets, and dynamic sound triggers.
- **Files**:
  - `public/overlays/unified.html`
  - `public/overlays/unified.css`
  - `public/overlays/unified.js`
- **Acceptance Criteria**:
  - Canvas background handles 6 different modes (Particles, Binary, perspective grid, Neural net, Fluid Wave, Bubble float).
  - CSS stylesheet defines 10 layout templates using grids, 8 styling themes via variables, and 8 lower thirds.
  - JS file hooks up WebSockets, manages overlay rendering, and plays alerts.
- **Verify**: Open `http://localhost:3000/overlays/unified.html` in browser and inspect rendering.

---

### Task 6: Modern Glassmorphic Dashboard & Stream Controller
- **Description**: Construct the stream manager panel with controls for layouts, text fields, alerts, countdown, and real-time canvas preview.
- **Files**:
  - `public/dashboard/index.html`
  - `public/dashboard/dashboard.css`
  - `public/dashboard/dashboard.js`
- **Acceptance Criteria**:
  - UI styled with premium dark glassmorphic styling (frosted panels, glowing borders).
  - Toggles for active layout, theme, background, and widgets.
  - Buttons to trigger specific Alerts (subscriber, cheer, follower, sponsor).
  - Form to update current topic, ticker headlines, and social links.
  - Iframe displaying `public/overlays/unified.html` scaled down to serve as a live preview.
- **Verify**: Open `http://localhost:3000/dashboard/index.html` and verify WebSocket bidirectional messaging by changing layout and seeing preview update instantly.

---

### Task 7: End-to-End Validation
- **Description**: Test server persistence, WebSocket synchronization lag, responsiveness of OBS views, and audio triggers.
- **Files**: All project files
- **Acceptance Criteria**:
  - All 100+ assets (10 layouts, 8 themes, 6 backgrounds, 8 lower thirds, 50 icons, 12 widgets, 6 sounds) can be mixed and matched.
  - Reconnect logic works when server is stopped and restarted.
- **Verify**: Run full server tests, check OBS compatibility.

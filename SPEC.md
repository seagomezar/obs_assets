# Spec: OBS Tech & AI Stream Assets Server

## Objective
Create a self-contained local web server that serves dynamic OBS overlays (Browser Sources) and a Web Dashboard to control them. The overlays are designed specifically for streaming about general technology, Web standards, Web Google Developer Experts (GDE) technologies, and AI/Machine Learning. It will support real-time configuration changes, layouts, animations, synthesized sound effects, and contains a library of **100+ creative assets** (layouts, color themes, lower thirds, canvas backgrounds, tech icons, alerts, widgets, and synthesized sounds).

---

## Tech Stack
- **Backend**: Node.js, Express (Web server), `ws` (WebSockets for real-time bidirectional syncing).
- **Frontend / Overlays**: Vanilla HTML5, CSS3 (variables, animations, grids, flexbox), JavaScript (ES6+, Web Audio API, HTML5 Canvas).
- **Data Persistence**: `state.json` (Local file DB containing stream configurations, social handles, current overlays, custom ticker text, and widget states).

---

## Commands
- **Install Dependencies**: `npm install`
- **Run Server**: `node server.js`
- **Clean State**: `node server.js --reset` (overwrites state with default template)

---

## Project Structure
```
obs_assets/
├── server.js              # Express web server & WebSocket hub
├── package.json           # Project manifest and dependencies
├── state.json             # Live database (JSON state of overlays)
├── SPEC.md                # System specification (this document)
└── public/                # Static assets served by Express
    ├── dashboard/         # Stream Controller Panel
    │   ├── index.html     # Control dashboard UI
    │   ├── dashboard.css  # Futuristic glassmorphism control styling
    │   └── dashboard.js   # Dashboard controls, WebSocket client
    ├── overlays/          # OBS Browser Sources
    │   ├── unified.html   # Main unified overlay layer
    │   ├── unified.css    # Responsive styles, grid layouts, themes
    │   └── unified.js     # Rendering loop, canvas background, WS integration
    └── assets/            # Static assets
        ├── icons.js       # Repository of 50 SVG path structures
        └── synth.js       # Web Audio API Synthesizer engine (for sounds)
```

---

## Code Style
### HTML & Canvas Rendering Style
We write clean, modular ES6+ JavaScript. Visual layout containers are responsive, and Canvas components use requestAnimationFrame for smooth 60fps animations.
```javascript
// Example code style: Canvas-based background renderer
class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => p.update(this.ctx));
    requestAnimationFrame(() => this.animate());
  }
}
```

---

## Testing Strategy
1. **Visual Testing**: Run the server, add overlay files as Browser Sources in OBS, check overlay styling.
2. **WebSocket Sync Validation**: Verify that pressing a button on the Web Dashboard (e.g. changing active speaker, triggering an alert, updating name cards) updates the OBS screen instantly (under 50ms latency).
3. **Audio Synthesis Verification**: Verify Web Audio API triggers clean synth tones when alerts are raised, without loading heavy mp3 files.

---

## Boundaries
- **Always**:
  - Keep layout coordinates precise for OBS resolutions (defaulting to 1920x1080 canvas sizing).
  - Use vanilla CSS variables for styling to allow hot-reloading color themes.
  - Gracefully handle WebSocket reconnects in both Dashboard and Overlays.
- **Ask First**:
  - Adding heavy external NPM packages (like React or Tailwind) - we aim to keep this extremely fast and dependency-light.
- **Never**:
  - Load media assets from insecure unverified external URLs that could break offline stream configurations.

---

## Success Criteria (100 assets details)

We will implement a library of **100+ creative assets** across seven distinct categories:

### 1. Scene Layouts (10 Assets)
These define the camera frames, sidebar placements, and chat spacing:
- **Solo Speaker**: Minimal full frame with corner accents and single camera slot.
- **Solo Speaker + Chat**: Camera view on left (large), chat bar on right.
- **Guest Split Screen (1 Host + 1 Guest)**: Balanced side-by-side frames.
- **Podcast Panel (3-4 Speakers)**: Grid layout for multiple cameras.
- **Speaker + Slide/Code**: Large presentation container on left, video on right.
- **Pair Programming**: Main workspace window, 2 stacked cameras, small chat.
- **Fireside Chat**: Centered camera bubbles with ambient divider lines.
- **VS Battle/Coding Challenge**: Side-by-side frames with Red vs Blue theme.
- **Q&A Queue**: Large video frame with rotating question sidebar.
- **Starting/BRB Lobby**: Layout with timer, scrolling news, and dynamic social icons.

### 2. Styling Themes (8 Assets)
Dynamic styles that skin the background, borders, typography, and text shadows:
- **Gemini Glow**: Cybernetic dark purple, indigo and pink gradient lines.
- **GDE Neon**: Google branding colors (Blue, Red, Yellow, Green) on dark glass panels.
- **Matrix Terminal**: Retro glowing green terminal with monospace fonts.
- **Synthwave Cyber**: Glowing cyan and magenta neon grids and text glows.
- **Minimalist Frost**: Clean white frosted-glass, dropshadows, modern typography.
- **Dracula Dark**: High-contrast, tech-standard dark mode with purple accents.
- **Pixel Hacker**: Black-and-white retro-pixel aesthetic.
- **Gold Corporate**: Dark carbon-fiber pattern with gold accents for official panels.

### 3. Dynamic Canvas Backgrounds (6 Assets)
Real-time rendered interactive backgrounds at 60fps:
- **Particle Web**: Connected dots forming floating data networks.
- **Binary Stream**: Scrolling columns of 0s and 1s fading away.
- **Perspective Grid**: Moving 3D synthwave grid lines.
- **Neural Nodes**: Pulsing cells transmitting spark signals.
- **Fluid Wave**: Flowing mathematical Bezier gradient bands.
- **Tech Bubbles**: Floating orbital spheres colored by theme.

### 4. Lower Third Styles (8 Assets)
Banners displaying speaker name, role, and details:
- **Slide Slate**: Heavy metallic slide-in blocks.
- **Glass Capsule**: Rounded frosted-glass floating card.
- **GDE Ribbon**: Ribbon header with Google-accented side flag.
- **AI Core Box**: Border-pulsing neon frame.
- **CLI Command Line**: Styled as terminal command block (e.g. `john@gde:~$`).
- **Split Blade**: Top and bottom sections slide in opposite directions.
- **Brutalist Box**: Solid primary color blocks with heavy black offset shadows.
- **Tag Bubble**: High-contrast minimalist tag.

### 5. Tech Badge Library (50 Assets)
50 scalable vector icons embedded as SVG paths. These are rendered inside lower thirds, bio cards, or alerts to specify technologies:
- **Web Core (10)**: HTML5, CSS3, JavaScript, TypeScript, WebAssembly, WebGL, ServiceWorker, PWA, Node.js, npm.
- **Google & Frameworks (10)**: Google, Angular, Firebase, Chrome, Google Cloud, Project IDX, Android, Flutter, Maps, Web Vitals.
- **AI/ML & Data (10)**: Gemini, TensorFlow, Keras, PyTorch, Neural Network, Robot, DeepMind, Brain, Sparkles, Database.
- **Socials & Streaming (10)**: GitHub, Twitter/X, LinkedIn, YouTube, Twitch, Discord, Microphone, Camera, Chat Bubble, Podcast.
- **General Tech (10)**: Server, CPU, Shield/Security, Globe, Terminal/Code, Star, Flame, Warning, Checkmark, Info.

### 6. Interactive Widgets (12 Assets)
Configurable elements that fill overlays dynamically:
- **Tech News Ticker**: Scrolling ticker strip at the bottom of the screen.
- **Animated Chat Box**: Beautiful stream chat visualization.
- **Countdown Clock**: Custom circular radial progress countdown timer.
- **Current Topic card**: Active slide/segment banner.
- **Live Poll Card**: Interactive voting graphics.
- **Code Snippet Panel**: High-contrast syntax block for displaying lines of code.
- **Social rotator**: Rotating overlay of speaker's handle channels.
- **Guest Bio Panel**: Side panel with credentials and active developer badges.
- **Goal Progress Bar**: Subscription/Milestone indicators.
- **Q&A Overlay**: Highlight card displaying the current viewer question.
- **AI Assist Response**: Chatbot window displaying AI-generated prompt answers.
- **Audio Bar Visualizer**: Equalizer spectrum reactive to audio.

### 7. Synthesized Sound FX (6 Assets)
Real-time audio clips made on the fly (Web Audio API):
- **Bloop Intro**: Upward pitch scan for alert activations.
- **Cyber swoosh**: Transition sweep noise for layouts.
- **Glitch Error**: Short crackle synth for status errors.
- **Sub drop**: Deep bass hum.
- **Chime bell**: Crystal-clear bell sound.
- **Tech Fanfare**: Harmonic chord progression for milestones.

---

## Open Questions & Review
1. **WebSocket Port**: Is port `3000` acceptable for local hosting, or would you prefer a custom port?
2. **Layout Preferences**: Would you like to be able to preview how the stream looks inside the Web Dashboard itself before deploying it directly inside OBS?

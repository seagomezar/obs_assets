// OBS Overlay Logic: WebSocket sync, Canvas animations, dynamic badges, alert triggers
class StreamOverlayController {
  constructor() {
    this.socket = null;
    this.state = null;
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.bgAnimationId = null;
    this.bgType = 'particles';
    this.particles = [];
    this.binaryDrops = [];
    this.neuralNodes = [];
    this.gridOffset = 0;
    this.wavePhase = 0;
    this.bubbles = [];
    this.webcamActive = false;
    this.webcamStream = null;
    
    // Set up canvas sizing
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Connect to WebSocket Server
    this.connectWS();
    
    // Start background render loop
    this.startBackgroundLoop();
  }

  resizeCanvas() {
    this.canvas.width = 1920;
    this.canvas.height = 1080;
  }

  connectWS() {
    const wsUrl = `ws://${window.location.hostname || 'localhost'}:3000`;
    console.log(`Connecting to WebSocket hub at: ${wsUrl}`);

    // OverlayConnection uses a real WebSocket locally and a serverless shim on
    // GitHub Pages. It exposes the same surface as WebSocket, so the rest of
    // this controller is unchanged.
    this.socket = new OverlayConnection(wsUrl);

    this.socket.onopen = () => {
      console.log('Successfully connected to WebSocket hub.');
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'STATE_UPDATE':
            this.handleStateUpdate(msg.state);
            break;
            
          case 'ALERT_TRIGGERED':
            this.triggerAlert(msg.alert);
            break;
            
          case 'PLAY_SOUND':
            this.playSynthSound(msg.soundType);
            break;
            
          case 'CHAT_MESSAGE_ADDED':
            this.state = msg.state;
            this.appendChatMessage(msg.message);
            break;
            
          default:
            console.log('Received unknown WebSocket message:', msg);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    this.socket.onclose = () => {
      console.warn('WebSocket connection lost. Attempting to reconnect in 2 seconds...');
      setTimeout(() => this.connectWS(), 2000);
    };

    this.socket.onerror = (err) => {
      console.error('WebSocket encountered an error:', err);
    };
  }

  handleStateUpdate(newState) {
    const oldLayout = this.state?.layout;
    const oldTheme = this.state?.theme;
    this.state = newState;

    // 1. Update Theme
    if (oldTheme !== this.state.theme) {
      document.body.className = `theme-${this.state.theme}`;
    }

    // 2. Update Layout Grid
    if (oldLayout !== this.state.layout) {
      const grid = document.getElementById('layout-grid');
      grid.className = `layout-${this.state.layout}`;
      
      // Play a swoosh sound for layout transitions
      if (oldLayout) {
        this.playSynthSound('swoosh');
      }
    }

    // 3. Update Background Animation Type
    if (this.bgType !== this.state.background) {
      this.bgType = this.state.background;
      this.initBackground(this.bgType);
    }

    // 4. Render Speakers lower thirds & details
    this.renderSpeakers();

    // 5. Update Widgets visibility and text
    this.updateWidgets();

    // 6. Handle Webcam Tryout
    if (this.webcamActive !== this.state.webcamActive) {
      this.webcamActive = this.state.webcamActive;
      this.toggleWebcam(this.webcamActive);
    }
  }

  async toggleWebcam(isActive) {
    const v0 = document.getElementById('webcam-video-0');
    const v1 = document.getElementById('webcam-video-1');

    if (isActive) {
      try {
        console.log("Requesting Web Camera for tryout demo...");
        this.webcamStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        
        if (v0) {
          v0.srcObject = this.webcamStream;
          v0.style.display = 'block';
        }
        if (v1) {
          // Clone the stream or share it for the guest camera slot
          v1.srcObject = this.webcamStream.clone();
          v1.style.display = 'block';
        }
      } catch (err) {
        console.error("Failed to access web camera:", err);
        this.webcamActive = false;
        // Notify server of failure if WebSocket is open
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'UPDATE_STATE',
            state: { webcamActive: false }
          }));
        }
      }
    } else {
      console.log("Stopping Web Camera stream...");
      if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(track => track.stop());
        this.webcamStream = null;
      }
      if (v0) {
        v0.srcObject = null;
        v0.style.display = 'none';
      }
      if (v1) {
        v1.srcObject = null;
        v1.style.display = 'none';
      }
    }
  }

  // Inject badges SVG into target container
  injectBadgeSVG(container, badgeKey) {
    const icon = window.TechIcons[badgeKey];
    if (!icon) return;
    
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("viewBox", icon.viewBox);
    svgEl.classList.add("lt-badge-mini-svg");
    svgEl.title = badgeKey.toUpperCase();
    
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathEl.setAttribute("d", icon.path);
    svgEl.appendChild(pathEl);
    
    container.appendChild(svgEl);
  }

  renderSpeakers() {
    this.state.speakers.forEach((speaker, index) => {
      // Lower Third Content
      const ltName = document.getElementById(`lt-name-${index}`);
      const ltRole = document.getElementById(`lt-role-${index}`);
      const ltSocial = document.getElementById(`lt-social-${index}`);
      const ltBadges = document.getElementById(`lt-badges-${index}`);
      
      if (ltName) ltName.textContent = speaker.name;
      if (ltRole) ltRole.textContent = speaker.role;
      if (ltSocial) ltSocial.textContent = speaker.social;
      
      // Render Badges
      if (ltBadges) {
        ltBadges.innerHTML = '';
        speaker.badges.forEach(badgeKey => {
          this.injectBadgeSVG(ltBadges, badgeKey);
        });
      }

      // Slot badge icon (Use first badge key or default code icon)
      const slotIcon = document.getElementById(`slot-icon-${index}`);
      if (slotIcon && speaker.badges.length > 0) {
        slotIcon.innerHTML = '';
        const iconKey = speaker.badges[0];
        const icon = window.TechIcons[iconKey];
        if (icon) {
          const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgEl.setAttribute("viewBox", icon.viewBox);
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", icon.path);
          svgEl.appendChild(pathEl);
          slotIcon.appendChild(svgEl);
        }
      }

      // Toggle lower third activation
      const ltWrapper = document.getElementById(`lt-wrapper-${index}`);
      if (ltWrapper) {
        // Remove style class and apply selected style
        ltWrapper.className = `lower-third-wrapper lt-style-${this.state.lowerThirdStyle}`;
        if (speaker.lowerThirdActive) {
          ltWrapper.classList.add('active');
        } else {
          ltWrapper.classList.remove('active');
        }
      }
    });
  }

  updateWidgets() {
    const w = this.state.widgets;

    // Current Topic
    const topicWidget = document.getElementById('topic-widget');
    const topicText = document.getElementById('topic-text-content');
    if (w.topic.active) {
      topicWidget.classList.remove('widget-hidden');
      topicText.textContent = w.topic.text;
    } else {
      topicWidget.classList.add('widget-hidden');
    }

    // Ticker News Ticker
    const tickerWidget = document.getElementById('ticker-widget');
    const tickerText = document.getElementById('ticker-scroll-content');
    if (w.ticker.active) {
      tickerWidget.style.display = 'flex';
      tickerText.textContent = w.ticker.text;
    } else {
      tickerWidget.style.display = 'none';
    }

    // Chat Feed
    const chatWidget = document.getElementById('chat-widget');
    if (w.chat.active) {
      chatWidget.classList.remove('widget-hidden');
      // If we are loading state fresh, make sure messages match
      const chatFeedBox = document.getElementById('chat-feed-box');
      if (chatFeedBox.children.length === 0 && w.chat.messages.length > 0) {
        w.chat.messages.forEach(msg => this.appendChatMessage(msg));
      }
    } else {
      chatWidget.classList.add('widget-hidden');
    }

    // Countdown Clock
    const countdownWidget = document.getElementById('countdown-widget');
    if (w.countdown.active) {
      countdownWidget.classList.remove('widget-hidden');
      this.updateCountdownDOM();
    } else {
      countdownWidget.classList.add('widget-hidden');
    }

    // Goal widget
    const goalWidget = document.getElementById('goal-widget');
    const goalTitle = document.getElementById('goal-title-text');
    const goalNumbers = document.getElementById('goal-numbers-text');
    const goalFill = document.getElementById('goal-fill-bar');
    if (w.goal.active) {
      goalWidget.classList.remove('widget-hidden');
      goalTitle.textContent = w.goal.title;
      goalNumbers.textContent = `${w.goal.current} / ${w.goal.target}`;
      const percentage = Math.min((w.goal.current / w.goal.target) * 100, 100);
      goalFill.style.width = `${percentage}%`;
    } else {
      goalWidget.classList.add('widget-hidden');
    }

    // Q&A Question Widget
    const qaWidget = document.getElementById('qa-widget');
    const qaText = document.getElementById('qa-text-content');
    const qaAuthor = document.getElementById('qa-author-text');
    if (w.qa.active) {
      qaWidget.classList.remove('widget-hidden');
      qaText.textContent = `"${w.qa.question}"`;
      qaAuthor.textContent = `- asked by ${w.qa.author}`;
    } else {
      qaWidget.classList.add('widget-hidden');
    }

    // Poll Widget
    const pollWidget = document.getElementById('poll-widget');
    const pollQuestion = document.getElementById('poll-question-text');
    const pollBox = document.getElementById('poll-options-box');
    if (w.poll.active) {
      pollWidget.classList.remove('widget-hidden');
      pollQuestion.textContent = w.poll.question;
      
      pollBox.innerHTML = '';
      const totalVotes = w.poll.votes.reduce((a, b) => a + b, 0) || 1;
      
      w.poll.options.forEach((opt, idx) => {
        const votes = w.poll.votes[idx] || 0;
        const pct = Math.round((votes / totalVotes) * 100);
        
        const row = document.createElement('div');
        row.className = 'poll-option-row';
        row.innerHTML = `
          <div class="poll-option-fill" style="width: ${pct}%"></div>
          <span class="poll-option-text">${opt}</span>
          <span class="poll-option-pct">${pct}% (${votes})</span>
        `;
        pollBox.appendChild(row);
      });
    } else {
      pollWidget.classList.add('widget-hidden');
    }

    // Code snippet widget
    const codeWidget = document.getElementById('code-widget');
    const codeLang = document.getElementById('code-lang-text');
    const codeBox = document.getElementById('code-box');
    if (w.codeSnippet.active) {
      codeWidget.classList.remove('widget-hidden');
      codeLang.textContent = w.codeSnippet.language.toUpperCase();
      codeBox.textContent = w.codeSnippet.code;
    } else {
      codeWidget.classList.add('widget-hidden');
    }

    // Social handles rotation
    this.updateSocialRotator();
  }

  updateCountdownDOM() {
    const textEl = document.getElementById('countdown-text');
    const fillEl = document.getElementById('countdown-progress');
    const end = this.state.widgets.countdown.endTime;
    const dur = this.state.widgets.countdown.duration;
    
    if (!end) {
      textEl.textContent = "00:00";
      fillEl.style.width = '0%';
      return;
    }

    const remain = Math.max(0, Math.round((end - Date.now()) / 1000));
    const mins = Math.floor(remain / 60).toString().padStart(2, '0');
    const secs = (remain % 60).toString().padStart(2, '0');
    textEl.textContent = `${mins}:${secs}`;
    
    const pct = (remain / dur) * 100;
    fillEl.style.width = `${pct}%`;
  }

  updateSocialRotator() {
    const container = document.getElementById('socials-widget');
    const iconWrapper = document.getElementById('socials-rotating-icon');
    const textEl = document.getElementById('socials-rotating-text');
    
    // We rotate between active speaker social handles and a stream general handle
    const handleList = [
      { type: 'github', label: 'github.com/webgde-hub' }
    ];

    this.state.speakers.forEach(sp => {
      if (sp.social) {
        // Parse type or default to twitter
        handleList.push({ type: 'twitter', label: sp.social });
      }
    });

    if (handleList.length === 0) {
      container.classList.add('widget-hidden');
      return;
    }
    
    container.classList.remove('widget-hidden');

    // Perform rotation using a static index counter
    if (!this.socialRotationInterval) {
      let activeIndex = 0;
      const applyRotator = () => {
        const current = handleList[activeIndex];
        textEl.textContent = current.label;
        
        // Inject icon
        iconWrapper.innerHTML = '';
        const icon = window.TechIcons[current.type] || window.TechIcons['globe'];
        if (icon) {
          const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgEl.setAttribute("viewBox", icon.viewBox);
          const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathEl.setAttribute("d", icon.path);
          svgEl.appendChild(pathEl);
          iconWrapper.appendChild(svgEl);
        }
        
        activeIndex = (activeIndex + 1) % handleList.length;
      };
      
      applyRotator();
      this.socialRotationInterval = setInterval(applyRotator, 7000);
    }
  }

  appendChatMessage(msg) {
    const box = document.getElementById('chat-feed-box');
    
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    
    // Get badge icon SVG
    let badgeHtml = '';
    const icon = window.TechIcons[msg.badge];
    if (icon) {
      badgeHtml = `<span class="chat-badge-svg"><svg viewBox="${icon.viewBox}"><path d="${icon.path}"></path></svg></span>`;
    }
    
    chatItem.innerHTML = `
      <div class="chat-user-row">
        ${badgeHtml}
        <span class="chat-username">${msg.user}</span>
      </div>
      <div class="chat-message">${msg.message}</div>
    `;
    
    box.appendChild(chatItem);
    
    // Limit DOM children to last 15
    while (box.children.length > 15) {
      box.removeChild(box.firstChild);
    }
    
    // Scroll to bottom
    box.scrollTop = box.scrollHeight;
  }

  triggerAlert(alert) {
    const container = document.getElementById('alert-container');
    const titleText = document.getElementById('alert-title-text');
    const msgText = document.getElementById('alert-msg-text');
    const iconWrapper = document.getElementById('alert-svg-icon');

    // 1. Play alert synthesized sound
    if (alert.type === 'follow') this.playSynthSound('bloop');
    else if (alert.type === 'subscriber') this.playSynthSound('fanfare');
    else if (alert.type === 'cheer') this.playSynthSound('glitch');
    else if (alert.type === 'sponsor') this.playSynthSound('chime');

    // 2. Set alert content
    titleText.textContent = `${alert.type.toUpperCase()} ALERT!`;
    
    let text = `${alert.user} `;
    let badgeKey = 'star';
    if (alert.type === 'follow') {
      text += `followed the stream!`;
      badgeKey = 'star';
    } else if (alert.type === 'subscriber') {
      text += `subscribed to the channel!`;
      badgeKey = 'flame';
    } else if (alert.type === 'cheer') {
      text += `cheered ${alert.value} bits!`;
      badgeKey = 'sparkles';
    } else if (alert.type === 'sponsor') {
      text += `became a channel sponsor!`;
      badgeKey = 'shield';
    }
    msgText.textContent = text;

    // Inject SVG icon
    iconWrapper.innerHTML = '';
    const icon = window.TechIcons[badgeKey];
    if (icon) {
      const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgEl.setAttribute("viewBox", icon.viewBox);
      const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathEl.setAttribute("d", icon.path);
      svgEl.appendChild(pathEl);
      iconWrapper.appendChild(svgEl);
    }

    // 3. Show Alert
    container.classList.remove('alert-hidden');
    
    // Force rebuild of the accent animation bar
    const bar = container.querySelector('.alert-accent-line');
    bar.style.animation = 'none';
    bar.offsetHeight; // trigger reflow
    bar.style.animation = 'alert-slide-line 4.8s linear';

    // 4. Hide Alert after 5 seconds
    if (this.alertTimeout) clearTimeout(this.alertTimeout);
    this.alertTimeout = setTimeout(() => {
      container.classList.add('alert-hidden');
      // Tell server alert has completed
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'CLEAR_ALERT' }));
      }
    }, 4800);
  }

  playSynthSound(type) {
    if (!window.StreamSynthEngine) return;
    
    try {
      if (type === 'bloop') window.StreamSynthEngine.playBloop();
      else if (type === 'swoosh') window.StreamSynthEngine.playSwoosh();
      else if (type === 'glitch') window.StreamSynthEngine.playGlitch();
      else if (type === 'subdrop') window.StreamSynthEngine.playSubDrop();
      else if (type === 'chime') window.StreamSynthEngine.playChime();
      else if (type === 'fanfare') window.StreamSynthEngine.playFanfare();
    } catch (e) {
      console.warn("Audio Synthesizer block by autoplay rules. Touch the screen to activate audio:", e);
    }
  }

  // ==========================================================================
  // CANVAS BACKGROUND GENERATORS (6 interactive modes)
  // ==========================================================================
  initBackground(type) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    this.particles = [];
    this.binaryDrops = [];
    this.neuralNodes = [];
    this.bubbles = [];
    this.gridOffset = 0;
    
    const themeColors = this.getThemeColors();

    if (type === 'particles') {
      for (let i = 0; i < 70; i++) {
        this.particles.push({
          x: Math.random() * 1920,
          y: Math.random() * 1080,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2.5 + 1.5,
          color: themeColors.accent
        });
      }
    } else if (type === 'binary') {
      const columns = 1920 / 24;
      for (let i = 0; i < columns; i++) {
        this.binaryDrops[i] = {
          x: i * 24,
          y: Math.random() * -1080,
          speed: Math.random() * 2 + 1.5,
          chars: Array.from({length: 15}, () => Math.random() > 0.5 ? '1' : '0')
        };
      }
    } else if (type === 'neural') {
      for (let i = 0; i < 35; i++) {
        this.neuralNodes.push({
          x: Math.random() * 1920,
          y: Math.random() * 1080,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          pulse: Math.random() * Math.PI,
          pulseSpeed: Math.random() * 0.03 + 0.01,
          sparks: []
        });
      }
    } else if (type === 'bubbles') {
      for (let i = 0; i < 15; i++) {
        this.bubbles.push({
          x: Math.random() * 1920,
          y: Math.random() * 1080 + 200,
          radius: Math.random() * 50 + 30,
          speed: Math.random() * 0.5 + 0.2,
          amplitude: Math.random() * 40 + 20,
          phase: Math.random() * Math.PI * 2,
          color: Math.random() > 0.5 ? themeColors.primary : themeColors.accent
        });
      }
    }
  }

  getThemeColors() {
    const style = getComputedStyle(document.body);
    return {
      primary: style.getPropertyValue('--primary').trim() || '#4f46e5',
      secondary: style.getPropertyValue('--secondary').trim() || '#d946ef',
      accent: style.getPropertyValue('--accent').trim() || '#06b6d4',
      text: style.getPropertyValue('--text-main').trim() || '#ffffff'
    };
  }

  startBackgroundLoop() {
    this.initBackground(this.bgType);
    
    // Countdown updater interval (runs once per second)
    setInterval(() => {
      if (this.state && this.state.widgets.countdown.active) {
        this.updateCountdownDOM();
      }
    }, 1000);

    const render = () => {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      
      const themeColors = this.getThemeColors();
      
      switch (this.bgType) {
        case 'particles':
          this.renderParticles(themeColors);
          break;
        case 'binary':
          this.renderBinary(themeColors);
          break;
        case 'grid':
          this.renderGrid(themeColors);
          break;
        case 'neural':
          this.renderNeural(themeColors);
          break;
        case 'wave':
          this.renderWave(themeColors);
          break;
        case 'bubbles':
          this.renderBubbles(themeColors);
          break;
        default:
          this.ctx.clearRect(0, 0, 1920, 1080);
      }
      
      this.bgAnimationId = requestAnimationFrame(render);
    };
    
    render();
  }

  // Canvas Mode 1: Particle network
  renderParticles(colors) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    this.ctx.fillStyle = 'transparent';
    
    // Draw lines
    this.ctx.strokeStyle = colors.accent;
    this.ctx.lineWidth = 0.3;
    
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p1 = this.particles[i];
      p1.x += p1.vx;
      p1.y += p1.vy;
      
      if (p1.x < 0 || p1.x > 1920) p1.vx *= -1;
      if (p1.y < 0 || p1.y > 1080) p1.vy *= -1;
      
      this.ctx.beginPath();
      this.ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = colors.accent;
      this.ctx.fill();

      for (let j = i + 1; j < count; j++) {
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 160) {
          this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, ${0.18 * (1 - dist/160)})`;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  // Canvas Mode 2: Code Rain (Matrix Style)
  renderBinary(colors) {
    // Semi-transparent overlay to create trailing fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    this.ctx.fillRect(0, 0, 1920, 1080);
    
    this.ctx.font = '16px "Share Tech Mono"';
    
    for (let i = 0; i < this.binaryDrops.length; i++) {
      const drop = this.binaryDrops[i];
      drop.y += drop.speed;
      
      // Reset drop
      if (drop.y > 1080) {
        drop.y = Math.random() * -300;
        drop.speed = Math.random() * 2 + 1.5;
      }
      
      // Render characters vertical tail
      drop.chars.forEach((char, idx) => {
        const yOffset = drop.y - (idx * 20);
        if (yOffset > 0 && yOffset < 1080) {
          // Bottom character in tail glows brightest white
          if (idx === 0) {
            this.ctx.fillStyle = '#ffffff';
          } else {
            this.ctx.fillStyle = `rgba(${this.hexToRgb(colors.primary)}, ${1 - (idx / 15)})`;
          }
          this.ctx.fillText(char, drop.x, yOffset);
          
          // Randomly mutate character
          if (Math.random() > 0.98) {
            drop.chars[idx] = Math.random() > 0.5 ? '1' : '0';
          }
        }
      });
    }
  }

  // Canvas Mode 3: Perspectives moving 3D Grid (Synthwave style)
  renderGrid(colors) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    
    const horizon = 480;
    this.gridOffset = (this.gridOffset + 1.2) % 60;
    
    // Draw horizon atmospheric glow
    const gradient = this.ctx.createLinearGradient(0, horizon - 150, 0, horizon + 2);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, `rgba(${this.hexToRgb(colors.secondary)}, 0.08)`);
    gradient.addColorStop(1, `rgba(${this.hexToRgb(colors.accent)}, 0.25)`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, horizon - 150, 1920, horizon + 2);
    
    this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, 0.35)`;
    this.ctx.lineWidth = 1;
    
    // Moving Horizontal lines
    for (let y = 0; y < 600; y += 60) {
      const currentY = horizon + ((y + this.gridOffset) % 600);
      // Perspective scaling
      const ratio = (currentY - horizon) / 600;
      const finalY = horizon + (ratio * ratio * 600);
      
      this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, ${0.4 * ratio})`;
      this.ctx.beginPath();
      this.ctx.moveTo(0, finalY);
      this.ctx.lineTo(1920, finalY);
      this.ctx.stroke();
    }
    
    // Radiating Vertical lines
    for (let x = -800; x <= 2720; x += 120) {
      this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, 0.25)`;
      this.ctx.beginPath();
      this.ctx.moveTo(960, horizon);
      this.ctx.lineTo(x, 1080);
      this.ctx.stroke();
    }
  }

  // Canvas Mode 4: Neural network paths (AI theme)
  renderNeural(colors) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    
    // 1. Update and draw nodes
    this.neuralNodes.forEach(node => {
      node.x += node.vx;
      node.y += node.vy;
      node.pulse += node.pulseSpeed;
      
      if (node.x < 0 || node.x > 1920) node.vx *= -1;
      if (node.y < 0 || node.y > 1080) node.vy *= -1;
      
      const rGlow = 10 + Math.sin(node.pulse) * 8;
      
      // Node core
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = colors.accent;
      this.ctx.fill();
      
      // Node pulsing outer ring
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, rGlow, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, ${0.2 * (1 - (rGlow-10)/8)})`;
      this.ctx.stroke();
      
      // Spark generator
      if (Math.random() > 0.995 && node.sparks.length === 0) {
        // Pick a close neighbor
        const close = this.neuralNodes.filter(n => {
          const d = Math.hypot(n.x - node.x, n.y - node.y);
          return d > 5 && d < 280;
        });
        if (close.length > 0) {
          const target = close[Math.floor(Math.random() * close.length)];
          node.sparks.push({
            tx: target.x,
            ty: target.y,
            progress: 0,
            speed: Math.random() * 0.05 + 0.03
          });
        }
      }
      
      // Render sparks
      node.sparks.forEach((spark, index) => {
        spark.progress += spark.speed;
        
        const sx = node.x + (spark.tx - node.x) * spark.progress;
        const sy = node.y + (spark.ty - node.y) * spark.progress;
        
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 3, 0, Math.PI*2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        
        // Glow line path
        this.ctx.beginPath();
        this.ctx.moveTo(node.x, node.y);
        this.ctx.lineTo(sx, sy);
        this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.accent)}, 0.45)`;
        this.ctx.stroke();
        
        if (spark.progress >= 1) {
          node.sparks.splice(index, 1);
        }
      });
    });
    
    // 2. Draw static connections
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.neuralNodes.length; i++) {
      const n1 = this.neuralNodes[i];
      for (let j = i + 1; j < this.neuralNodes.length; j++) {
        const n2 = this.neuralNodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        
        if (dist < 220) {
          this.ctx.strokeStyle = `rgba(${this.hexToRgb(colors.secondary)}, ${0.1 * (1 - dist/220)})`;
          this.ctx.beginPath();
          this.ctx.moveTo(n1.x, n1.y);
          this.ctx.lineTo(n2.x, n2.y);
          this.ctx.stroke();
        }
      }
    }
  }

  // Canvas Mode 5: Flowing Sine Bezier Waves (Creative web theme)
  renderWave(colors) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    this.wavePhase += 0.003;
    
    const count = 3;
    const waveHeight = 900;
    
    for (let i = 0; i < count; i++) {
      const speedOffset = i * 0.8;
      const phase = this.wavePhase + (i * 0.15);
      
      const grad = this.ctx.createLinearGradient(0, 0, 1920, 0);
      grad.addColorStop(0, `rgba(${this.hexToRgb(colors.primary)}, 0.08)`);
      grad.addColorStop(0.5, `rgba(${this.hexToRgb(colors.secondary)}, 0.15)`);
      grad.addColorStop(1, `rgba(${this.hexToRgb(colors.accent)}, 0.08)`);
      
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 1080);
      
      for (let x = 0; x <= 1920; x += 40) {
        const sine = Math.sin((x * 0.001) + phase) * 80;
        const cosine = Math.cos((x * 0.0015) - phase) * 40;
        const finalY = waveHeight + (sine + cosine) + (i * 35);
        this.ctx.lineTo(x, finalY);
      }
      
      this.ctx.lineTo(1920, 1080);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  // Canvas Mode 6: Playful orbital tech bubbles
  renderBubbles(colors) {
    this.ctx.clearRect(0, 0, 1920, 1080);
    
    this.bubbles.forEach(bubble => {
      bubble.y -= bubble.speed;
      bubble.phase += 0.015;
      
      // Floating sinusoidal motion
      const currentX = bubble.x + Math.sin(bubble.phase) * bubble.amplitude;
      
      if (bubble.y < -bubble.radius * 2) {
        bubble.y = 1080 + bubble.radius * 2;
        bubble.x = Math.random() * 1920;
      }
      
      const radGrad = this.ctx.createRadialGradient(
        currentX, bubble.y, 2,
        currentX, bubble.y, bubble.radius
      );
      radGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
      radGrad.addColorStop(0.4, `rgba(${this.hexToRgb(bubble.color)}, 0.08)`);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      
      this.ctx.fillStyle = radGrad;
      this.ctx.beginPath();
      this.ctx.arc(currentX, bubble.y, bubble.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  // Utility to convert Hex color variables to RGB strings
  hexToRgb(hex) {
    // Handles named hex colors, custom browser spaces, or defaults
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const num = parseInt(hex, 16);
    if (isNaN(num)) return "82, 44, 173"; // fallback to standard violet
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }
}

// Start StreamOverlay on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  window.StreamOverlay = new StreamOverlayController();
  
  // Audio fallback click binder
  const activator = document.getElementById('audio-activator');
  if (activator) {
    const handleGesture = () => {
      if (window.StreamSynthEngine) {
        window.StreamSynthEngine.initContext();
      }
      activator.style.display = 'none';
    };
    activator.addEventListener('click', handleGesture);
    activator.addEventListener('touchstart', handleGesture);
  }
});

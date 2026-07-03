// Dashboard Controller Logic: WebSocket bindings, state management, form inputs, dynamic badge chips
class DashboardController {
  constructor() {
    this.socket = null;
    this.state = null;
    this.activeSpeakerId = 0; // Current speaker tab (0 or 1)
    
    // Group definitions for the 50 technology badges
    this.badgeGroups = {
      web: ['html5', 'css3', 'javascript', 'typescript', 'webassembly', 'webgl', 'serviceworker', 'pwa', 'nodejs', 'npm'],
      google: ['google', 'angular', 'firebase', 'chrome', 'gcloud', 'idx', 'android', 'flutter', 'maps', 'webvitals', 'gde', 'googledev', 'gde_web'],
      ai: ['gemini', 'tensorflow', 'keras', 'pytorch', 'neural', 'robot', 'deepmind', 'brain', 'sparkles', 'database'],
      socials: ['github', 'twitter', 'linkedin', 'youtube', 'twitch', 'discord', 'microphone', 'camera', 'chat', 'podcast'],
      general: ['server', 'cpu', 'shield', 'globe', 'code', 'star', 'flame', 'warning', 'checkmark', 'info']
    };

    // Render static badge checkboxes
    this.renderBadgeChips();

    // Bind Event Listeners
    this.bindEvents();

    // Connect WebSocket
    this.connectWS();
  }

  connectWS() {
    const wsUrl = `ws://${window.location.hostname || 'localhost'}:3000`;
    // Real WebSocket locally, serverless shim on GitHub Pages (same surface).
    this.socket = new OverlayConnection(wsUrl);

    this.socket.onopen = () => {
      this.updateConnectionStatus(true);
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATE_UPDATE') {
          this.handleStateUpdate(msg.state);
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    this.socket.onclose = () => {
      this.updateConnectionStatus(false);
      setTimeout(() => this.connectWS(), 2000);
    };
  }

  updateConnectionStatus(isConnected) {
    const indicator = document.getElementById('conn-indicator');
    const label = document.getElementById('conn-label');
    
    if (isConnected) {
      indicator.className = 'status-indicator connected';
      label.textContent = 'CONNECTED';
      label.style.color = '#2cd6ad';
    } else {
      indicator.className = 'status-indicator disconnected';
      label.textContent = 'OFFLINE';
      label.style.color = '#ef4444';
    }
  }

  handleStateUpdate(newState) {
    this.state = newState;
    
    // Reload Preview Iframe if it disconnects or desyncs (just send update trigger post state sync)
    const iframe = document.getElementById('preview-iframe');
    if (iframe && iframe.contentWindow) {
      // Direct message content to preview frame (faster sync than loading sockets double)
      iframe.contentWindow.postMessage({ type: 'STATE_UPDATE', state: this.state }, '*');
    }

    // 1. Sync Layout Buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      if (btn.getAttribute('data-layout') === this.state.layout) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Sync Theme Buttons
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
      if (btn.getAttribute('data-theme') === this.state.theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Sync Background Buttons
    document.querySelectorAll('.bg-select-btn').forEach(btn => {
      if (btn.getAttribute('data-bg') === this.state.background) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 4. Sync Lower Third Style Buttons
    document.querySelectorAll('.lt-select-btn').forEach(btn => {
      if (btn.getAttribute('data-lt') === this.state.lowerThirdStyle) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 5. Sync Speaker Form Values
    this.syncSpeakerForm();

    // Webcam Tryout
    document.getElementById('webcam-tryout-toggle').checked = this.state.webcamActive;

    // 6. Sync Widget Controls
    const w = this.state.widgets;
    
    // Topic Widget
    document.getElementById('widget-topic-active').checked = w.topic.active;
    document.getElementById('widget-topic-text').value = w.topic.text;
    
    // Ticker Widget
    document.getElementById('widget-ticker-active').checked = w.ticker.active;
    document.getElementById('widget-ticker-text').value = w.ticker.text;

    // Chat widget Active
    document.getElementById('widget-chat-active').checked = w.chat.active;

    // Countdown active
    document.getElementById('widget-countdown-active').checked = w.countdown.active;
    document.getElementById('widget-countdown-dur').value = w.countdown.duration;

    // Goal indicator
    document.getElementById('widget-goal-active').checked = w.goal.active;
    document.getElementById('widget-goal-title').value = w.goal.title;
    document.getElementById('widget-goal-current').value = w.goal.current;
    document.getElementById('widget-goal-target').value = w.goal.target;

    // Q&A Question Card
    document.getElementById('widget-qa-active').checked = w.qa.active;
    document.getElementById('widget-qa-question').value = w.qa.question;
    document.getElementById('widget-qa-author').value = w.qa.author;

    // Poll card details
    document.getElementById('widget-poll-active').checked = w.poll.active;
    document.getElementById('widget-poll-q').value = w.poll.question;
    document.getElementById('widget-poll-opt-0').value = w.poll.options[0] || '';
    document.getElementById('widget-poll-opt-1').value = w.poll.options[1] || '';
    document.getElementById('widget-poll-opt-2').value = w.poll.options[2] || '';
    document.getElementById('widget-poll-opt-3').value = w.poll.options[3] || '';

    // Render poll vote buttons in dashboard
    this.renderPollVoteSimulators();

    // Code sharing
    document.getElementById('widget-code-active').checked = w.codeSnippet.active;
    document.getElementById('widget-code-lang').value = w.codeSnippet.language;
    document.getElementById('widget-code-content').value = w.codeSnippet.code;
  }

  // Generate the 50 SVG badges checkboxes dynamically on load
  renderBadgeChips() {
    for (const [groupKey, badges] of Object.entries(this.badgeGroups)) {
      const container = document.getElementById(`group-${groupKey}`);
      if (!container) continue;
      
      container.innerHTML = '';
      
      badges.forEach(badge => {
        // Find icon details in window.TechIcons if loaded, or placeholder
        const chip = document.createElement('label');
        chip.className = 'chip-label';
        chip.id = `label-badge-${badge}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = badge;
        checkbox.id = `check-badge-${badge}`;
        
        // Handle select cap (Max 5 badges)
        checkbox.addEventListener('change', (e) => {
          const checkedCount = container.closest('.badges-chips-library').querySelectorAll('input:checked').length;
          if (checkedCount > 5 && e.target.checked) {
            e.target.checked = false;
            alert('You can select a maximum of 5 badges per speaker.');
            return;
          }
          
          if (e.target.checked) {
            chip.classList.add('checked');
          } else {
            chip.classList.remove('checked');
          }
        });

        chip.appendChild(checkbox);
        chip.appendChild(document.createTextNode(badge));
        container.appendChild(chip);
      });
    }
  }

  syncSpeakerForm() {
    const speaker = this.state.speakers.find(s => s.id === this.activeSpeakerId);
    if (!speaker) return;

    document.getElementById('editor-speaker-id').value = speaker.id;
    document.getElementById('speaker-name').value = speaker.name;
    document.getElementById('speaker-social').value = speaker.social;
    document.getElementById('speaker-role').value = speaker.role;

    // Reset all badge chips
    document.querySelectorAll('.chip-label input').forEach(checkbox => {
      checkbox.checked = false;
      checkbox.closest('.chip-label').classList.remove('checked');
    });

    // Mark current speaker badges as checked
    speaker.badges.forEach(badge => {
      const checkbox = document.getElementById(`check-badge-${badge}`);
      const label = document.getElementById(`label-badge-${badge}`);
      if (checkbox && label) {
        checkbox.checked = true;
        label.classList.add('checked');
      }
    });

    // Lower third button status
    const ltBtn = document.getElementById('toggle-lt-btn');
    if (speaker.lowerThirdActive) {
      ltBtn.className = 'btn btn-toggle-lt activated';
      ltBtn.textContent = 'LOWER THIRD: ON';
    } else {
      ltBtn.className = 'btn btn-toggle-lt deactivated';
      ltBtn.textContent = 'LOWER THIRD: OFF';
    }
  }

  renderPollVoteSimulators() {
    const box = document.getElementById('poll-vote-sims-box');
    box.innerHTML = '';
    
    if (this.state && this.state.widgets.poll.active) {
      this.state.widgets.poll.options.forEach((opt, idx) => {
        if (!opt) return;
        const btn = document.createElement('button');
        const letter = String.fromCharCode(65 + idx); // A, B, C, D
        btn.className = 'btn-vote-sim';
        btn.textContent = `Vote ${letter}`;
        btn.onclick = () => {
          this.socket.send(JSON.stringify({
            type: 'VOTE_POLL',
            optionIndex: idx
          }));
        };
        box.appendChild(btn);
      });
    }
  }

  bindEvents() {
    // 1. Layout Button Handlers
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.getAttribute('data-layout');
        this.updateState({ layout });
      });
    });

    // 2. Theme Button Handlers
    document.querySelectorAll('.theme-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme');
        this.updateState({ theme });
      });
    });

    // 3. Background Button Handlers
    document.querySelectorAll('.bg-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const background = btn.getAttribute('data-bg');
        this.updateState({ background });
      });
    });

    // 4. Lower Third Style Button Handlers
    document.querySelectorAll('.lt-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lowerThirdStyle = btn.getAttribute('data-lt');
        this.updateState({ lowerThirdStyle });
      });
    });

    // 5. Speaker tab toggling
    document.getElementById('sp-tab-btn-0').addEventListener('click', (e) => {
      this.activeSpeakerId = 0;
      document.getElementById('sp-tab-btn-0').classList.add('active');
      document.getElementById('sp-tab-btn-1').classList.remove('active');
      this.syncSpeakerForm();
    });

    document.getElementById('sp-tab-btn-1').addEventListener('click', (e) => {
      this.activeSpeakerId = 1;
      document.getElementById('sp-tab-btn-1').classList.add('active');
      document.getElementById('sp-tab-btn-0').classList.remove('active');
      this.syncSpeakerForm();
    });

    // 6. Speaker profile form submission
    document.getElementById('speaker-editor-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const id = parseInt(document.getElementById('editor-speaker-id').value);
      const name = document.getElementById('speaker-name').value;
      const social = document.getElementById('speaker-social').value;
      const role = document.getElementById('speaker-role').value;

      // Extract checked badges
      const badges = [];
      document.querySelectorAll('.chip-label input:checked').forEach(cb => {
        badges.push(cb.value);
      });

      // Map back to speakers list
      const speakers = [...this.state.speakers];
      const index = speakers.findIndex(s => s.id === id);
      if (index !== -1) {
        speakers[index] = {
          ...speakers[index],
          name,
          social,
          role,
          badges
        };
      }

      this.updateState({ speakers });
      alert('Speaker profile updated successfully.');
    });

    // 7. Toggle Lower third display
    document.getElementById('toggle-lt-btn').addEventListener('click', () => {
      const id = this.activeSpeakerId;
      const speakers = [...this.state.speakers];
      const index = speakers.findIndex(s => s.id === id);
      if (index !== -1) {
        speakers[index].lowerThirdActive = !speakers[index].lowerThirdActive;
      }
      this.updateState({ speakers });
    });

    // 8. Alerts triggering console
    document.querySelectorAll('.btn-alert').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-alert');
        const user = document.getElementById('alert-username-input').value || 'Anonymous';
        const value = document.getElementById('alert-value-input').value || '';
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'TRIGGER_ALERT',
            alertType: type,
            user,
            value
          }));
        }
      });
    });

    // 9. Sound FX controls
    document.querySelectorAll('.btn-sound').forEach(btn => {
      btn.addEventListener('click', () => {
        const soundType = btn.getAttribute('data-sound');
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'PLAY_SOUND',
            soundType
          }));
        }
      });
    });

    // Webcam Tryout Toggle
    document.getElementById('webcam-tryout-toggle').addEventListener('change', (e) => {
      this.updateState({ webcamActive: e.target.checked });
    });

    // 10. General Widgets controls
    
    // Topic input & active
    document.getElementById('widget-topic-active').addEventListener('change', (e) => {
      this.updateWidgetState('topic', 'active', e.target.checked);
    });
    document.getElementById('widget-topic-text').addEventListener('blur', (e) => {
      this.updateWidgetState('topic', 'text', e.target.value);
    });

    // News Ticker input & active
    document.getElementById('widget-ticker-active').addEventListener('change', (e) => {
      this.updateWidgetState('ticker', 'active', e.target.checked);
    });
    document.getElementById('widget-ticker-text').addEventListener('blur', (e) => {
      this.updateWidgetState('ticker', 'text', e.target.value);
    });

    // Chat box Active toggle
    document.getElementById('widget-chat-active').addEventListener('change', (e) => {
      this.updateWidgetState('chat', 'active', e.target.checked);
    });

    // Chat simulation text sender
    document.getElementById('chat-sim-send-btn').addEventListener('click', () => {
      const msgInput = document.getElementById('chat-sim-message');
      const badgeSelect = document.getElementById('chat-sim-badge');
      const text = msgInput.value;
      const badge = badgeSelect.value;
      
      if (!text.trim()) return;

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'ADD_CHAT_MESSAGE',
          user: 'ViewerSim',
          message: text,
          badge
        }));
      }
      
      msgInput.value = '';
    });

    // Countdown active & duration
    document.getElementById('widget-countdown-active').addEventListener('change', (e) => {
      this.updateWidgetState('countdown', 'active', e.target.checked);
    });
    
    document.getElementById('countdown-start-btn').addEventListener('click', () => {
      const dur = parseInt(document.getElementById('widget-countdown-dur').value) || 300;
      const endTime = Date.now() + dur * 1000;
      
      const widgets = { ...this.state.widgets };
      widgets.countdown = {
        active: true,
        duration: dur,
        endTime
      };
      this.updateState({ widgets });
    });

    document.getElementById('countdown-stop-btn').addEventListener('click', () => {
      const widgets = { ...this.state.widgets };
      widgets.countdown = {
        active: false,
        duration: widgets.countdown.duration,
        endTime: null
      };
      this.updateState({ widgets });
    });

    // Subscriber Goal controls
    document.getElementById('widget-goal-active').addEventListener('change', (e) => {
      this.updateWidgetState('goal', 'active', e.target.checked);
    });
    
    const syncGoalFields = () => {
      const title = document.getElementById('widget-goal-title').value;
      const current = parseInt(document.getElementById('widget-goal-current').value) || 0;
      const target = parseInt(document.getElementById('widget-goal-target').value) || 100;
      
      const widgets = { ...this.state.widgets };
      widgets.goal = {
        ...widgets.goal,
        title,
        current,
        target
      };
      this.updateState({ widgets });
    };

    document.getElementById('widget-goal-title').addEventListener('blur', syncGoalFields);
    document.getElementById('widget-goal-current').addEventListener('change', syncGoalFields);
    document.getElementById('widget-goal-target').addEventListener('change', syncGoalFields);

    // Q&A Question Card
    document.getElementById('widget-qa-active').addEventListener('change', (e) => {
      this.updateWidgetState('qa', 'active', e.target.checked);
    });
    
    const syncQAFields = () => {
      const question = document.getElementById('widget-qa-question').value;
      const author = document.getElementById('widget-qa-author').value || 'Anonymous';
      
      const widgets = { ...this.state.widgets };
      widgets.qa = {
        ...widgets.qa,
        question,
        author
      };
      this.updateState({ widgets });
    };
    document.getElementById('widget-qa-question').addEventListener('blur', syncQAFields);
    document.getElementById('widget-qa-author').addEventListener('blur', syncQAFields);

    // Poll controls Set button
    document.getElementById('widget-poll-active').addEventListener('change', (e) => {
      this.updateWidgetState('poll', 'active', e.target.checked);
    });

    document.getElementById('widget-poll-update-btn').addEventListener('click', () => {
      const question = document.getElementById('widget-poll-q').value;
      const options = [
        document.getElementById('widget-poll-opt-0').value,
        document.getElementById('widget-poll-opt-1').value,
        document.getElementById('widget-poll-opt-2').value,
        document.getElementById('widget-poll-opt-3').value
      ].filter(o => o.trim() !== '');

      if (!question.trim() || options.length < 2) {
        alert('Poll requires a question and at least 2 options.');
        return;
      }

      const widgets = { ...this.state.widgets };
      widgets.poll = {
        active: true,
        question,
        options,
        votes: Array(options.length).fill(0)
      };
      this.updateState({ widgets });
    });

    // Code Snippet sharing
    document.getElementById('widget-code-active').addEventListener('change', (e) => {
      this.updateWidgetState('codeSnippet', 'active', e.target.checked);
    });

    const syncCodeFields = () => {
      const language = document.getElementById('widget-code-lang').value;
      const code = document.getElementById('widget-code-content').value;
      
      const widgets = { ...this.state.widgets };
      widgets.codeSnippet = {
        ...widgets.codeSnippet,
        language,
        code
      };
      this.updateState({ widgets });
    };
    document.getElementById('widget-code-lang').addEventListener('change', syncCodeFields);
    document.getElementById('widget-code-content').addEventListener('blur', syncCodeFields);

    // Reset button
    document.getElementById('reset-state-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all overlays and speaker profiles to defaults?')) {
        // In serverless demo mode there is no /api/reset endpoint; the shim
        // handles a RESET_STATE action and broadcasts a fresh snapshot instead.
        if (this.socket && this.socket.mode === 'shim') {
          this.socket.send(JSON.stringify({ type: 'RESET_STATE' }));
          return;
        }
        fetch('/api/reset', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              this.handleStateUpdate(data.state);
              alert('Overlay state reset successful.');
            }
          })
          .catch(err => console.error('Error resetting state:', err));
      }
    });
  }

  updateWidgetState(widgetKey, fieldKey, val) {
    const widgets = { ...this.state.widgets };
    widgets[widgetKey] = {
      ...widgets[widgetKey],
      [fieldKey]: val
    };
    this.updateState({ widgets });
  }

  updateState(stateDiff) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'UPDATE_STATE',
        state: stateDiff
      }));
    }
  }
}

// Instantiate dashboard on load
window.addEventListener('DOMContentLoaded', () => {
  window.Dashboard = new DashboardController();
});

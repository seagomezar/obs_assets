// Auto-detecting transport for the dashboard and overlays.
//
// Local (npm start): a real WebSocket to the ws://host:3000 hub in server.js.
// GitHub Pages (no backend): a client-side shim that replicates the server's
// reducer and syncs across browser tabs via BroadcastChannel.
//
// It presents the same surface the existing code already uses (onopen,
// onmessage, onclose, onerror, send, readyState) so call sites are unchanged:
// just swap `new WebSocket(url)` for `new OverlayConnection(url)`.
class OverlayConnection {
  constructor(url) {
    this.url = url;
    this.mode = 'connecting';
    this.readyState = 0; // mirrors WebSocket.CONNECTING

    // Consumer-assigned handlers (same names as WebSocket).
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;

    this._ws = null;
    this._channel = null;
    this._probeTimer = null;

    this._tryWebSocket();
  }

  // Attempt a real WebSocket first. If it opens, we behave as a thin pass-through.
  // If it errors, closes before opening, or never opens in time, fall back to
  // the serverless shim (the GitHub Pages path).
  _tryWebSocket() {
    let settled = false;
    const fallback = (reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(this._probeTimer);
      try { if (this._ws) this._ws.close(); } catch (_) { /* ignore */ }
      this._ws = null;

      // When running against the real local server (port 3000), a failure means
      // the server is down or restarting - not that we're on static hosting.
      // Propagate close/error so the controller's own reconnect logic retries,
      // instead of permanently dropping into the demo shim.
      if (typeof location !== 'undefined' && location.port === '3000') {
        this.readyState = 3; // WebSocket.CLOSED
        if (this.onerror) this.onerror(new Error(`WebSocket failed on port 3000: ${reason}`));
        if (this.onclose) this.onclose();
        return;
      }

      console.info(`[OverlayConnection] No live server (${reason}). Using serverless demo shim.`);
      this._startShim();
    };

    try {
      const ws = new WebSocket(this.url);
      this._ws = ws;

      // If nothing connects quickly, assume static hosting and use the shim.
      this._probeTimer = setTimeout(() => fallback('probe timeout'), 1500);

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(this._probeTimer);
        this.mode = 'ws';
        this.readyState = 1; // WebSocket.OPEN
        if (this.onopen) this.onopen();
      };
      ws.onmessage = (event) => {
        if (this.onmessage) this.onmessage(event);
      };
      ws.onclose = () => {
        if (!settled) return fallback('closed before open');
        this.readyState = 3; // WebSocket.CLOSED
        if (this.onclose) this.onclose();
      };
      ws.onerror = (err) => {
        if (!settled) return fallback('connection error');
        if (this.onerror) this.onerror(err);
      };
    } catch (err) {
      // Some browsers throw synchronously for ws:// from an https:// page.
      fallback('constructor threw');
    }
  }

  // ---- Serverless shim -----------------------------------------------------

  _startShim() {
    this.mode = 'shim';
    this.readyState = 1; // present as OPEN so existing send() guards pass

    // Seed state: prefer a snapshot already shared by another tab, else the
    // embedded default. session-scoped persistence keeps reloads consistent.
    this._state = this._loadState();

    if ('BroadcastChannel' in self) {
      this._channel = new BroadcastChannel('obs-assets-demo');
      this._channel.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        // A tab that just started is asking for the current state; answer so it
        // doesn't sit on stale defaults until the next action.
        if (msg.type === 'REQUEST_STATE') {
          this._channel.postMessage({ type: 'STATE_UPDATE', state: this._clone(this._state) });
          return;
        }

        // Adopt any state a peer broadcast, and persist it to THIS tab's
        // sessionStorage so a reload here doesn't revert to defaults.
        if (msg.state) {
          this._state = msg.state;
          this._saveState();
        } else if (msg.type === 'ALERT_TRIGGERED' && msg.alert) {
          this._state.currentAlert = msg.alert;
          this._saveState();
        }

        // Deliver but never re-broadcast (that would loop).
        this._deliver(msg);
      };

      // Ask any already-open tab for the live snapshot.
      this._channel.postMessage({ type: 'REQUEST_STATE' });
    }

    // Announce "connected" and push the initial snapshot, matching the
    // server which sends STATE_UPDATE on connection.
    setTimeout(() => {
      if (this.onopen) this.onopen();
      this._deliver({ type: 'STATE_UPDATE', state: this._clone(this._state) });
    }, 0);
  }

  // Same public method as WebSocket. In ws mode, pass through. In shim mode,
  // run the server's reducer locally, then deliver + broadcast the result.
  send(payload) {
    if (this.mode === 'ws' && this._ws) {
      this._ws.send(payload);
      return;
    }
    if (this.mode !== 'shim') return;

    let action;
    try {
      action = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (_) {
      return;
    }

    const outbound = this._reduce(action);
    outbound.forEach((msg) => {
      this._deliver(msg);
      if (this._channel) this._channel.postMessage(msg);
    });
    this._saveState();
  }

  close() {
    if (this._ws) { try { this._ws.close(); } catch (_) { /* ignore */ } }
    if (this._channel) { try { this._channel.close(); } catch (_) { /* ignore */ } }
    this.readyState = 3;
  }

  // Replicates the switch() in server.js. Returns the list of broadcast
  // messages the server would have emitted for this action.
  _reduce(action) {
    const s = this._state;
    if (!s) return [];
    switch (action.type) {
      case 'UPDATE_STATE': {
        this._state = { ...s, ...action.state };
        return [{ type: 'STATE_UPDATE', state: this._clone(this._state) }];
      }
      case 'TRIGGER_ALERT': {
        s.currentAlert = {
          id: Date.now(),
          type: action.alertType,
          user: action.user,
          value: action.value || '',
          time: Date.now()
        };
        return [{ type: 'ALERT_TRIGGERED', alert: this._clone(s.currentAlert) }];
      }
      case 'CLEAR_ALERT': {
        s.currentAlert = null;
        return [{ type: 'STATE_UPDATE', state: this._clone(this._state) }];
      }
      case 'PLAY_SOUND': {
        return [{ type: 'PLAY_SOUND', soundType: action.soundType }];
      }
      case 'ADD_CHAT_MESSAGE': {
        const chatMsg = {
          id: Date.now(),
          user: action.user,
          message: action.message,
          badge: action.badge || 'javascript'
        };
        if (s.widgets && s.widgets.chat && Array.isArray(s.widgets.chat.messages)) {
          s.widgets.chat.messages.push(chatMsg);
          if (s.widgets.chat.messages.length > 20) s.widgets.chat.messages.shift();
        }
        return [{ type: 'CHAT_MESSAGE_ADDED', message: chatMsg, state: this._clone(this._state) }];
      }
      case 'VOTE_POLL': {
        const i = action.optionIndex;
        if (s.widgets && s.widgets.poll && Array.isArray(s.widgets.poll.votes) && s.widgets.poll.votes[i] !== undefined) {
          s.widgets.poll.votes[i]++;
          return [{ type: 'STATE_UPDATE', state: this._clone(this._state) }];
        }
        return [];
      }
      case 'RESET_STATE': {
        this._state = this._clone(window.DEMO_STATE || {});
        return [{ type: 'STATE_UPDATE', state: this._clone(this._state) }];
      }
      default:
        return [];
    }
  }

  _deliver(msg) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(msg) });
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _loadState() {
    try {
      const saved = sessionStorage.getItem('obs-assets-demo-state');
      if (saved) {
        // Guard against a literal 'null' (JSON.parse('null') === null), which
        // would make this._state null and crash the reducer downstream.
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      }
    } catch (_) { /* ignore */ }
    return this._clone(window.DEMO_STATE || {});
  }

  _saveState() {
    try {
      sessionStorage.setItem('obs-assets-demo-state', JSON.stringify(this._state));
    } catch (_) { /* ignore */ }
  }
}

if (typeof window !== 'undefined') {
  window.OverlayConnection = OverlayConnection;
}

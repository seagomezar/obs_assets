const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STATE_FILE = path.join(__dirname, 'state.json');

// Default state template for resetting or initial load
const DEFAULT_STATE = {
  layout: 'solo',
  theme: 'gemini',
  background: 'particles',
  lowerThirdStyle: 'slide',
  webcamActive: false,
  
  // Speakers / Hosts configuration
  speakers: [
    {
      id: 0,
      name: 'Dr. Evelyn Carter',
      role: 'Web GDE & AI Architect',
      social: '@evelyn_dev',
      badges: ['javascript', 'angular', 'gemini', 'firebase', 'chrome'],
      lowerThirdActive: false
    },
    {
      id: 1,
      name: 'Alex Rivera',
      role: 'Full Stack Tech Lead',
      social: '@alex_codes',
      badges: ['typescript', 'nodejs', 'react', 'tensorflow', 'github'],
      lowerThirdActive: false
    }
  ],
  
  // Active Widgets configuration
  widgets: {
    ticker: {
      active: true,
      text: '🚀 WELCOME TO THE TECH & AI LIVE STREAM! • NEXT-GEN WEB TECHNOLOGIES • GOOGLE DEVELOPER EXPERTS HUB • DEEP DIVE INTO GEMINI MODEL INTEGRATION • ASK QUESTIONS IN CHAT!'
    },
    topic: {
      active: true,
      text: 'Building Real-Time OBS Overlays with WebSockets'
    },
    chat: {
      active: true,
      messages: [
        { id: 1, user: 'dev_guru', message: 'Hello stream! Excited for the Web GDE demo.', badge: 'javascript' },
        { id: 2, user: 'ai_explorer', message: 'Is that Gemini code synthesized locally or calling the cloud API?', badge: 'gemini' },
        { id: 3, user: 'code_newbie', message: 'Wow, the background animation looks so smooth! Is it canvas or CSS?', badge: 'html5' }
      ]
    },
    countdown: {
      active: false,
      duration: 300, // 5 minutes in seconds
      endTime: null
    },
    poll: {
      active: false,
      question: 'Which framework do you use for AI integration?',
      options: ['TensorFlow.js', 'Gemini Web SDK', 'Serverless APIs', 'Vanilla PyTorch'],
      votes: [12, 28, 19, 5]
    },
    codeSnippet: {
      active: false,
      code: `// Initialize Gemini Client\nconst ai = new GeminiClient({\n  apiKey: process.env.GEMINI_API_KEY,\n  model: "gemini-1.5-flash"\n});\n\nconst response = await ai.generateText({\n  prompt: "Synthesize stream music"\n});\nconsole.log(response.text);`,
      language: 'javascript'
    },
    goal: {
      active: true,
      title: 'Subscriber Goal',
      current: 84,
      target: 100
    },
    qa: {
      active: false,
      question: 'How do you handle audio synthesizers inside OBS Browser Sources?',
      author: 'obs_coder'
    }
  },
  
  // Alerts System
  currentAlert: null // e.g. { type: 'follow', user: 'TechNovice', text: 'followed the stream!', time: Date.now() }
};

// Check for --reset command-line flag
const shouldReset = process.argv.includes('--reset');

// Load or initialize state
let state = { ...DEFAULT_STATE };
if (!shouldReset && fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    console.log('Successfully loaded state from file.');
  } catch (err) {
    console.error('Error reading state.json. Initializing with defaults. Error:', err);
    state = { ...DEFAULT_STATE };
  }
} else {
  console.log(shouldReset ? 'Resetting state as requested.' : 'State file not found. Creating default state.');
  saveState(state);
}

function saveState(data) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving state to state.json:', err);
  }
}

// Initialize server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Simple API endpoint to fetch raw state
app.get('/api/state', (req, res) => {
  res.json(state);
});

// Reset endpoint
app.post('/api/reset', (req, res) => {
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState(state);
  broadcast({ type: 'STATE_UPDATE', state });
  res.json({ success: true, state });
});

// WebSocket Hub
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket Hub');
  
  // Send current state on connection
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', state }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'UPDATE_STATE':
          // Update nested properties or root properties
          state = { ...state, ...data.state };
          saveState(state);
          // Broadcast state to all connected clients
          broadcast({ type: 'STATE_UPDATE', state });
          break;
          
        case 'TRIGGER_ALERT':
          // Set current alert state
          state.currentAlert = {
            id: Date.now(),
            type: data.alertType, // 'follow', 'subscriber', 'cheer', 'sponsor'
            user: data.user,
            value: data.value || '',
            time: Date.now()
          };
          saveState(state);
          // Broadcast the alert trigger
          broadcast({ type: 'ALERT_TRIGGERED', alert: state.currentAlert });
          break;
          
        case 'CLEAR_ALERT':
          state.currentAlert = null;
          saveState(state);
          broadcast({ type: 'STATE_UPDATE', state });
          break;
          
        case 'PLAY_SOUND':
          // Request client audio playback
          broadcast({ type: 'PLAY_SOUND', soundType: data.soundType });
          break;
          
        case 'ADD_CHAT_MESSAGE':
          // Append chat message to the queue
          const chatMsg = {
            id: Date.now(),
            user: data.user,
            message: data.message,
            badge: data.badge || 'javascript'
          };
          state.widgets.chat.messages.push(chatMsg);
          // Keep only the last 20 messages
          if (state.widgets.chat.messages.length > 20) {
            state.widgets.chat.messages.shift();
          }
          saveState(state);
          // Broadcast message event
          broadcast({ type: 'CHAT_MESSAGE_ADDED', message: chatMsg, state });
          break;
          
        case 'VOTE_POLL':
          const optionIndex = data.optionIndex;
          if (state.widgets.poll.votes[optionIndex] !== undefined) {
            state.widgets.poll.votes[optionIndex]++;
            saveState(state);
            broadcast({ type: 'STATE_UPDATE', state });
          }
          break;
          
        default:
          console.warn('Unknown message type received:', data.type);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Helper function to broadcast data to all active websockets
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Start Server
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  OBS Tech & AI Stream Assets Server Running!`);
  console.log(`  - Dashboard: http://localhost:${PORT}/dashboard/`);
  console.log(`  - Unified Overlay: http://localhost:${PORT}/overlays/unified.html`);
  console.log(`  - Local State File: ${STATE_FILE}`);
  console.log(`====================================================`);
});

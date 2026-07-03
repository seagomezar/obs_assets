// Synthesized Sound FX Engine using Web Audio API (6 distinct audio assets)
class StreamSynthEngine {
  constructor() {
    this.ctx = null;
  }

  // Lazily initialize AudioContext to bypass browser autoplay restrictions
  initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Asset 1: Tech Bloop (Friendly UI chime for followers/subs)
  playBloop() {
    this.initContext();
    const now = this.ctx.currentTime;
    
    // Create oscillator and gain node
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Quick double-pitch jump
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.setValueAtTime(0.3, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Asset 2: Cyber Swoosh (Smooth layout transition sweep)
  playSwoosh() {
    this.initContext();
    const now = this.ctx.currentTime;
    const duration = 0.5;
    
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Create filter to sweep frequency
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3500, now + duration);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
    noise.stop(now + duration);
  }

  // Asset 3: Glitch Error (Glitchy synth for warnings/cracks)
  playGlitch() {
    this.initContext();
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Rapid pitch modulation and volume drops simulating standard computer glitch
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(120, now + 0.05);
    osc.frequency.setValueAtTime(600, now + 0.08);
    osc.frequency.setValueAtTime(80, now + 0.12);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.01, now + 0.04);
    gain.gain.setValueAtTime(0.12, now + 0.06);
    gain.gain.setValueAtTime(0.01, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // Asset 4: Sub Drop (Deep bass drop transition marker)
  playSubDrop() {
    this.initContext();
    const now = this.ctx.currentTime;
    const duration = 1.2;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // Frequency sweeps from 120Hz down to a sub-bass 35Hz
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + duration);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  // Asset 5: Chime Bell (Crystal bell chime sound for focus topics)
  playChime() {
    this.initContext();
    const now = this.ctx.currentTime;
    
    // Create multiple oscillators for bell overtones
    const ratios = [1.0, 1.5, 2.0, 2.63];
    const gainNodes = [];
    
    ratios.forEach((ratio, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 * ratio, now); // Root frequency A5 (880Hz)
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      // Higher overtones decay faster
      const decay = 1.5 / (index + 1);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15 / (index + 1), now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  }

  // Asset 6: Tech Fanfare (Harmonic arpeggio chord for subscriber goals/milestones)
  playFanfare() {
    this.initContext();
    const now = this.ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    const duration = 1.0;
    
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + (index * 0.08)); // Stagger note starts
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      const noteStart = now + (index * 0.08);
      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);
      
      osc.start(now);
      osc.stop(noteStart + duration + 0.1);
    });
  }
}

// Export class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StreamSynthEngine;
} else {
  window.StreamSynthEngine = new StreamSynthEngine();
}

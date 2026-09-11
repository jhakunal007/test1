/**
 * SoundController - Procedural Sci-Fi Web Audio Engine
 * Generates ambient space drone, ether pads, telemetry chirps, and hyperspace warp sound FX.
 */

export class SoundController {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.droneGain = null;
    this.padGain = null;
    this.oscillators = [];
    this.visualizerData = [0, 0, 0, 0];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Setup Drone
    this.setupDrone();
  }

  setupDrone() {
    // Low sub-bass drone
    const subOsc1 = this.ctx.createOscillator();
    const subOsc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();

    subOsc1.type = 'sawtooth';
    subOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 note
    subOsc2.type = 'triangle';
    subOsc2.frequency.setValueAtTime(55.6, this.ctx.currentTime); // Slight detune for phasing

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, this.ctx.currentTime);
    filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);

    subOsc1.connect(filter);
    subOsc2.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    subOsc1.start();
    subOsc2.start();
    this.oscillators.push(subOsc1, subOsc2);

    // Ethereal Pad
    const padOsc = this.ctx.createOscillator();
    const padFilter = this.ctx.createBiquadFilter();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(220, this.ctx.currentTime); // A3

    // Low Frequency Oscillator for subtle pitch vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.2, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(3, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(padOsc.frequency);
    lfo.start();

    padFilter.type = 'bandpass';
    padFilter.frequency.setValueAtTime(440, this.ctx.currentTime);
    padFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.padGain = this.ctx.createGain();
    this.padGain.gain.setValueAtTime(0, this.ctx.currentTime);

    padOsc.connect(padFilter);
    padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);

    padOsc.start();
    this.oscillators.push(padOsc, lfo);
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;
    const now = this.ctx.currentTime;

    if (this.isPlaying) {
      this.droneGain.gain.setTargetAtTime(0.4, now, 1.5);
      this.padGain.gain.setTargetAtTime(0.25, now, 2.0);
      this.playChirp(880, 0.08);
    } else {
      this.droneGain.gain.setTargetAtTime(0, now, 0.8);
      this.padGain.gain.setTargetAtTime(0, now, 0.8);
    }

    return this.isPlaying;
  }

  // Play telemetry chirp on interaction or stage change
  playChirp(freq = 1200, duration = 0.05) {
    if (!this.ctx || !this.isPlaying) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio context might be suspended
    }
  }

  // Play hyperspace warp sound fx
  playWarp() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 1.2);
    osc.frequency.exponentialRampToValueAtTime(40, now + 2.8);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(4000, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(200, now + 2.8);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 3.0);
  }

  // Modulate drone pitch based on scroll speed
  updateScrollSpeed(speedRatio) {
    if (!this.ctx || !this.isPlaying || !this.droneGain) return;
    const now = this.ctx.currentTime;
    const baseFreq = 55 + Math.min(speedRatio * 60, 120);
    if (this.oscillators[0]) {
      this.oscillators[0].frequency.setTargetAtTime(baseFreq, now, 0.2);
    }
  }
}

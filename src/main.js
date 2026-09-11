import { World } from './world/World.js';
import { SoundController } from './audio/SoundController.js';
import { ScrollTimeline } from './scroll/ScrollTimeline.js';

class App {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.sound = new SoundController();
    this.world = new World(this.container);
    this.timeline = new ScrollTimeline(this.world, this.sound);

    this.initClock();
    this.initAudioToggle();
    this.initPreloader();
    this.initWarpTrigger();
  }

  initClock() {
    const clockEl = document.getElementById('hud-clock');
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      if (clockEl) clockEl.textContent = `${h}:${m}:${s} UTC`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  initAudioToggle() {
    const btnAudio = document.getElementById('btn-audio');
    const audioLabel = document.getElementById('audio-label');

    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isPlaying = this.sound.toggle();
        if (isPlaying) {
          btnAudio.classList.add('playing');
          if (audioLabel) audioLabel.textContent = 'SOUND: ON';
        } else {
          btnAudio.classList.remove('playing');
          if (audioLabel) audioLabel.textContent = 'SOUND: OFF';
        }
      });
    }
  }

  initPreloader() {
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');
    const loaderPercent = document.getElementById('loader-percent');
    const loaderStatus = document.getElementById('loader-status');
    const btnEnter = document.getElementById('btn-enter');

    const statuses = [
      'INITIALIZING QUANTUM TELEMETRY...',
      'CALIBRATING DEEP FIELD SENSORS...',
      'MAPPING ORBITAL TRAJECTORY...',
      'STABILIZING EVENT HORIZON...',
      'SYSTEMS READY FOR DEPARTURE'
    ];

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 8;
      if (progress > 100) progress = 100;

      const statusIdx = Math.min(Math.floor((progress / 100) * statuses.length), statuses.length - 1);
      if (loaderStatus) loaderStatus.textContent = statuses[statusIdx];
      if (loaderBar) loaderBar.style.width = `${progress}%`;
      if (loaderPercent) loaderPercent.textContent = `${progress.toString().padStart(2, '0')}%`;

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 1200);
          }
        }, 600);
      }
    }, 120);
  }

  initWarpTrigger() {
    const btnStart = document.getElementById('btn-start');
    const warpOverlay = document.getElementById('warp-overlay');
    const warpModal = document.getElementById('warp-modal');
    const btnModalClose = document.getElementById('btn-modal-close');
    const btnModalRepeat = document.getElementById('btn-modal-repeat');

    if (btnStart) {
      btnStart.addEventListener('click', () => {
        // Hyperspace audio & visual effect
        this.sound.playWarp();
        if (this.world.starfield) {
          this.world.starfield.setWarpFactor(35.0);
        }

        if (warpOverlay) {
          warpOverlay.classList.add('active');
          setTimeout(() => {
            warpOverlay.classList.remove('active');
            if (warpModal && typeof warpModal.showModal === 'function') {
              warpModal.showModal();
            }
          }, 800);
        }
      });
    }

    if (btnModalClose && warpModal) {
      btnModalClose.addEventListener('click', () => {
        warpModal.close();
        if (this.world.starfield) {
          this.world.starfield.setWarpFactor(1.0);
        }
      });
    }

    if (btnModalRepeat && warpModal) {
      btnModalRepeat.addEventListener('click', () => {
        warpModal.close();
        if (this.world.starfield) {
          this.world.starfield.setWarpFactor(1.0);
        }
        this.timeline.scrollToRatio(0);
      });
    }
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new App();
});

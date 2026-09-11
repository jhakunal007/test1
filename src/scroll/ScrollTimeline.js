import * as THREE from 'three';
import Lenis from 'lenis';

export class ScrollTimeline {
  constructor(world, soundController) {
    this.world = world;
    this.sound = soundController;

    // Camera Flight Waypoints (Progress 0.0 -> 1.0)
    // Each waypoint specifies: progress, cameraPos (x, y, z), lookTarget (x, y, z)
    this.waypoints = [
      // Scene 1: The Launch (0.00 - 0.22)
      { p: 0.00, pos: new THREE.Vector3(0, 5, 0), look: new THREE.Vector3(0, 0, -180) },
      { p: 0.12, pos: new THREE.Vector3(2, 6, -65), look: new THREE.Vector3(0, 0, -180) },
      { p: 0.22, pos: new THREE.Vector3(8, 7, -135), look: new THREE.Vector3(0, 0, -180) },

      // Scene 2: Deep Space (0.28 - 0.52)
      { p: 0.28, pos: new THREE.Vector3(18, 12, -210), look: new THREE.Vector3(45, 15, -420) },
      { p: 0.38, pos: new THREE.Vector3(-15, 6, -340), look: new THREE.Vector3(60, 20, -460) },
      { p: 0.50, pos: new THREE.Vector3(12, -8, -490), look: new THREE.Vector3(0, 0, -740) },

      // Scene 3: The Space Station Orbit (0.55 - 0.78)
      { p: 0.58, pos: new THREE.Vector3(48, 22, -660), look: new THREE.Vector3(0, 0, -740) },
      { p: 0.68, pos: new THREE.Vector3(10, 42, -735), look: new THREE.Vector3(0, 0, -740) },
      { p: 0.78, pos: new THREE.Vector3(-45, 12, -790), look: new THREE.Vector3(0, 0, -1120) },

      // Scene 4: The Portal (0.82 - 1.00)
      { p: 0.84, pos: new THREE.Vector3(-15, 6, -920), look: new THREE.Vector3(0, 0, -1120) },
      { p: 0.93, pos: new THREE.Vector3(0, 2, -1040), look: new THREE.Vector3(0, 0, -1120) },
      { p: 1.00, pos: new THREE.Vector3(0, 0, -1130), look: new THREE.Vector3(0, 0, -1350) } // Flown through portal ring
    ];

    // Spline curve for smooth cinematic interpolation
    this.splinePositions = this.waypoints.map(w => w.pos);
    this.splineLooks = this.waypoints.map(w => w.look);
    this.posCurve = new THREE.CatmullRomCurve3(this.splinePositions);
    this.lookCurve = new THREE.CatmullRomCurve3(this.splineLooks);

    this.currentPos = new THREE.Vector3().copy(this.waypoints[0].pos);
    this.currentLook = new THREE.Vector3().copy(this.waypoints[0].look);
    this.targetPos = new THREE.Vector3().copy(this.waypoints[0].pos);
    this.targetLook = new THREE.Vector3().copy(this.waypoints[0].look);

    this.scrollProgress = 0;
    this.targetProgress = 0;

    this.initDOMReferences();
    this.initLenis();
  }

  initDOMReferences() {
    this.railIndicator = document.getElementById('rail-indicator');
    this.railPercent = document.getElementById('rail-percent');
    this.hudCoords = document.getElementById('hud-coords');
    this.navSteps = document.querySelectorAll('.nav-step');

    this.sceneContents = [
      document.querySelector('#scene-launch .scene-content'),
      document.querySelector('#scene-deep-space .scene-content'),
      document.querySelector('#scene-station .scene-content'),
      document.querySelector('#scene-portal .scene-content')
    ];

    // Nav clicks
    this.navSteps.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetRatio = parseFloat(btn.dataset.target);
        this.scrollToRatio(targetRatio);
      });
    });
  }

  initLenis() {
    this.lenis = new Lenis({
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.8
    });

    this.lenis.on('scroll', (e) => {
      this.targetProgress = e.progress;
      if (this.sound) {
        const speed = Math.abs(e.velocity) * 0.05;
        this.sound.updateScrollSpeed(speed);
      }
    });

    // Lenis RAF loop
    const raf = (time) => {
      this.lenis.raf(time);
      this.updateFlight();
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  scrollToRatio(ratio) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    this.lenis.scrollTo(ratio * maxScroll, { duration: 2.2 });
  }

  updateFlight() {
    // Smooth lerp to target progress
    this.scrollProgress += (this.targetProgress - this.scrollProgress) * 0.08;
    const clampedProgress = THREE.MathUtils.clamp(this.scrollProgress, 0, 1);

    // Sample Catmull-Rom 3D Splines
    this.posCurve.getPointAt(clampedProgress, this.targetPos);
    this.lookCurve.getPointAt(clampedProgress, this.targetLook);

    // Smooth camera lerp
    this.currentPos.lerp(this.targetPos, 0.12);
    this.currentLook.lerp(this.targetLook, 0.12);

    // Set base camera position (World adds mouse parallax on top of this)
    this.world.baseCameraPos = this.currentPos.clone();
    this.world.camera.position.copy(this.currentPos);
    this.world.camera.lookAt(this.currentLook);

    // Accelerate starfield dust near the Portal (Progress > 0.82)
    if (this.world.starfield) {
      if (clampedProgress > 0.82) {
        const factor = 1.0 + (clampedProgress - 0.82) * 18.0;
        this.world.starfield.setWarpFactor(factor);
      } else {
        this.world.starfield.setWarpFactor(1.0);
      }
    }

    this.updateHUD(clampedProgress);
  }

  updateHUD(p) {
    // 1. Update Rail progress
    if (this.railIndicator) {
      this.railIndicator.style.top = `${p * 176}px`;
    }
    if (this.railPercent) {
      const pct = Math.round(p * 100);
      this.railPercent.textContent = `${pct.toString().padStart(3, '0')}%`;
    }

    // 2. Active Scene Index (0, 1, 2, 3)
    let activeIdx = 0;
    let velocityStr = '0.12c';
    let sectorStr = 'SEC: 01 // LAUNCH';

    if (p < 0.25) {
      activeIdx = 0;
      velocityStr = '0.12c';
      sectorStr = 'SEC: 01 // LAUNCH';
    } else if (p < 0.55) {
      activeIdx = 1;
      velocityStr = '0.45c';
      sectorStr = 'SEC: 02 // DEEP SPACE';
    } else if (p < 0.82) {
      activeIdx = 2;
      velocityStr = '0.22c (APPROACH)';
      sectorStr = 'SEC: 03 // OUTPOST AETHON';
    } else {
      activeIdx = 3;
      velocityStr = '0.88c (WARP THRESHOLD)';
      sectorStr = 'SEC: 04 // SINGULARITY PORTAL';
    }

    // Update Telemetry Header
    if (this.hudCoords) {
      const lat = (-12.449 - p * 42.1).toFixed(3);
      const long = (104.882 + p * 86.4).toFixed(3);
      this.hudCoords.textContent = `${sectorStr} // V: ${velocityStr} // LAT: ${lat} // LONG: ${long}`;
    }

    // Update Nav Step Active States
    this.navSteps.forEach((step, idx) => {
      if (idx === activeIdx) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });

    // Update Scene Text Visibility with smooth proximity fade
    const sceneRanges = [
      { center: 0.08, width: 0.16 }, // Scene 1
      { center: 0.38, width: 0.18 }, // Scene 2
      { center: 0.68, width: 0.18 }, // Scene 3
      { center: 0.95, width: 0.15 }  // Scene 4
    ];

    sceneRanges.forEach((range, idx) => {
      const content = this.sceneContents[idx];
      if (!content) return;

      const dist = Math.abs(p - range.center);
      if (dist < range.width) {
        // Fade in
        const alpha = Math.max(0, 1 - dist / range.width);
        content.classList.add('active');
        content.style.opacity = alpha.toFixed(3);
        content.style.transform = `translateY(calc(-50% + ${(dist / range.width) * 15}px))`;
      } else {
        content.classList.remove('active');
        content.style.opacity = '0';
      }
    });
  }
}

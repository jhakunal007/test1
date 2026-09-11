import * as THREE from 'three';
import { Starfield } from './Starfield.js';
import { Planet } from './Planet.js';
import { DeepSpace } from './DeepSpace.js';
import { SpaceStation } from './SpaceStation.js';
import { Portal } from './Portal.js';

export class World {
  constructor(container) {
    this.container = container;

    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLighting();
    this.initObjects();
    this.initEvents();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030509);
    // Subtle deep space distance fog
    this.scene.fog = new THREE.FogExp2(0x030509, 0.0009);
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2500
    );
    // Starting position for Scene 1 (looking at Planet)
    this.camera.position.set(0, 5, 0);
    this.cameraTarget = new THREE.Vector3(0, 0, -180);
    this.camera.lookAt(this.cameraTarget);
  }

  initLighting() {
    // 1. Ambient Cosmic Fill
    const ambientLight = new THREE.AmbientLight(0x0a1426, 1.4);
    this.scene.add(ambientLight);

    // 2. Primary Cosmic Sun Light (Key Light)
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    this.sunLight.position.set(120, 80, 50);
    this.scene.add(this.sunLight);

    // 3. Electric Cyan Rim Light
    this.rimLight = new THREE.DirectionalLight(0x00f0ff, 1.8);
    this.rimLight.position.set(-100, -30, -200);
    this.scene.add(this.rimLight);

    // 4. Violet Deep Nebula Accent Light
    this.accentLight = new THREE.DirectionalLight(0x7928ca, 1.5);
    this.accentLight.position.set(80, -60, -600);
    this.scene.add(this.accentLight);
  }

  initObjects() {
    this.starfield = new Starfield(this.scene);
    this.planet = new Planet(this.scene);
    this.deepSpace = new DeepSpace(this.scene);
    this.spaceStation = new SpaceStation(this.scene);
    this.portal = new Portal(this.scene);
  }

  initEvents() {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
  }

  onMouseMove(e) {
    this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    this.mouse.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  onTouchMove(e) {
    if (e.touches.length > 0) {
      this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Mouse parallax lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    // Subtle parallax tilt on camera
    if (this.baseCameraPos) {
      this.camera.position.x = this.baseCameraPos.x + this.mouse.x * 3.5;
      this.camera.position.y = this.baseCameraPos.y - this.mouse.y * 2.5;
    }

    // Update 3D components
    if (this.starfield) this.starfield.update(time, delta);
    if (this.planet) this.planet.update(time);
    if (this.deepSpace) this.deepSpace.update(time);
    if (this.spaceStation) this.spaceStation.update(time);
    if (this.portal) this.portal.update(time);

    // Render
    this.renderer.render(this.scene, this.camera);
  }
}

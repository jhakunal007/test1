import * as THREE from 'three';

export class Planet {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.initTextures();
    this.initPlanetMesh();
    this.initCloudMesh();
    this.initAtmosphereGlow();

    // Position in Scene 1 (floating majestically at Z: -150)
    this.group.position.set(0, 0, -180);
    this.scene.add(this.group);
  }

  initTextures() {
    // Generate high-resolution procedural planetary map
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d');

    // Deep ocean base
    ctx.fillStyle = '#06132b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Procedural continents & islands using simplex-like layered noise
    for (let i = 0; i < 45; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const r = Math.random() * 120 + 30;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, '#103952'); // inland
      grad.addColorStop(0.5, '#1e5f74'); // coastal
      grad.addColorStop(0.85, '#0b354d'); // shallow water
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mountain ridges & continental details
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height;
      const r = Math.random() * 60 + 15;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, '#2e787a');
      grad.addColorStop(0.6, '#155255');
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // City lights / bioluminescent veins on dark side
    for (let i = 0; i < 150; i++) {
      const lx = Math.random() * canvas.width;
      const ly = Math.random() * canvas.height;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(lx, ly, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }

    this.planetTexture = new THREE.CanvasTexture(canvas);
    this.planetTexture.wrapS = THREE.RepeatWrapping;
    this.planetTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Clouds texture
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = size;
    cloudCanvas.height = size / 2;
    const cCtx = cloudCanvas.getContext('2d');
    cCtx.fillStyle = 'transparent';
    cCtx.fillRect(0, 0, cloudCanvas.width, cloudCanvas.height);

    for (let i = 0; i < 50; i++) {
      const cx = Math.random() * cloudCanvas.width;
      const cy = (Math.random() * 0.7 + 0.15) * cloudCanvas.height;
      const rx = Math.random() * 160 + 50;
      const ry = Math.random() * 35 + 10;

      const grad = cCtx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      grad.addColorStop(0.5, 'rgba(230, 245, 255, 0.35)');
      grad.addColorStop(1, 'transparent');

      cCtx.save();
      cCtx.translate(cx, cy);
      cCtx.scale(1, ry / rx);
      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(0, 0, rx, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.restore();
    }

    this.cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    this.cloudTexture.wrapS = THREE.RepeatWrapping;
  }

  initPlanetMesh() {
    const geometry = new THREE.SphereGeometry(32, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.planetTexture,
      roughness: 0.65,
      metalness: 0.15,
      bumpScale: 0.08
    });

    this.planetMesh = new THREE.Mesh(geometry, material);
    this.group.add(this.planetMesh);
  }

  initCloudMesh() {
    const cloudGeo = new THREE.SphereGeometry(32.4, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: this.cloudTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      roughness: 0.9
    });

    this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.group.add(this.cloudMesh);
  }

  initAtmosphereGlow() {
    // Atmospheric Fresnel limb glow halo
    const glowGeo = new THREE.SphereGeometry(36, 64, 64);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00d4ff) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          
          // Fresnel calculation for rim lighting
          float rim = 1.0 - max(dot(viewDir, normal), 0.0);
          float intensity = pow(rim, 3.5) * 1.6;

          gl_FragColor = vec4(glowColor, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glowMesh);
  }

  update(time) {
    // Constant rotation of planet and clouds
    if (this.planetMesh) {
      this.planetMesh.rotation.y = time * 0.04;
    }
    if (this.cloudMesh) {
      this.cloudMesh.rotation.y = time * 0.055;
    }
  }
}

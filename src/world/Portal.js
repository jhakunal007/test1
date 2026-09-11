import * as THREE from 'three';

export class Portal {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Position at Scene 4 climax (Z: -1120)
    this.group.position.set(0, 0, -1120);

    this.initOuterRing();
    this.initVortexShader();
    this.initAccretionParticles();
    this.initVolumetricBeams();

    this.scene.add(this.group);
  }

  initOuterRing() {
    // 1. Massive Primary Metallic Torus Ring
    const ringGeo = new THREE.TorusGeometry(46, 3.8, 32, 100);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      metalness: 0.95,
      roughness: 0.15
    });

    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.group.add(this.ringMesh);

    // 2. Glowing Inset Energy Rail
    const energyRailGeo = new THREE.TorusGeometry(46, 1.2, 16, 64);
    const energyRailMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true
    });
    this.energyRail = new THREE.Mesh(energyRailGeo, energyRailMat);
    this.group.add(this.energyRail);

    // 3. Chevron Locks / Power Pylons around the perimeter (8 points)
    this.chevrons = [];
    const chevronGeo = new THREE.BoxGeometry(4.5, 9, 7);
    const chevronMat = new THREE.MeshStandardMaterial({
      color: 0x2d3748,
      metalness: 0.9,
      roughness: 0.2
    });
    const chevronGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff
    });

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const chevronGroup = new THREE.Group();

      const base = new THREE.Mesh(chevronGeo, chevronMat);
      const emitter = new THREE.Mesh(
        new THREE.BoxGeometry(2, 4, 7.2),
        chevronGlowMat
      );
      chevronGroup.add(base, emitter);

      chevronGroup.position.set(
        Math.cos(angle) * 46,
        Math.sin(angle) * 46,
        0
      );
      chevronGroup.rotation.z = angle + Math.PI / 2;

      this.chevrons.push(chevronGroup);
      this.group.add(chevronGroup);
    }
  }

  initVortexShader() {
    // Dynamic Event Horizon / Singularity Vortex Disk
    const vortexGeo = new THREE.CircleGeometry(44, 96);
    this.vortexMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(0x00f0ff) }, // Cyan
        uColor2: { value: new THREE.Color(0xa855f7) }, // Purple
        uColorCore: { value: new THREE.Color(0xffffff) } // Core
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColorCore;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - vec2(0.5);
          float r = length(center) * 2.0;
          if (r > 1.0) discard;

          float theta = atan(center.y, center.x);

          // Spiral warp formula
          float spiral = theta * 3.0 + r * 14.0 - uTime * 4.0;
          float wave = sin(spiral) * 0.5 + 0.5;

          // Secondary counter ripple
          float counterSpiral = -theta * 2.0 + r * 8.0 + uTime * 2.5;
          float wave2 = cos(counterSpiral) * 0.5 + 0.5;

          float intensity = wave * wave2;

          // Color blending
          vec3 color = mix(uColor1, uColor2, r);
          color += intensity * 0.45;

          // Blazing white singularity in the center
          float coreIntensity = smoothstep(0.35, 0.0, r);
          color = mix(color, uColorCore, coreIntensity * 0.95);

          // Rim soft fade
          float alpha = smoothstep(1.0, 0.7, r) * 0.85;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.vortexMesh = new THREE.Mesh(vortexGeo, this.vortexMaterial);
    this.group.add(this.vortexMesh);
  }

  initAccretionParticles() {
    // 600 cosmic particles spiraling inward toward the portal core
    const particleCount = 650;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    this.particleData = [];

    for (let i = 0; i < particleCount; i++) {
      const radius = 10 + Math.random() * 55;
      const angle = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 40;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 0.0;
      colors[i * 3 + 1] = 0.95;
      colors[i * 3 + 2] = 1.0;

      this.particleData.push({
        radius: radius,
        angle: angle,
        z: z,
        speed: 0.8 + Math.random() * 1.5,
        inwardSpeed: 0.15 + Math.random() * 0.35
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, particleMat);
    this.group.add(this.particles);
  }

  initVolumetricBeams() {
    // Corona glow sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(0, 240, 255, 0.8)');
    grad.addColorStop(0.6, 'rgba(168, 85, 247, 0.3)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    this.coreGlow = new THREE.Sprite(spriteMat);
    this.coreGlow.scale.set(130, 130, 1);
    this.group.add(this.coreGlow);
  }

  update(time) {
    // Animate vortex shader
    if (this.vortexMaterial) {
      this.vortexMaterial.uniforms.uTime.value = time;
    }

    // Slowly rotate outer ring & energy rail
    if (this.ringMesh) {
      this.ringMesh.rotation.z = time * 0.04;
    }
    if (this.energyRail) {
      this.energyRail.rotation.z = -time * 0.08;
    }

    // Pulse core glow scale
    if (this.coreGlow) {
      const s = 130 + Math.sin(time * 3) * 12;
      this.coreGlow.scale.set(s, s, 1);
    }

    // Inward particle vortex animation
    if (this.particles) {
      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        p.angle += 0.02 * p.speed;
        p.radius -= p.inwardSpeed;

        // Reset if sucked into core
        if (p.radius < 2) {
          p.radius = 58;
          p.z = (Math.random() - 0.5) * 40;
        }

        pos[i * 3] = Math.cos(p.angle) * p.radius;
        pos[i * 3 + 1] = Math.sin(p.angle) * p.radius;
        pos[i * 3 + 2] = p.z;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }
}

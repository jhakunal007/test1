import * as THREE from 'three';

export class Starfield {
  constructor(scene) {
    this.scene = scene;
    this.warpSpeed = 1.0;
    this.targetWarpSpeed = 1.0;

    this.initBackgroundStars();
    this.initFloatingDust();
    this.initNebulaGlow();
  }

  initBackgroundStars() {
    const starCount = 3500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const colorPalette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0x9ed8ff),
      new THREE.Color(0xd6e5ff),
      new THREE.Color(0xffd29e),
      new THREE.Color(0xa855f7)
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute in a large volume along the flight corridor (Z: 200 to -1400)
      const x = (Math.random() - 0.5) * 800;
      const y = (Math.random() - 0.5) * 600;
      const z = (Math.random() - 0.5) * 1600 - 400;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 2.5 + 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom point shader with soft radial alpha
    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;

        void main() {
          vColor = color;
          // Subtle twinkle
          vTwinkle = sin(uTime * 1.5 + position.x * 0.05 + position.z * 0.05) * 0.3 + 0.7;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * vTwinkle * (280.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;

        void main() {
          // Circular particle with soft glow falloff
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, dist) * vTwinkle;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.stars = new THREE.Points(geometry, starMaterial);
    this.scene.add(this.stars);
  }

  initFloatingDust() {
    const dustCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(dustCount * 3);
    const velocities = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1000 - 300;

      velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 2] = Math.random() * 0.2 + 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustVelocities = velocities;

    const dustMaterial = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 1.8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.dust = new THREE.Points(geometry, dustMaterial);
    this.scene.add(this.dust);
  }

  initNebulaGlow() {
    // Large soft celestial nebula clouds in the background
    this.nebulaGroup = new THREE.Group();
    const colors = [0x0070f3, 0x7928ca, 0x00f0ff, 0x2e0854];

    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.3, 'rgba(120, 40, 240, 0.4)');
      grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: texture,
        color: colors[i % colors.length],
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400,
        -200 - i * 200
      );
      sprite.scale.set(350 + Math.random() * 200, 350 + Math.random() * 200, 1);
      this.nebulaGroup.add(sprite);
    }

    this.scene.add(this.nebulaGroup);
  }

  setWarpFactor(target) {
    this.targetWarpSpeed = target;
  }

  update(time, delta) {
    if (this.stars && this.stars.material.uniforms) {
      this.stars.material.uniforms.uTime.value = time;
    }

    // Lerp warp speed
    this.warpSpeed += (this.targetWarpSpeed - this.warpSpeed) * 0.08;

    // Stream dust along camera axis
    if (this.dust) {
      const pos = this.dust.geometry.attributes.position.array;
      const count = pos.length / 3;

      for (let i = 0; i < count; i++) {
        pos[i * 3 + 2] += this.dustVelocities[i * 3 + 2] * (1.0 + this.warpSpeed * 4.0);

        // Wrap around when passing viewer
        if (pos[i * 3 + 2] > 150) {
          pos[i * 3 + 2] = -900;
          pos[i * 3] = (Math.random() - 0.5) * 250;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 180;
        }
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

    // Slowly rotate nebula clouds
    if (this.nebulaGroup) {
      this.nebulaGroup.rotation.z = time * 0.01;
    }
  }
}

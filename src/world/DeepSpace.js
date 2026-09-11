import * as THREE from 'three';

export class DeepSpace {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.initAsteroids();
    this.initGasGiantAndRings();
    this.initGlowingMoon();
    this.initSpaceDebris();

    this.scene.add(this.group);
  }

  initAsteroids() {
    this.asteroidCount = 180;
    // Dodecahedron geometry with vertex perturbation for rugged rocky asteroids
    const baseGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const pos = baseGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.multiplyScalar(1.0 + (Math.random() - 0.5) * 0.35);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    baseGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a6372,
      roughness: 0.85,
      metalness: 0.25,
      flatShading: true
    });

    this.asteroids = new THREE.InstancedMesh(baseGeo, rockMat, this.asteroidCount);

    this.asteroidRotations = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.asteroidCount; i++) {
      // Cluster along corridor around Z: -320 to -550
      const radius = 35 + Math.random() * 95;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.6 + (Math.random() - 0.5) * 20;
      const z = -320 - Math.random() * 240;

      dummy.position.set(x, y, z);
      const scale = Math.random() * 2.8 + 0.6;
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.updateMatrix();

      this.asteroids.setMatrixAt(i, dummy.matrix);

      this.asteroidRotations.push({
        rx: (Math.random() - 0.5) * 0.015,
        ry: (Math.random() - 0.5) * 0.02,
        rz: (Math.random() - 0.5) * 0.015,
        pos: new THREE.Vector3(x, y, z),
        scale: dummy.scale.clone(),
        rot: dummy.rotation.clone()
      });
    }

    this.asteroids.instanceMatrix.needsUpdate = true;
    this.group.add(this.asteroids);
  }

  initGasGiantAndRings() {
    this.gasGiantGroup = new THREE.Group();
    this.gasGiantGroup.position.set(95, 30, -460);

    // Gas giant surface with bands
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Gradient bands of deep violet, magenta, and cyan
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1c0b38');
    grad.addColorStop(0.2, '#481e6b');
    grad.addColorStop(0.35, '#26114a');
    grad.addColorStop(0.5, '#6a2882');
    grad.addColorStop(0.65, '#3a1254');
    grad.addColorStop(0.85, '#17062e');
    grad.addColorStop(1, '#0c0319');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle atmospheric swirls
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    for (let i = 0; i < 15; i++) {
      ctx.fillRect(0, Math.random() * 256, 512, Math.random() * 12 + 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    const geo = new THREE.SphereGeometry(28, 48, 48);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.5,
      metalness: 0.1
    });

    this.gasGiant = new THREE.Mesh(geo, mat);
    this.gasGiantGroup.add(this.gasGiant);

    // Ring system
    const ringGeo = new THREE.RingGeometry(36, 68, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x9b51e0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      roughness: 0.7
    });

    this.rings = new THREE.Mesh(ringGeo, ringMat);
    this.rings.rotation.x = Math.PI * 0.42;
    this.rings.rotation.y = -Math.PI * 0.12;
    this.gasGiantGroup.add(this.rings);

    this.group.add(this.gasGiantGroup);
  }

  initGlowingMoon() {
    // Glowing moon orbiting nearby with cyan/violet surface
    this.moonGroup = new THREE.Group();
    this.moonGroup.position.set(-65, -25, -380);

    const geo = new THREE.SphereGeometry(10, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x003b5c,
      emissiveIntensity: 0.6,
      roughness: 0.35,
      metalness: 0.3
    });

    this.moon = new THREE.Mesh(geo, mat);
    this.moonGroup.add(this.moon);

    // Soft moon aura
    const auraGeo = new THREE.SphereGeometry(12, 32, 32);
    const auraMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x00f0ff) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.moonGroup.add(new THREE.Mesh(auraGeo, auraMat));
    this.group.add(this.moonGroup);
  }

  initSpaceDebris() {
    // Floating high-tech space debris chunks
    const debrisGeo = new THREE.BoxGeometry(0.8, 0.3, 1.4);
    const debrisMat = new THREE.MeshStandardMaterial({
      color: 0x8fa3b8,
      metalness: 0.8,
      roughness: 0.2
    });

    this.debrisList = [];
    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(debrisGeo, debrisMat);
      mesh.position.set(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 40,
        -310 - Math.random() * 180
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      this.debrisList.push({
        mesh,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        )
      });
      this.group.add(mesh);
    }
  }

  update(time) {
    // Tumble asteroids
    if (this.asteroids && this.asteroidRotations) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this.asteroidCount; i++) {
        const item = this.asteroidRotations[i];
        item.rot.x += item.rx;
        item.rot.y += item.ry;
        item.rot.z += item.rz;

        dummy.position.copy(item.pos);
        dummy.rotation.copy(item.rot);
        dummy.scale.copy(item.scale);
        dummy.updateMatrix();

        this.asteroids.setMatrixAt(i, dummy.matrix);
      }
      this.asteroids.instanceMatrix.needsUpdate = true;
    }

    // Rotate gas giant & moon
    if (this.gasGiant) {
      this.gasGiant.rotation.y = time * 0.02;
    }
    if (this.moonGroup) {
      this.moonGroup.rotation.y = time * 0.03;
      this.moon.rotation.y = time * 0.05;
    }

    // Tumble debris
    if (this.debrisList) {
      for (const item of this.debrisList) {
        item.mesh.rotation.x += item.rotSpeed.x;
        item.mesh.rotation.y += item.rotSpeed.y;
        item.mesh.rotation.z += item.rotSpeed.z;
      }
    }
  }
}

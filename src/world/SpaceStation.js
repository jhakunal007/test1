import * as THREE from 'three';

export class SpaceStation {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Position in Scene 3 (Z: -720)
    this.group.position.set(0, 0, -740);

    this.initStationMesh();
    this.initStationLights();
    this.initAtmosphericFog();
    this.initMovingDrones();

    this.scene.add(this.group);
  }

  initStationMesh() {
    this.stationCore = new THREE.Group();

    // Materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x222838,
      metalness: 0.85,
      roughness: 0.25
    });

    const darkHullMat = new THREE.MeshStandardMaterial({
      color: 0x111624,
      metalness: 0.9,
      roughness: 0.35
    });

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.9,
      roughness: 0.1
    });

    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0c2461,
      emissive: 0x071b4a,
      emissiveIntensity: 0.3,
      metalness: 0.95,
      roughness: 0.15
    });

    // 1. Central Core Spire (Axis)
    const spireGeo = new THREE.CylinderGeometry(4.5, 3.5, 90, 32);
    const spire = new THREE.Mesh(spireGeo, hullMat);
    spire.rotation.x = Math.PI / 2;
    this.stationCore.add(spire);

    // Spire detailing rings
    for (let i = -3; i <= 3; i++) {
      const ribGeo = new THREE.CylinderGeometry(5.2, 5.2, 2.5, 24);
      const rib = new THREE.Mesh(ribGeo, darkHullMat);
      rib.position.z = i * 12;
      rib.rotation.x = Math.PI / 2;
      this.stationCore.add(rib);
    }

    // 2. Rotating Torus Outer Ring (Habitat)
    this.rotatingRing = new THREE.Group();
    const torusGeo = new THREE.TorusGeometry(38, 3.2, 24, 64);
    const torus = new THREE.Mesh(torusGeo, hullMat);
    this.rotatingRing.add(torus);

    // Illuminated window strips on Torus
    const windowRingGeo = new THREE.TorusGeometry(38, 3.25, 12, 48);
    const windowRing = new THREE.Mesh(windowRingGeo, windowMat);
    windowRing.scale.set(1.002, 1.002, 0.4);
    this.rotatingRing.add(windowRing);

    // Spokes connecting Torus to Spire
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const spokeGeo = new THREE.CylinderGeometry(1.2, 1.2, 38, 16);
      const spoke = new THREE.Mesh(spokeGeo, darkHullMat);
      spoke.position.set(Math.cos(angle) * 19, Math.sin(angle) * 19, 0);
      spoke.rotation.z = angle + Math.PI / 2;
      this.rotatingRing.add(spoke);
    }

    this.stationCore.add(this.rotatingRing);

    // 3. Secondary Smaller Counter-Rotating Ring
    this.secondaryRing = new THREE.Group();
    const subTorusGeo = new THREE.TorusGeometry(22, 1.8, 16, 48);
    const subTorus = new THREE.Mesh(subTorusGeo, darkHullMat);
    this.secondaryRing.add(subTorus);
    this.secondaryRing.position.z = 18;
    this.stationCore.add(this.secondaryRing);

    // 4. Massive Solar Panel Wings
    const wingGeo = new THREE.BoxGeometry(45, 12, 0.4);
    const leftWing = new THREE.Mesh(wingGeo, solarMat);
    leftWing.position.set(-42, 0, -25);
    this.stationCore.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, solarMat);
    rightWing.position.set(42, 0, -25);
    this.stationCore.add(rightWing);

    // 5. Communications Dish & Sensor Array at fore
    const dishGeo = new THREE.SphereGeometry(6, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xdde6ed,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 0, 48);
    dish.rotation.x = Math.PI;
    this.stationCore.add(dish);

    this.group.add(this.stationCore);
  }

  initStationLights() {
    // Navigation Beacons (Red & Cyan blinking lights)
    this.beaconGroup = new THREE.Group();
    const beaconGeo = new THREE.SphereGeometry(0.6, 12, 12);

    const beaconCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const beaconRedMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    const b1 = new THREE.Mesh(beaconGeo, beaconCyanMat);
    b1.position.set(0, 42, 0);
    const b2 = new THREE.Mesh(beaconGeo, beaconCyanMat);
    b2.position.set(0, -42, 0);
    const b3 = new THREE.Mesh(beaconGeo, beaconRedMat);
    b3.position.set(0, 0, 50);

    this.beaconGroup.add(b1, b2, b3);
    this.group.add(this.beaconGroup);

    // Station Local Point Lights
    const pointLight = new THREE.PointLight(0x00f0ff, 2.5, 120);
    pointLight.position.set(0, 10, 15);
    this.group.add(pointLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.0, 100);
    purpleLight.position.set(0, -10, -20);
    this.group.add(purpleLight);
  }

  initAtmosphericFog() {
    // Subtle station local nebula glow aura
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    grad.addColorStop(0.5, 'rgba(120, 40, 240, 0.15)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(160, 160, 1);
    this.group.add(sprite);
  }

  initMovingDrones() {
    // 3 small sci-fi spacecrafts cruising around docking paths
    this.drones = [];
    const droneGeo = new THREE.ConeGeometry(0.8, 2.5, 6);
    droneGeo.rotateX(Math.PI / 2);

    const droneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.2
    });

    const engineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const engineGeo = new THREE.SphereGeometry(0.4, 8, 8);

    for (let i = 0; i < 3; i++) {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(droneGeo, droneMat);
      const engine = new THREE.Mesh(engineGeo, engineMat);
      engine.position.z = -1.2;

      drone.add(body, engine);

      const pathRadius = 55 + i * 18;
      const speed = 0.4 + i * 0.15;
      const yOffset = (i - 1) * 16;

      this.drones.push({
        mesh: drone,
        radius: pathRadius,
        speed: speed,
        offset: yOffset,
        phase: (i * Math.PI * 2) / 3
      });

      this.group.add(drone);
    }
  }

  update(time) {
    // Rotate rings
    if (this.rotatingRing) {
      this.rotatingRing.rotation.z = time * 0.08;
    }
    if (this.secondaryRing) {
      this.secondaryRing.rotation.z = -time * 0.12;
    }

    // Gentle floating yaw
    if (this.stationCore) {
      this.stationCore.rotation.y = Math.sin(time * 0.1) * 0.08;
    }

    // Blink beacon lights
    if (this.beaconGroup) {
      this.beaconGroup.visible = Math.sin(time * 4) > -0.2;
    }

    // Animate cruising spacecraft
    if (this.drones) {
      for (const d of this.drones) {
        const theta = time * d.speed + d.phase;
        d.mesh.position.set(
          Math.cos(theta) * d.radius,
          d.offset + Math.sin(time * 0.5) * 4,
          Math.sin(theta) * d.radius * 0.8
        );
        // Face tangential velocity direction
        d.mesh.rotation.y = -theta + Math.PI / 2;
        d.mesh.rotation.z = 0.15; // Bank into turn
      }
    }
  }
}

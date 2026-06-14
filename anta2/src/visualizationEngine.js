import * as THREE from "three";

function colorRamp(value, stops) {
  const clamped = Math.max(0, Math.min(1, value));
  const scaled = clamped * (stops.length - 1);
  const index = Math.floor(scaled);
  const t = scaled - index;
  const a = new THREE.Color(stops[index]);
  const b = new THREE.Color(stops[Math.min(stops.length - 1, index + 1)]);
  return a.lerp(b, t);
}

function setRendererSize(renderer, canvas) {
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 200;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  return { width, height };
}

export class VisualizationViewport {
  constructor(canvas, rocket) {
    this.canvas = canvas;
    this.rocket = rocket;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
    this.camera.position.set(22, 12, 32);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.localClippingEnabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.clock = new THREE.Clock();
    this.group = new THREE.Group();
    this.stageMeshes = [];
    this.flowParticles = null;
    this.shockCone = null;
    this.buildScene();
    this.resize();
  }

  buildScene() {
    this.scene.fog = new THREE.Fog(0x051018, 55, 220);
    this.scene.add(new THREE.AmbientLight(0x98c6ff, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(18, 20, 12);
    this.scene.add(sun);

    const grid = new THREE.GridHelper(80, 20, 0x1d5268, 0x10293b);
    grid.position.y = -14;
    this.scene.add(grid);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x103350, transparent: true, opacity: 0.06, side: THREE.BackSide })
    );
    atmosphere.scale.set(2.4, 2.4, 2.4);
    atmosphere.position.y = -42;
    this.scene.add(atmosphere);

    this.buildRocketMesh();
    this.buildFlowParticles();
    this.buildShockCone();
    this.scene.add(this.group);
  }

  buildRocketMesh() {
    this.group.clear();
    this.stageMeshes = [];
    let yOffset = 0;
    const totalLength = this.rocket.stages.reduce((sum, stage) => sum + stage.length, 0);
    yOffset = -totalLength * 0.5;

    this.rocket.stages.forEach((stage, index) => {
      const radius = stage.diameter * 0.24;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, stage.length, 28),
        new THREE.MeshStandardMaterial({
          color: 0x95a7b9,
          metalness: 0.25,
          roughness: 0.62,
          transparent: true,
          opacity: 0.96,
          clippingPlanes: [],
        })
      );
      body.position.y = yOffset + stage.length * 0.5;
      this.group.add(body);
      this.stageMeshes.push(body);

      const interstage = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.03, 0.08, 10, 28),
        new THREE.MeshStandardMaterial({ color: 0x34526a, metalness: 0.4, roughness: 0.55 })
      );
      interstage.rotation.x = Math.PI / 2;
      interstage.position.y = yOffset + stage.length;
      this.group.add(interstage);

      if (index === this.rocket.stages.length - 1) {
        const nose = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.96, 3.6, 28),
          new THREE.MeshStandardMaterial({ color: 0xc9d3dd, metalness: 0.2, roughness: 0.55 })
        );
        nose.position.y = body.position.y + stage.length * 0.5 + 1.8;
        this.group.add(nose);
      }
      yOffset += stage.length;
    });

    const engineBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.05, 1.8, 18),
      new THREE.MeshStandardMaterial({ color: 0x596c7c, metalness: 0.55, roughness: 0.4 })
    );
    engineBell.position.y = -totalLength * 0.5 - 1.2;
    this.group.add(engineBell);
  }

  buildFlowParticles() {
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x70d8ff,
      transparent: true,
      opacity: 0.55,
      size: 0.14,
      depthWrite: false,
    });
    this.flowParticles = new THREE.Points(geometry, material);
    this.scene.add(this.flowParticles);
  }

  buildShockCone() {
    this.shockCone = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 18, 42, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x7ecfff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
      })
    );
    this.shockCone.rotation.z = Math.PI;
    this.shockCone.visible = false;
    this.group.add(this.shockCone);
  }

  setRocket(rocket) {
    this.rocket = rocket;
    this.buildRocketMesh();
  }

  resize() {
    const { width, height } = setRendererSize(this.renderer, this.canvas);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  update(sample, options) {
    const elapsed = this.clock.getElapsedTime();
    this.group.rotation.z = THREE.MathUtils.degToRad(-sample.pitch + 90);
    this.group.position.x = THREE.MathUtils.clamp(sample.downrange / 8000, -15, 15);
    this.group.position.y = THREE.MathUtils.clamp(sample.altitude / 5000 - 6, -6, 12);

    const clipPlane = options.crossSection ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)] : [];
    const structuralRatio = Math.min(1, sample.stress / 180000);
    const pressureRatio = Math.min(1, sample.dynamicPressure / 60000);
    const thermalRatio = Math.min(1, (sample.temperature - 250) / 1400);

    this.stageMeshes.forEach((mesh, index) => {
      let color = new THREE.Color(0x95a7b9);
      if (options.viewMode === "pressure") {
        color = colorRamp(pressureRatio + index * 0.03, [0x244a6a, 0x58a7ff, 0xffd051, 0xff5a4f]);
      } else if (options.viewMode === "thermal") {
        color = colorRamp(thermalRatio + index * 0.02, [0x2d68a8, 0x5fa8ff, 0xff934d, 0xff4637, 0xffffff]);
      } else if (options.viewMode === "structural") {
        color = colorRamp(structuralRatio + index * 0.02, [0x21446e, 0x49a0ff, 0xffbf47, 0xff5454]);
      }
      mesh.material.color.copy(color);
      mesh.material.opacity = options.crossSection ? 0.6 : 0.96;
      mesh.material.clippingPlanes = clipPlane;
    });

    this.shockCone.visible = sample.mach > 1;
    if (this.shockCone.visible) {
      const machAngle = Math.asin(1 / Math.max(sample.mach, 1.001));
      this.shockCone.scale.set(1 + sample.mach * 0.12, 1 + sample.mach * 0.7, 1 + sample.mach * 0.12);
      this.shockCone.material.opacity = Math.min(0.28, 0.04 + sample.mach * 0.03);
      this.shockCone.position.y = 8;
      this.shockCone.rotation.x = machAngle;
    }

    const positions = this.flowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const wakeBias = positions[i + 1] < -4 ? 1.9 : 1;
      positions[i + 1] -= (0.18 + pressureRatio * 0.7) * wakeBias;
      const swirl = sample.mach > 0.8 ? Math.sin(elapsed * 2 + i) * 0.01 * sample.mach : 0.003;
      positions[i] += swirl + (positions[i] > 0 ? -0.004 : 0.004);
      if (positions[i + 1] < -24) {
        positions[i] = (Math.random() - 0.5) * 10;
        positions[i + 1] = 24;
        positions[i + 2] = (Math.random() - 0.5) * 8;
      }
    }
    this.flowParticles.geometry.attributes.position.needsUpdate = true;

    this.camera.position.x += (this.group.position.x * 0.25 - this.camera.position.x) * 0.06;
    this.camera.position.y += (8 + this.group.position.y * 0.3 - this.camera.position.y) * 0.06;
    this.camera.lookAt(this.group.position.x, this.group.position.y + 2.5, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

(function () {
  const SEA_LEVEL_DENSITY = 1.225;
  const SEA_LEVEL_PRESSURE = 101325;
  const SCALE_HEIGHT = 8500;
  const EARTH_RADIUS = 6371000;
  const G0 = 9.80665;
  const DEFAULT_DT = 1 / 60;
  const MATERIALS = {
    aluminum: { label: "Al-Li Alloy", cp: 910, maxTemp: 620, densityFactor: 1, emissivity: 0.35 },
    stainless: { label: "Stainless Steel", cp: 500, maxTemp: 1450, densityFactor: 1.12, emissivity: 0.58 },
    carbon: { label: "Carbon Composite", cp: 710, maxTemp: 820, densityFactor: 0.78, emissivity: 0.62 },
    titanium: { label: "Titanium Alloy", cp: 520, maxTemp: 1660, densityFactor: 1.06, emissivity: 0.44 },
  };
  const NOSE_CONES = {
    ogive: { dragMultiplier: 0.92, shockMultiplier: 0.88, heatingMultiplier: 0.95, cpShift: -0.16 },
    cone: { dragMultiplier: 1.0, shockMultiplier: 1.0, heatingMultiplier: 1.0, cpShift: 0.0 },
    blunt: { dragMultiplier: 1.15, shockMultiplier: 1.25, heatingMultiplier: 1.22, cpShift: 0.18 },
  };
  const CHART_KEYS = [
    ["velocityChart", "velocity", "Velocity (m/s)", "#4fd1ff"],
    ["altitudeChart", "altitude", "Altitude (m)", "#6bffb3"],
    ["temperatureChart", "temperature", "Temperature (K)", "#ff8855"],
    ["qChart", "dynamicPressure", "Dynamic Pressure (Pa)", "#ffbf47"],
    ["dragChart", "drag", "Drag (N)", "#ff5e5e"],
    ["gLoadChart", "gLoad", "G-Load", "#dca6ff"],
    ["fuelChart", "fuelMass", "Fuel Mass (kg)", "#8ec9ff"],
  ];
  const ENGINEERING_NOTES = [
    "Aerodynamic drag and dynamic pressure use standard continuum-flow approximations with Mach-based drag rise and simplified shape correction.",
    "Thermal loading uses a Sutton-Graves style approximation where heat flux scales with sqrt(rho) * v^3 and is integrated into skin temperature using material heat capacity.",
    "Structural load view estimates bending demand from dynamic pressure, sideforce, and wind-shear-driven angle of attack rather than full finite element vibration analysis.",
    "Stage separation, reentry guidance, and landing burn logic use deterministic engineering heuristics suitable for desktop comparative analysis.",
  ];
  const ROCKET_DATABASE = {
    pslv: {
      key: "pslv",
      name: "PSLV",
      reusable: false,
      referenceDiameter: 2.8,
      baseCd: 0.31,
      defaultPayload: 3800,
      landingCapable: false,
      stages: [
        { name: "PS1 Core", dryMass: 30000, fuelMass: 138000, burnTime: 105, thrust: { seaLevel: 4800000, vacuum: 5100000 }, diameter: 2.8, length: 20.3 },
        { name: "PS2", dryMass: 5200, fuelMass: 41500, burnTime: 150, thrust: { seaLevel: 800000, vacuum: 846000 }, diameter: 2.8, length: 12.8 },
        { name: "PS3", dryMass: 1800, fuelMass: 7600, burnTime: 112, thrust: { seaLevel: 245000, vacuum: 260000 }, diameter: 2.0, length: 3.6 },
        { name: "PS4", dryMass: 920, fuelMass: 2500, burnTime: 520, thrust: { seaLevel: 14000, vacuum: 15000 }, diameter: 2.0, length: 3.0 },
      ],
    },
    gslv: {
      key: "gslv",
      name: "GSLV Mk II",
      reusable: false,
      referenceDiameter: 2.8,
      baseCd: 0.33,
      defaultPayload: 5000,
      landingCapable: false,
      stages: [
        { name: "S139 Core", dryMass: 36000, fuelMass: 138000, burnTime: 108, thrust: { seaLevel: 4700000, vacuum: 5000000 }, diameter: 2.8, length: 24.0 },
        { name: "GS2", dryMass: 6200, fuelMass: 39500, burnTime: 150, thrust: { seaLevel: 790000, vacuum: 860000 }, diameter: 2.8, length: 12.9 },
        { name: "CUS", dryMass: 4300, fuelMass: 12900, burnTime: 720, thrust: { seaLevel: 73000, vacuum: 93500 }, diameter: 2.8, length: 8.0 },
      ],
    },
    falcon9: {
      key: "falcon9",
      name: "Falcon 9 Block 5",
      reusable: true,
      referenceDiameter: 3.7,
      baseCd: 0.28,
      defaultPayload: 15600,
      landingCapable: true,
      stages: [
        { name: "Stage 1", dryMass: 25600, fuelMass: 411000, burnTime: 162, thrust: { seaLevel: 7607000, vacuum: 8227000 }, diameter: 3.7, length: 41.2 },
        { name: "Stage 2", dryMass: 4500, fuelMass: 107500, burnTime: 397, thrust: { seaLevel: 845000, vacuum: 981000 }, diameter: 3.7, length: 13.8 },
      ],
    },
    falconHeavy: {
      key: "falconHeavy",
      name: "Falcon Heavy",
      reusable: true,
      referenceDiameter: 3.7,
      baseCd: 0.3,
      defaultPayload: 25000,
      landingCapable: true,
      stages: [
        { name: "Core + Side Boosters", dryMass: 77200, fuelMass: 1150000, burnTime: 154, thrust: { seaLevel: 22819000, vacuum: 24680000 }, diameter: 12.2, length: 41.2 },
        { name: "Upper Stage", dryMass: 4500, fuelMass: 107500, burnTime: 397, thrust: { seaLevel: 845000, vacuum: 981000 }, diameter: 3.7, length: 13.8 },
      ],
    },
  };

  function bootError(message) {
    const el = document.getElementById("bootError");
    if (!el) return;
    el.classList.remove("hidden");
    el.innerHTML = "<strong>Simulator failed to start.</strong><br>" + message;
  }

  function atmosphereAtAltitude(altitude) {
    const clamped = Math.max(0, altitude);
    const density = SEA_LEVEL_DENSITY * Math.exp(-clamped / SCALE_HEIGHT);
    const pressure = SEA_LEVEL_PRESSURE * Math.exp(-clamped / SCALE_HEIGHT);
    const temperature = clamped < 11000 ? 288.15 - 0.0065 * clamped : clamped < 25000 ? 216.65 : 216.65 + 0.002 * (clamped - 25000);
    const soundSpeed = Math.sqrt(1.4 * 287.05 * temperature);
    return { density, pressure, temperature, soundSpeed };
  }

  function gravityAtAltitude(altitude) {
    return G0 * Math.pow(EARTH_RADIUS / (EARTH_RADIUS + Math.max(0, altitude)), 2);
  }

  function dynamicPressure(density, velocity) {
    return 0.5 * density * velocity * velocity;
  }

  function dragCoefficient(baseCd, mach, noseConeKey) {
    const shape = NOSE_CONES[noseConeKey];
    let rise = 1;
    if (mach > 0.75 && mach < 1.25) {
      rise = 1 + (1 - Math.abs(mach - 1) / 0.25) * 0.8;
    } else if (mach >= 1.25 && mach < 5) {
      rise = 1.2 + (mach - 1.25) * 0.04;
    } else if (mach >= 5) {
      rise = 1.35 + Math.min(0.3, (mach - 5) * 0.02);
    }
    return baseCd * rise * shape.dragMultiplier;
  }

  function heatFlux(density, velocity, noseConeKey) {
    return 0.00016 * Math.sqrt(Math.max(density, 0)) * Math.pow(Math.abs(velocity), 3) * NOSE_CONES[noseConeKey].heatingMultiplier;
  }

  function integrateSkinTemperature(temperature, flux, dt, totalMass, materialKey) {
    const material = MATERIALS[materialKey];
    const effectiveMass = Math.max(totalMass * 0.015, 200);
    const cooling = Math.max(0, temperature - 260) * material.emissivity * 0.015;
    return Math.max(220, temperature + ((flux - cooling) * dt) / (effectiveMass * material.cp));
  }

  function centerOfGravity(stages, activeStageIndex, payloadMass) {
    let weightedMoment = 0;
    let totalMass = payloadMass;
    let runningHeight = 0;
    stages.forEach(function (stage, index) {
      if (index < activeStageIndex) {
        runningHeight += stage.length;
        return;
      }
      const mass = stage.currentDryMass + stage.currentFuelMass;
      totalMass += mass;
      weightedMoment += mass * (runningHeight + stage.length * 0.42);
      runningHeight += stage.length;
    });
    weightedMoment += payloadMass * Math.max(3, runningHeight - 2.4);
    return totalMass > 0 ? weightedMoment / totalMass : runningHeight * 0.5;
  }

  function centerOfPressure(totalLength, noseConeKey, mach) {
    const nose = NOSE_CONES[noseConeKey];
    const machShift = mach > 1 ? Math.min(0.12, (mach - 1) * 0.025) : -0.06 * (1 - mach);
    return totalLength * (0.58 + nose.cpShift + machShift);
  }

  function stabilityMargin(caliber, cg, cp) {
    return (cp - cg) / Math.max(caliber, 0.1);
  }

  function structuralStress(dynamicQ, angleOfAttack, windShear, thrustVectorOffset) {
    return dynamicQ * (1 + Math.abs(angleOfAttack) * 6 + Math.abs(windShear) * 0.08) + Math.abs(windShear) * 2200 + Math.abs(thrustVectorOffset || 0) * 1200;
  }

  function reentryScore(metrics) {
    const temperaturePenalty = Math.max(0, metrics.maxTemperature - metrics.materialLimit) / metrics.materialLimit;
    const loadPenalty = Math.max(0, metrics.maxG - 8) / 8;
    const qPenalty = Math.max(0, metrics.maxQ - 60000) / 60000;
    const base = 100 - (temperaturePenalty * 48 + loadPenalty * 24 + qPenalty * 18);
    return Math.max(0, Math.min(100, base));
  }

  function cloneRocketModel(rocket, payloadMass) {
    return {
      key: rocket.key,
      name: rocket.name,
      baseCd: rocket.baseCd,
      reusable: rocket.reusable,
      referenceDiameter: rocket.referenceDiameter,
      landingCapable: rocket.landingCapable,
      payloadMass: payloadMass,
      stages: rocket.stages.map(function (stage) {
        return {
          name: stage.name,
          dryMass: stage.dryMass,
          fuelMass: stage.fuelMass,
          burnTime: stage.burnTime,
          thrust: stage.thrust,
          diameter: stage.diameter,
          length: stage.length,
          currentFuelMass: stage.fuelMass,
          currentDryMass: stage.dryMass,
          stageSepImpulse: stage.thrust.vacuum * 0.004,
        };
      }),
    };
  }

  function totalMass(sim) {
    return sim.rocket.payloadMass + sim.rocket.stages.slice(sim.activeStage).reduce(function (sum, stage) {
      return sum + stage.currentDryMass + stage.currentFuelMass;
    }, 0);
  }

  function classifyPhase(sim) {
    if (sim.failed) return "failed";
    if (sim.landed) return "complete";
    if (sim.altitude > 120000 && sim.verticalVelocity > 0) return "coast";
    if (sim.verticalVelocity < -100 && sim.altitude < 90000) return "reentry";
    if (sim.verticalVelocity < -40 && sim.altitude < 2500 && sim.rocket.landingCapable) return "landing";
    return "burning";
  }

  function SimulationEngine(rocket, parameters) {
    this.baseRocket = rocket;
    this.parameters = Object.assign({}, parameters);
    this.reset();
  }

  SimulationEngine.prototype.reset = function (parameters) {
    this.parameters = Object.assign({}, parameters || this.parameters);
    this.rocket = cloneRocketModel(this.baseRocket, this.parameters.payloadMass);
    this.time = 0;
    this.altitude = 0;
    this.downrange = 0;
    this.velocity = 0;
    this.verticalVelocity = 0;
    this.horizontalVelocity = 0;
    this.pitch = this.parameters.launchAngle;
    this.pitchRate = 0;
    this.temperature = 295;
    this.maxTemperature = 295;
    this.maxQ = 0;
    this.maxG = 1;
    this.maxStress = 0;
    this.drag = 0;
    this.dynamicPressure = 0;
    this.heatFlux = 0;
    this.mach = 0;
    this.gLoad = 1;
    this.acceleration = 0;
    this.activeStage = 0;
    this.stageTime = 0;
    this.thrust = 0;
    this.cg = 0;
    this.cp = 0;
    this.stabilityMargin = 0;
    this.windShear = 0;
    this.stress = 0;
    this.failed = false;
    this.failureReason = "";
    this.maxQWarning = false;
    this.landed = false;
    this.history = [];
    this.summary = null;
  };

  SimulationEngine.prototype.snapshot = function () {
    const sample = {
      time: this.time,
      altitude: this.altitude,
      downrange: this.downrange,
      velocity: this.velocity,
      verticalVelocity: this.verticalVelocity,
      horizontalVelocity: this.horizontalVelocity,
      temperature: this.temperature,
      dynamicPressure: this.dynamicPressure,
      drag: this.drag,
      gLoad: this.gLoad,
      fuelMass: this.rocket.stages.slice(this.activeStage).reduce(function (sum, stage) { return sum + stage.currentFuelMass; }, 0),
      thrust: this.thrust,
      mach: this.mach,
      stress: this.stress,
      stabilityMargin: this.stabilityMargin,
      phase: classifyPhase(this),
      maxQWarning: this.maxQWarning,
      failed: this.failed,
      failureReason: this.failureReason,
      landed: this.landed,
      cg: this.cg,
      cp: this.cp,
      pitch: this.pitch,
      windShear: this.windShear,
      maxQ: this.maxQ,
      maxTemperature: this.maxTemperature,
      maxG: this.maxG,
    };
    this.history.push(sample);
    return sample;
  };

  SimulationEngine.prototype.step = function (dt) {
    if (this.failed || this.landed) {
      return this.snapshot();
    }

    this.time += dt;
    this.stageTime += dt;
    const stage = this.rocket.stages[this.activeStage];
    const atmosphere = atmosphereAtAltitude(this.altitude);
    this.mach = Math.abs(this.velocity) / Math.max(atmosphere.soundSpeed, 1);
    this.windShear = this.parameters.windSpeed * Math.exp(-this.altitude / 14000) * Math.sin(this.time * 0.04);
    const angleOfAttack = (this.windShear - this.horizontalVelocity) / Math.max(Math.abs(this.velocity), 120);
    const shapeCd = dragCoefficient(this.rocket.baseCd, this.mach, this.parameters.noseCone);
    const area = Math.PI * Math.pow(this.baseRocket.referenceDiameter * 0.5, 2);
    this.dynamicPressure = dynamicPressure(atmosphere.density, Math.abs(this.velocity));
    this.maxQ = Math.max(this.maxQ, this.dynamicPressure);
    this.maxQWarning = this.dynamicPressure > 35000;
    this.drag = this.dynamicPressure * shapeCd * area;
    this.heatFlux = heatFlux(atmosphere.density, this.velocity, this.parameters.noseCone);
    this.temperature = integrateSkinTemperature(this.temperature, this.heatFlux, dt, totalMass(this), this.parameters.material);
    this.maxTemperature = Math.max(this.maxTemperature, this.temperature);

    const totalLength = this.rocket.stages.slice(this.activeStage).reduce(function (sum, item) { return sum + item.length; }, 0) + 3;
    this.cg = centerOfGravity(this.rocket.stages, this.activeStage, this.rocket.payloadMass);
    this.cp = centerOfPressure(totalLength, this.parameters.noseCone, this.mach);
    this.stabilityMargin = stabilityMargin(this.baseRocket.referenceDiameter, this.cg, this.cp);
    this.stress = structuralStress(this.dynamicPressure, angleOfAttack, this.windShear, this.pitchRate);
    this.maxStress = Math.max(this.maxStress, this.stress);

    const gravity = gravityAtAltitude(this.altitude);
    const vacuumFraction = 1 - Math.min(1, atmosphere.density / 1.225);
    const commandedPitch = Math.max(this.parameters.reentryAngle, this.parameters.launchAngle - this.time * 0.045);
    const attitudeError = commandedPitch - this.pitch;
    this.pitchRate += attitudeError * 0.18 * dt - this.pitchRate * 0.1 * dt;
    this.pitch += this.pitchRate;

    let thrust = 0;
    if (stage) {
      thrust = (stage.thrust.seaLevel + (stage.thrust.vacuum - stage.thrust.seaLevel) * vacuumFraction) * (this.parameters.thrustPercent / 100);
      const massFlow = thrust / (G0 * 300);
      const nominalBurn = Math.max(0.1, stage.burnTime + this.parameters.stageTimingBias);
      const fuelUse = Math.min(stage.currentFuelMass, Math.max(stage.fuelMass / nominalBurn, massFlow) * dt);
      stage.currentFuelMass -= fuelUse;
      if (stage.currentFuelMass <= 1 && this.activeStage < this.rocket.stages.length - 1) {
        this.verticalVelocity += stage.stageSepImpulse / Math.max(totalMass(this), 1);
        this.activeStage += 1;
        this.stageTime = 0;
      } else if (stage.currentFuelMass <= 1 && this.activeStage === this.rocket.stages.length - 1) {
        thrust = 0;
      }
    }

    if (classifyPhase(this) === "landing" && this.baseRocket.landingCapable && this.verticalVelocity < -15) {
      thrust = Math.max(thrust, totalMass(this) * gravity * 1.25);
    }

    this.thrust = thrust;
    const mass = totalMass(this);
    const flightPathRad = this.pitch * Math.PI / 180;
    const thrustAxial = thrust / Math.max(mass, 1);
    const dragAccel = this.drag / Math.max(mass, 1);
    const ax = thrustAxial * Math.cos(flightPathRad) - dragAccel * Math.sign(this.horizontalVelocity || 1);
    const ay = thrustAxial * Math.sin(flightPathRad) - gravity - dragAccel * Math.sign(this.verticalVelocity || 1);

    this.horizontalVelocity += (ax + this.windShear * 0.003) * dt;
    this.verticalVelocity += ay * dt;
    this.downrange += this.horizontalVelocity * dt;
    this.altitude = Math.max(0, this.altitude + this.verticalVelocity * dt);
    this.velocity = Math.hypot(this.horizontalVelocity, this.verticalVelocity);
    this.acceleration = Math.hypot(ax, ay);
    this.gLoad = this.acceleration / G0;
    this.maxG = Math.max(this.maxG, this.gLoad);

    const material = MATERIALS[this.parameters.material];
    if (this.parameters.failureMode && this.temperature > material.maxTemp * 1.03) {
      this.failed = true;
      this.failureReason = "Thermal protection exceeded material limit";
    }
    if (this.parameters.failureMode && this.stress > 180000 && this.dynamicPressure > 42000) {
      this.failed = true;
      this.failureReason = "Structural bending load exceeded allowable margin";
    }
    if (this.altitude <= 0 && this.time > 10) {
      if (Math.abs(this.verticalVelocity) < 6 || (!this.baseRocket.landingCapable && this.verticalVelocity > -3)) {
        this.landed = true;
      } else {
        this.failed = true;
        this.failureReason = "Terminal impact on landing";
      }
      this.altitude = 0;
      this.verticalVelocity = 0;
      this.horizontalVelocity *= 0.2;
      this.velocity = Math.abs(this.horizontalVelocity);
    }
    return this.snapshot();
  };

  SimulationEngine.prototype.finalizeSummary = function () {
    const material = MATERIALS[this.parameters.material];
    const altitudes = this.history.map(function (item) { return item.altitude; });
    const velocities = this.history.map(function (item) { return item.velocity; });
    this.summary = {
      rocket: this.baseRocket.name,
      duration: this.time,
      maxAltitude: altitudes.length ? Math.max.apply(null, altitudes) : 0,
      maxVelocity: velocities.length ? Math.max.apply(null, velocities) : 0,
      maxQ: this.maxQ,
      maxTemperature: this.maxTemperature,
      maxG: this.maxG,
      maxStress: this.maxStress,
      materialLimit: material.maxTemp,
      survived: !this.failed,
      failureReason: this.failureReason,
    };
    this.summary.reentryScore = reentryScore(this.summary);
    return this.summary;
  };

  function TelemetryChart(canvas, label, color) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.label = label;
    this.color = color;
    this.values = [];
    this.maxPoints = 240;
  }

  TelemetryChart.prototype.resize = function () {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || 240;
    const height = this.canvas.clientHeight || 150;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  TelemetryChart.prototype.setValues = function (values) {
    this.values = values.slice(-this.maxPoints);
  };

  TelemetryChart.prototype.draw = function () {
    const ctx = this.ctx;
    const width = this.canvas.clientWidth || 240;
    const height = this.canvas.clientHeight || 150;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a121a";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i += 1) {
      const y = 20 + ((height - 36) / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.fillStyle = "#87a0b5";
    ctx.font = "11px IBM Plex Sans, sans-serif";
    ctx.fillText(this.label, 10, 14);
    if (this.values.length < 2) return;
    const min = Math.min.apply(null, this.values);
    const max = Math.max.apply(null, this.values);
    const span = max - min || 1;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.values.forEach(function (value, index, arr) {
      const x = 8 + (index / Math.max(arr.length - 1, 1)) * (width - 16);
      const y = height - 18 - ((value - min) / span) * (height - 38);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = this.color;
    ctx.fillText(max.toFixed(1), width - 56, 14);
  };

  function colorRamp(value, stops) {
    const clamped = Math.max(0, Math.min(1, value));
    const scaled = clamped * (stops.length - 1);
    const index = Math.floor(scaled);
    const t = scaled - index;
    const a = new THREE.Color(stops[index]);
    const b = new THREE.Color(stops[Math.min(stops.length - 1, index + 1)]);
    return a.lerp(b, t);
  }

  function VisualizationViewport(canvas, rocket) {
    this.canvas = canvas;
    this.rocket = rocket;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 2000);
    this.camera.position.set(22, 12, 32);
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    this.renderer.localClippingEnabled = true;
    this.group = new THREE.Group();
    this.stageMeshes = [];
    this.buildScene();
    this.resize();
  }

  VisualizationViewport.prototype.buildScene = function () {
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
  };

  VisualizationViewport.prototype.buildRocketMesh = function () {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.stageMeshes = [];
    let yOffset = -this.rocket.stages.reduce(function (sum, stage) { return sum + stage.length; }, 0) * 0.5;
    for (let index = 0; index < this.rocket.stages.length; index += 1) {
      const stage = this.rocket.stages[index];
      const radius = stage.diameter * 0.24;
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, stage.length, 28),
        new THREE.MeshStandardMaterial({ color: 0x95a7b9, metalness: 0.25, roughness: 0.62, transparent: true, opacity: 0.96, clippingPlanes: [] })
      );
      body.position.y = yOffset + stage.length * 0.5;
      this.group.add(body);
      this.stageMeshes.push(body);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.03, 0.08, 10, 28),
        new THREE.MeshStandardMaterial({ color: 0x34526a, metalness: 0.4, roughness: 0.55 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = yOffset + stage.length;
      this.group.add(ring);
      if (index === this.rocket.stages.length - 1) {
        const nose = new THREE.Mesh(
          new THREE.ConeGeometry(radius * 0.96, 3.6, 28),
          new THREE.MeshStandardMaterial({ color: 0xc9d3dd, metalness: 0.2, roughness: 0.55 })
        );
        nose.position.y = body.position.y + stage.length * 0.5 + 1.8;
        this.group.add(nose);
      }
      yOffset += stage.length;
    }
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 1.05, 1.8, 18),
      new THREE.MeshStandardMaterial({ color: 0x596c7c, metalness: 0.55, roughness: 0.4 })
    );
    bell.position.y = -this.rocket.stages.reduce(function (sum, stage) { return sum + stage.length; }, 0) * 0.5 - 1.2;
    this.group.add(bell);
  };

  VisualizationViewport.prototype.buildFlowParticles = function () {
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.flowParticles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0x70d8ff, transparent: true, opacity: 0.55, size: 0.14, depthWrite: false })
    );
    this.scene.add(this.flowParticles);
  };

  VisualizationViewport.prototype.buildShockCone = function () {
    this.shockCone = new THREE.Mesh(
      new THREE.ConeGeometry(3.5, 18, 42, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x7ecfff, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
    );
    this.shockCone.rotation.z = Math.PI;
    this.shockCone.visible = false;
    this.group.add(this.shockCone);
  };

  VisualizationViewport.prototype.setRocket = function (rocket) {
    this.rocket = rocket;
    this.buildRocketMesh();
  };

  VisualizationViewport.prototype.resize = function () {
    const width = this.canvas.clientWidth || 300;
    const height = this.canvas.clientHeight || 200;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  };

  VisualizationViewport.prototype.update = function (sample, options) {
    this.group.rotation.z = THREE.MathUtils.degToRad(-sample.pitch + 90);
    this.group.position.x = THREE.MathUtils.clamp(sample.downrange / 8000, -15, 15);
    this.group.position.y = THREE.MathUtils.clamp(sample.altitude / 5000 - 6, -6, 12);
    const clipPlane = options.crossSection ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)] : [];
    const structuralRatio = Math.min(1, sample.stress / 180000);
    const pressureRatio = Math.min(1, sample.dynamicPressure / 60000);
    const thermalRatio = Math.min(1, (sample.temperature - 250) / 1400);
    this.stageMeshes.forEach(function (mesh, index) {
      let color = new THREE.Color(0x95a7b9);
      if (options.viewMode === "pressure") color = colorRamp(pressureRatio + index * 0.03, [0x244a6a, 0x58a7ff, 0xffd051, 0xff5a4f]);
      if (options.viewMode === "thermal") color = colorRamp(thermalRatio + index * 0.02, [0x2d68a8, 0x5fa8ff, 0xff934d, 0xff4637, 0xffffff]);
      if (options.viewMode === "structural") color = colorRamp(structuralRatio + index * 0.02, [0x21446e, 0x49a0ff, 0xffbf47, 0xff5454]);
      mesh.material.color.copy(color);
      mesh.material.opacity = options.crossSection ? 0.6 : 0.96;
      mesh.material.clippingPlanes = clipPlane;
    });
    this.shockCone.visible = sample.mach > 1;
    if (this.shockCone.visible) {
      this.shockCone.scale.set(1 + sample.mach * 0.12, 1 + sample.mach * 0.7, 1 + sample.mach * 0.12);
      this.shockCone.material.opacity = Math.min(0.28, 0.04 + sample.mach * 0.03);
      this.shockCone.position.y = 8;
      this.shockCone.rotation.x = Math.asin(1 / Math.max(sample.mach, 1.001));
    }
    const positions = this.flowParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const wakeBias = positions[i + 1] < -4 ? 1.9 : 1;
      positions[i + 1] -= (0.18 + pressureRatio * 0.7) * wakeBias;
      const swirl = sample.mach > 0.8 ? Math.sin(performance.now() * 0.002 + i) * 0.01 * sample.mach : 0.003;
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
  };

  VisualizationViewport.prototype.render = function () {
    this.renderer.render(this.scene, this.camera);
  };

  function metricCard(label, value, tone) {
    return '<div class="metric-card ' + (tone || "") + '"><span>' + label + "</span><strong>" + value + "</strong></div>";
  }

  function UIManager() {
    this.charts = new Map();
    this.elements = {
      rocketA: document.getElementById("rocketA"),
      rocketB: document.getElementById("rocketB"),
      compareToggle: document.getElementById("compareToggle"),
      viewportGrid: document.getElementById("viewportGrid"),
      secondaryPanel: document.getElementById("secondaryPanel"),
      launchAngle: document.getElementById("launchAngle"),
      payloadMass: document.getElementById("payloadMass"),
      thrustPercent: document.getElementById("thrustPercent"),
      windSpeed: document.getElementById("windSpeed"),
      stageTimingBias: document.getElementById("stageTimingBias"),
      reentryAngle: document.getElementById("reentryAngle"),
      simSpeed: document.getElementById("simSpeed"),
      material: document.getElementById("material"),
      noseCone: document.getElementById("noseCone"),
      viewMode: document.getElementById("viewMode"),
      crossSectionToggle: document.getElementById("crossSectionToggle"),
      failureModeToggle: document.getElementById("failureModeToggle"),
      metricsA: document.getElementById("metricsA"),
      metricsB: document.getElementById("metricsB"),
      consoleTable: document.getElementById("consoleTable"),
      batchResults: document.getElementById("batchResults"),
      engineeringNotes: document.getElementById("engineeringNotes"),
      runModeLabel: document.getElementById("runModeLabel"),
      replayLabel: document.getElementById("replayLabel"),
      maxQWarning: document.getElementById("maxQWarning"),
      simALabel: document.getElementById("simALabel"),
      simBLabel: document.getElementById("simBLabel"),
      mcSamples: document.getElementById("mcSamples"),
      batchDuration: document.getElementById("batchDuration"),
    };
    CHART_KEYS.forEach(function (entry) {
      const chart = new TelemetryChart(document.getElementById(entry[0]), entry[2], entry[3]);
      chart.resize();
      this.charts.set(entry[1], chart);
    }, this);
    this.elements.engineeringNotes.innerHTML = ENGINEERING_NOTES.map(function (note) { return "<p>" + note + "</p>"; }).join("");
  }

  UIManager.prototype.populateRocketOptions = function (rockets) {
    [this.elements.rocketA, this.elements.rocketB].forEach(function (select) {
      select.innerHTML = rockets.map(function (rocket) { return '<option value="' + rocket.key + '">' + rocket.name + "</option>"; }).join("");
    });
  };

  UIManager.prototype.populateMaterials = function () {
    this.elements.material.innerHTML = Object.keys(MATERIALS).map(function (key) {
      return '<option value="' + key + '">' + MATERIALS[key].label + "</option>";
    }).join("");
  };

  UIManager.prototype.readParameters = function () {
    return {
      launchAngle: Number(this.elements.launchAngle.value),
      payloadMass: Number(this.elements.payloadMass.value),
      thrustPercent: Number(this.elements.thrustPercent.value),
      windSpeed: Number(this.elements.windSpeed.value),
      stageTimingBias: Number(this.elements.stageTimingBias.value),
      reentryAngle: Number(this.elements.reentryAngle.value),
      simSpeed: Number(this.elements.simSpeed.value),
      material: this.elements.material.value,
      noseCone: this.elements.noseCone.value,
      viewMode: this.elements.viewMode.value,
      crossSection: this.elements.crossSectionToggle.checked,
      compareEnabled: this.elements.compareToggle.checked,
      failureMode: this.elements.failureModeToggle.checked,
      mcSamples: Number(this.elements.mcSamples.value),
      batchDuration: Number(this.elements.batchDuration.value),
    };
  };

  UIManager.prototype.setCompareEnabled = function (enabled) {
    this.elements.viewportGrid.classList.toggle("compare-enabled", enabled);
    this.elements.secondaryPanel.style.display = enabled ? "" : "none";
  };

  UIManager.prototype.updateMetrics = function (container, sample, summary) {
    container.innerHTML = [
      metricCard("Altitude", sample.altitude.toFixed(0) + " m"),
      metricCard("Velocity", sample.velocity.toFixed(1) + " m/s"),
      metricCard("Mach", sample.mach.toFixed(2)),
      metricCard("Q", sample.dynamicPressure.toFixed(0) + " Pa", sample.maxQWarning ? "warn" : ""),
      metricCard("Skin Temp", sample.temperature.toFixed(1) + " K", sample.temperature > 900 ? "danger" : ""),
      metricCard("Stability", sample.stabilityMargin.toFixed(2) + " cal", sample.stabilityMargin < 1 ? "warn" : "good"),
      metricCard("Stress", sample.stress.toFixed(0)),
      metricCard("Outcome", summary ? summary.reentryScore.toFixed(1) + " score" : sample.phase),
    ].join("");
  };

  UIManager.prototype.updateConsole = function (primary, secondary) {
    this.elements.consoleTable.innerHTML = [["Primary", primary], ["Secondary", secondary]]
      .filter(function (entry) { return !!entry[1]; })
      .map(function (entry) {
        const sample = entry[1];
        return '<div class="console-row"><strong>' + entry[0] + "</strong><span>" + sample.phase + "</span><span>" + sample.fuelMass.toFixed(0) + ' kg fuel</span><span>' + (sample.failed ? sample.failureReason : sample.landed ? "Landed" : "Nominal") + "</span></div>";
      })
      .join("");
  };

  UIManager.prototype.updateCharts = function (history) {
    this.charts.forEach(function (chart, key) {
      chart.setValues(history.map(function (item) { return item[key] || 0; }));
      chart.draw();
    });
  };

  UIManager.prototype.updateHeader = function (isRunning, replaying, hasMaxQWarning) {
    this.elements.runModeLabel.textContent = isRunning ? "Running" : "Paused";
    this.elements.replayLabel.textContent = replaying ? "Playing back" : "Idle";
    const strong = this.elements.maxQWarning.querySelector("strong");
    strong.textContent = hasMaxQWarning ? "MAX-Q REGION" : "Nominal";
    strong.className = hasMaxQWarning ? "warn" : "good";
  };

  UIManager.prototype.renderBatchResults = function (rows) {
    this.elements.batchResults.innerHTML = rows.length ? rows.map(function (row) {
      return '<div class="batch-row"><strong>Run ' + row.id + "</strong><span>" + row.maxQ.toFixed(0) + " Pa Qmax</span><span>" + row.maxTemperature.toFixed(0) + " K Tmax</span><span class=\"" + (row.survived ? "good" : "danger") + "\">" + row.score.toFixed(1) + " score</span></div>";
    }).join("") : "<p>No batch results yet.</p>";
  };

  UIManager.prototype.labelVehicles = function (primary, secondary) {
    this.elements.simALabel.textContent = primary;
    this.elements.simBLabel.textContent = secondary;
  };

  UIManager.prototype.resizeCharts = function () {
    this.charts.forEach(function (chart) { chart.resize(); });
  };

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(filename, history) {
    if (!history.length) return;
    const keys = Object.keys(history[0]);
    const csv = [keys.join(",")].concat(history.map(function (row) {
      return keys.map(function (key) { return JSON.stringify(row[key] == null ? "" : row[key]); }).join(",");
    })).join("\n");
    downloadBlob(filename, new Blob([csv], { type: "text/csv" }));
  }

  function exportJson(filename, payload) {
    downloadBlob(filename, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  }

  function exportReport(filename, report) {
    const lines = ["Rocket Aerodynamics & Reentry Analysis Report", "Generated: " + new Date().toISOString(), ""];
    report.forEach(function (entry) {
      lines.push("[" + entry.label + "]");
      lines.push("Rocket: " + entry.summary.rocket);
      lines.push("Duration: " + entry.summary.duration.toFixed(1) + " s");
      lines.push("Max altitude: " + entry.summary.maxAltitude.toFixed(0) + " m");
      lines.push("Max velocity: " + entry.summary.maxVelocity.toFixed(1) + " m/s");
      lines.push("Max Q: " + entry.summary.maxQ.toFixed(0) + " Pa");
      lines.push("Max temperature: " + entry.summary.maxTemperature.toFixed(1) + " K");
      lines.push("Max G: " + entry.summary.maxG.toFixed(2));
      lines.push("Max stress: " + entry.summary.maxStress.toFixed(0) + " N/m^2");
      lines.push("Reentry survivability score: " + entry.summary.reentryScore.toFixed(1));
      lines.push("Outcome: " + (entry.summary.survived ? "Nominal / survivable" : "Failure - " + entry.summary.failureReason));
      lines.push("");
    });
    downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/plain" }));
  }

  function runMonteCarlo(rocket, baseParameters, samples, duration) {
    const results = [];
    for (let i = 0; i < samples; i += 1) {
      const params = Object.assign({}, baseParameters, {
        windSpeed: Math.max(0, baseParameters.windSpeed + (Math.random() - 0.5) * 24),
        stageTimingBias: baseParameters.stageTimingBias + (Math.random() - 0.5) * 8,
        launchAngle: baseParameters.launchAngle + (Math.random() - 0.5) * 1.8,
        reentryAngle: baseParameters.reentryAngle + (Math.random() - 0.5) * 0.9,
        payloadMass: Math.max(0, baseParameters.payloadMass + (Math.random() - 0.5) * 1800),
      });
      const sim = new SimulationEngine(rocket, params);
      while (sim.time < duration && !sim.failed && !sim.landed) sim.step(0.25);
      const summary = sim.finalizeSummary();
      results.push({
        id: i + 1,
        maxQ: summary.maxQ,
        maxTemperature: summary.maxTemperature,
        maxG: summary.maxG,
        survived: summary.survived,
        score: summary.reentryScore,
      });
    }
    return results;
  }

  function AnalysisApp() {
    this.ui = new UIManager();
    this.rockets = Object.keys(ROCKET_DATABASE).map(function (key) { return ROCKET_DATABASE[key]; });
    this.ui.populateRocketOptions(this.rockets);
    this.ui.populateMaterials();
    this.ui.elements.rocketA.value = "falcon9";
    this.ui.elements.rocketB.value = "gslv";
    this.ui.elements.material.value = "stainless";
    this.parameters = this.ui.readParameters();
    this.primaryRocket = ROCKET_DATABASE[this.ui.elements.rocketA.value];
    this.secondaryRocket = ROCKET_DATABASE[this.ui.elements.rocketB.value];
    this.primarySim = new SimulationEngine(this.primaryRocket, this.parameters);
    this.secondarySim = new SimulationEngine(this.secondaryRocket, this.parameters);
    this.primaryViewport = new VisualizationViewport(document.getElementById("viewportA"), this.primaryRocket);
    this.secondaryViewport = new VisualizationViewport(document.getElementById("viewportB"), this.secondaryRocket);
    this.running = false;
    this.replaying = false;
    this.replayCursor = 0;
    this.lastFrame = performance.now();
    this.bindEvents();
    this.ui.labelVehicles(this.primaryRocket.name, this.secondaryRocket.name);
    this.refreshUI();
    requestAnimationFrame(this.loop.bind(this));
  }

  AnalysisApp.prototype.bindEvents = function () {
    const self = this;
    function byId(id) { return document.getElementById(id); }
    byId("startBtn").addEventListener("click", function () { self.running = true; self.replaying = false; });
    byId("pauseBtn").addEventListener("click", function () { self.running = false; });
    byId("stepBtn").addEventListener("click", function () { self.running = false; self.stepOnce(0.1); });
    byId("resetBtn").addEventListener("click", function () { self.resetSims(); });
    byId("replayBtn").addEventListener("click", function () { self.running = false; self.replaying = true; self.replayCursor = 0; });
    byId("exportCsvBtn").addEventListener("click", function () { exportCsv("primary-telemetry.csv", self.primarySim.history); });
    byId("exportJsonBtn").addEventListener("click", function () {
      exportJson("analysis-session.json", {
        primary: { summary: self.primarySim.finalizeSummary(), history: self.primarySim.history },
        secondary: { summary: self.secondarySim.finalizeSummary(), history: self.secondarySim.history },
        parameters: self.parameters,
      });
    });
    byId("reportBtn").addEventListener("click", function () {
      exportReport("analysis-report.txt", [
        { label: "Primary", summary: self.primarySim.finalizeSummary() },
        { label: "Secondary", summary: self.secondarySim.finalizeSummary() },
      ]);
    });
    byId("batchBtn").addEventListener("click", function () {
      self.ui.renderBatchResults(runMonteCarlo(self.primaryRocket, self.parameters, self.parameters.mcSamples, self.parameters.batchDuration));
    });
    byId("compareReportBtn").addEventListener("click", function () {
      exportJson("compare-report.json", {
        primary: self.primarySim.finalizeSummary(),
        secondary: self.secondarySim.finalizeSummary(),
      });
    });
    ["rocketA", "rocketB", "compareToggle", "launchAngle", "payloadMass", "thrustPercent", "windSpeed", "stageTimingBias", "reentryAngle", "simSpeed", "material", "noseCone", "viewMode", "crossSectionToggle", "failureModeToggle"].forEach(function (id) {
      byId(id).addEventListener("input", function () { self.handleParameterChange(); });
      byId(id).addEventListener("change", function () { self.handleParameterChange(); });
    });
    window.addEventListener("resize", function () {
      self.primaryViewport.resize();
      self.secondaryViewport.resize();
      self.ui.resizeCharts();
    });
  };

  AnalysisApp.prototype.handleParameterChange = function () {
    this.parameters = this.ui.readParameters();
    this.ui.setCompareEnabled(this.parameters.compareEnabled);
    this.primaryRocket = ROCKET_DATABASE[this.ui.elements.rocketA.value];
    this.secondaryRocket = ROCKET_DATABASE[this.ui.elements.rocketB.value];
    this.ui.labelVehicles(this.primaryRocket.name, this.secondaryRocket.name);
    this.resetSims();
  };

  AnalysisApp.prototype.resetSims = function () {
    this.running = false;
    this.replaying = false;
    this.replayCursor = 0;
    this.primarySim = new SimulationEngine(this.primaryRocket, this.parameters);
    this.secondarySim = new SimulationEngine(this.secondaryRocket, this.parameters);
    this.primaryViewport.setRocket(this.primaryRocket);
    this.secondaryViewport.setRocket(this.secondaryRocket);
    this.refreshUI();
  };

  AnalysisApp.prototype.stepOnce = function (dt) {
    const a = this.primarySim.step(dt);
    const b = this.parameters.compareEnabled ? this.secondarySim.step(dt) : null;
    this.refreshUI(a, b);
  };

  AnalysisApp.prototype.loop = function (now) {
    const elapsed = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const simDt = elapsed * this.parameters.simSpeed;
    let sampleA = this.primarySim.history[this.primarySim.history.length - 1];
    let sampleB = this.secondarySim.history[this.secondarySim.history.length - 1];
    if (this.running) {
      const steps = Math.max(1, Math.round(simDt / DEFAULT_DT));
      const dt = Math.max(DEFAULT_DT, simDt / steps);
      for (let i = 0; i < steps; i += 1) {
        sampleA = this.primarySim.step(dt);
        if (this.parameters.compareEnabled) sampleB = this.secondarySim.step(dt);
      }
    } else if (this.replaying) {
      sampleA = this.primarySim.history[Math.min(this.replayCursor, Math.max(this.primarySim.history.length - 1, 0))] || sampleA;
      sampleB = this.parameters.compareEnabled ? this.secondarySim.history[Math.min(this.replayCursor, Math.max(this.secondarySim.history.length - 1, 0))] || sampleB : null;
      this.replayCursor += Math.max(1, Math.round(this.parameters.simSpeed));
      if (this.replayCursor >= this.primarySim.history.length) this.replaying = false;
    }
    this.refreshUI(sampleA, sampleB);
    requestAnimationFrame(this.loop.bind(this));
  };

  AnalysisApp.prototype.refreshUI = function (sampleA, sampleB) {
    if (!sampleA) {
      sampleA = this.primarySim.snapshot();
      if (this.parameters.compareEnabled && !sampleB) sampleB = this.secondarySim.snapshot();
    }
    this.primaryViewport.update(sampleA, this.parameters);
    this.primaryViewport.render();
    if (this.parameters.compareEnabled && sampleB) {
      this.secondaryViewport.update(sampleB, this.parameters);
      this.secondaryViewport.render();
    }
    this.ui.updateMetrics(this.ui.elements.metricsA, sampleA, this.primarySim.summary);
    this.ui.elements.metricsB.innerHTML = this.parameters.compareEnabled && sampleB ? "" : "";
    if (this.parameters.compareEnabled && sampleB) this.ui.updateMetrics(this.ui.elements.metricsB, sampleB, this.secondarySim.summary);
    this.ui.updateCharts(this.primarySim.history);
    this.ui.updateConsole(sampleA, this.parameters.compareEnabled ? sampleB : null);
    this.ui.updateHeader(this.running, this.replaying, sampleA.maxQWarning || (sampleB && sampleB.maxQWarning));
  };

  try {
    if (!window.THREE) {
      throw new Error("Three.js did not load. Check your internet connection or browser network blocking.");
    }
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl") || probe.getContext("experimental-webgl"))) {
      throw new Error("WebGL is unavailable in this browser session.");
    }
    window.analysisApp = new AnalysisApp();
  } catch (error) {
    console.error(error);
    bootError(error.message || String(error));
  }
})();

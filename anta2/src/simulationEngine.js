import { G0, MATERIALS } from "./constants.js";
import {
  atmosphereAtAltitude,
  centerOfGravity,
  centerOfPressure,
  classifyPhase,
  dragCoefficient,
  dynamicPressure,
  gravityAtAltitude,
  heatFlux,
  integrateSkinTemperature,
  reentryScore,
  stabilityMargin,
  structuralStress,
} from "./models.js";

function cloneRocketModel(rocket, payloadMass) {
  return {
    ...rocket,
    payloadMass,
    stages: rocket.stages.map((stage) => ({
      ...stage,
      currentFuelMass: stage.fuelMass,
      currentDryMass: stage.dryMass,
      stageSepImpulse: stage.thrust.vacuum * 0.004,
    })),
  };
}

function totalMass(sim) {
  const activeStages = sim.rocket.stages.slice(sim.activeStage);
  return (
    sim.rocket.payloadMass +
    activeStages.reduce((sum, stage) => sum + stage.currentDryMass + stage.currentFuelMass, 0)
  );
}

export class SimulationEngine {
  constructor(rocket, parameters = {}) {
    this.baseRocket = rocket;
    this.parameters = { ...parameters };
    this.reset();
  }

  reset(parameters = this.parameters) {
    this.parameters = { ...parameters };
    this.rocket = cloneRocketModel(this.baseRocket, parameters.payloadMass);
    this.time = 0;
    this.altitude = 0;
    this.downrange = 0;
    this.velocity = 0;
    this.verticalVelocity = 0;
    this.horizontalVelocity = 0;
    this.pitch = parameters.launchAngle;
    this.pitchRate = 0;
    this.temperature = 295;
    this.maxTemperature = this.temperature;
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
    this.replayIndex = 0;
    this.history = [];
    this.summary = null;
    this.eventLog = [];
  }

  get currentStageData() {
    return this.rocket.stages[this.activeStage];
  }

  get fuelMass() {
    return this.rocket.stages.slice(this.activeStage).reduce((sum, stage) => sum + stage.currentFuelMass, 0);
  }

  get currentMass() {
    return totalMass(this);
  }

  get phase() {
    return classifyPhase(this);
  }

  step(dt) {
    if (this.failed || this.landed) {
      return this.snapshot();
    }

    this.time += dt;
    this.stageTime += dt;
    const stage = this.currentStageData;
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
    this.temperature = integrateSkinTemperature(
      this.temperature,
      this.heatFlux,
      dt,
      this.currentMass,
      this.parameters.material
    );
    this.maxTemperature = Math.max(this.maxTemperature, this.temperature);

    const totalLength = this.rocket.stages.slice(this.activeStage).reduce((sum, item) => sum + item.length, 0) + 3;
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
      const thrustCurve = stage.thrust.seaLevel + (stage.thrust.vacuum - stage.thrust.seaLevel) * vacuumFraction;
      thrust = thrustCurve * (this.parameters.thrustPercent / 100);
      const massFlow = thrust / (G0 * 300);
      const nominalBurn = Math.max(0.1, stage.burnTime + this.parameters.stageTimingBias);
      const fuelUse = Math.min(stage.currentFuelMass, Math.max(stage.fuelMass / nominalBurn, massFlow) * dt);
      stage.currentFuelMass -= fuelUse;
      if (stage.currentFuelMass <= 1 && this.activeStage < this.rocket.stages.length - 1) {
        this.eventLog.push(`T+${this.time.toFixed(1)}s: stage separation ${stage.name}`);
        this.verticalVelocity += stage.stageSepImpulse / Math.max(this.currentMass, 1);
        this.activeStage += 1;
        this.stageTime = 0;
      } else if (stage.currentFuelMass <= 1 && this.activeStage === this.rocket.stages.length - 1) {
        thrust = 0;
      }
    }

    if (this.phase === "landing" && this.baseRocket.landingCapable && this.verticalVelocity < -15) {
      thrust = Math.max(thrust, this.currentMass * gravity * 1.25);
    }

    this.thrust = thrust;
    const mass = this.currentMass;
    const flightPathRad = (this.pitch * Math.PI) / 180;
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
    const materialLimit = material.maxTemp;
    if (this.parameters.failureMode && this.temperature > materialLimit * 1.03) {
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
  }

  snapshot() {
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
      fuelMass: this.fuelMass,
      thrust: this.thrust,
      mach: this.mach,
      stress: this.stress,
      stabilityMargin: this.stabilityMargin,
      phase: this.phase,
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
  }

  finalizeSummary() {
    const material = MATERIALS[this.parameters.material];
    const summary = {
      rocket: this.baseRocket.name,
      duration: this.time,
      maxAltitude: Math.max(...this.history.map((item) => item.altitude), 0),
      maxVelocity: Math.max(...this.history.map((item) => item.velocity), 0),
      maxQ: this.maxQ,
      maxTemperature: this.maxTemperature,
      maxG: this.maxG,
      maxStress: this.maxStress,
      materialLimit: material.maxTemp,
      survived: !this.failed,
      failureReason: this.failureReason,
    };
    summary.reentryScore = reentryScore(summary);
    this.summary = summary;
    return summary;
  }
}

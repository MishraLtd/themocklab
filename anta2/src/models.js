import {
  EARTH_RADIUS,
  G0,
  MATERIALS,
  NOSE_CONES,
  SCALE_HEIGHT,
  SEA_LEVEL_DENSITY,
  SEA_LEVEL_PRESSURE,
  STAGE_EVENTS,
} from "./constants.js";

export function atmosphereAtAltitude(altitude) {
  const clamped = Math.max(0, altitude);
  const density = SEA_LEVEL_DENSITY * Math.exp(-clamped / SCALE_HEIGHT);
  const pressure = SEA_LEVEL_PRESSURE * Math.exp(-clamped / SCALE_HEIGHT);
  const temperature =
    clamped < 11000 ? 288.15 - 0.0065 * clamped : clamped < 25000 ? 216.65 : 216.65 + 0.002 * (clamped - 25000);
  const soundSpeed = Math.sqrt(1.4 * 287.05 * temperature);
  return { density, pressure, temperature, soundSpeed };
}

export function gravityAtAltitude(altitude) {
  return G0 * Math.pow(EARTH_RADIUS / (EARTH_RADIUS + Math.max(0, altitude)), 2);
}

export function dynamicPressure(density, velocity) {
  return 0.5 * density * velocity * velocity;
}

export function dragCoefficient(baseCd, mach, noseConeKey) {
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

export function heatFlux(density, velocity, noseConeKey) {
  return 0.00016 * Math.sqrt(Math.max(density, 0)) * Math.pow(Math.abs(velocity), 3) * NOSE_CONES[noseConeKey].heatingMultiplier;
}

export function integrateSkinTemperature(temperature, flux, dt, totalMass, materialKey) {
  const material = MATERIALS[materialKey];
  const effectiveMass = Math.max(totalMass * 0.015, 200);
  const cooling = Math.max(0, temperature - 260) * material.emissivity * 0.015;
  const dT = ((flux - cooling) * dt) / (effectiveMass * material.cp);
  return Math.max(220, temperature + dT);
}

export function centerOfGravity(stages, activeStageIndex, payloadMass) {
  let weightedMoment = 0;
  let totalMass = payloadMass;
  let runningHeight = 0;
  stages.forEach((stage, index) => {
    const isActive = index >= activeStageIndex;
    if (!isActive) {
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

export function centerOfPressure(totalLength, noseConeKey, mach) {
  const nose = NOSE_CONES[noseConeKey];
  const machShift = mach > 1 ? Math.min(0.12, (mach - 1) * 0.025) : -0.06 * (1 - mach);
  return totalLength * (0.58 + nose.cpShift + machShift);
}

export function stabilityMargin(caliber, cg, cp) {
  return (cp - cg) / Math.max(caliber, 0.1);
}

export function structuralStress(dynamicQ, angleOfAttack, windShear, thrustVectorOffset = 0) {
  const bending = dynamicQ * (1 + Math.abs(angleOfAttack) * 6 + Math.abs(windShear) * 0.08);
  const vibration = Math.abs(windShear) * 2200 + Math.abs(thrustVectorOffset) * 1200;
  return bending + vibration;
}

export function reentryScore(metrics) {
  const temperaturePenalty = Math.max(0, metrics.maxTemperature - metrics.materialLimit) / metrics.materialLimit;
  const loadPenalty = Math.max(0, metrics.maxG - 8) / 8;
  const qPenalty = Math.max(0, metrics.maxQ - 60000) / 60000;
  const base = 100 - (temperaturePenalty * 48 + loadPenalty * 24 + qPenalty * 18);
  return Math.max(0, Math.min(100, base));
}

export function classifyPhase(sim) {
  if (sim.failed) return STAGE_EVENTS.FAILED;
  if (sim.landed) return STAGE_EVENTS.COMPLETE;
  if (sim.altitude > 120000 && sim.verticalVelocity > 0) return STAGE_EVENTS.COAST;
  if (sim.verticalVelocity < -100 && sim.altitude < 90000) return STAGE_EVENTS.REENTRY;
  if (sim.verticalVelocity < -40 && sim.altitude < 2500 && sim.rocket.landingCapable) return STAGE_EVENTS.LANDING;
  return STAGE_EVENTS.BURNING;
}

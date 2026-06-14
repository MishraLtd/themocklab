export const SEA_LEVEL_DENSITY = 1.225;
export const SEA_LEVEL_PRESSURE = 101325;
export const SCALE_HEIGHT = 8500;
export const EARTH_RADIUS = 6371000;
export const EARTH_MU = 3.986004418e14;
export const EARTH_OMEGA = 7.2921159e-5;
export const G0 = 9.80665;
export const DEFAULT_DT = 1 / 60;
export const CHART_KEYS = [
  ["velocityChart", "velocity", "Velocity (m/s)", "#4fd1ff"],
  ["altitudeChart", "altitude", "Altitude (m)", "#6bffb3"],
  ["temperatureChart", "temperature", "Temperature (K)", "#ff8855"],
  ["qChart", "dynamicPressure", "Dynamic Pressure (Pa)", "#ffbf47"],
  ["dragChart", "drag", "Drag (N)", "#ff5e5e"],
  ["gLoadChart", "gLoad", "G-Load", "#dca6ff"],
  ["fuelChart", "fuelMass", "Fuel Mass (kg)", "#8ec9ff"],
];

export const MATERIALS = {
  aluminum: { label: "Al-Li Alloy", cp: 910, maxTemp: 620, densityFactor: 1, emissivity: 0.35 },
  stainless: { label: "Stainless Steel", cp: 500, maxTemp: 1450, densityFactor: 1.12, emissivity: 0.58 },
  carbon: { label: "Carbon Composite", cp: 710, maxTemp: 820, densityFactor: 0.78, emissivity: 0.62 },
  titanium: { label: "Titanium Alloy", cp: 520, maxTemp: 1660, densityFactor: 1.06, emissivity: 0.44 },
};

export const NOSE_CONES = {
  ogive: { dragMultiplier: 0.92, shockMultiplier: 0.88, heatingMultiplier: 0.95, cpShift: -0.16 },
  cone: { dragMultiplier: 1.0, shockMultiplier: 1.0, heatingMultiplier: 1.0, cpShift: 0.0 },
  blunt: { dragMultiplier: 1.15, shockMultiplier: 1.25, heatingMultiplier: 1.22, cpShift: 0.18 },
};

export const VIEW_MODES = {
  pressure: "pressure",
  thermal: "thermal",
  structural: "structural",
  neutral: "neutral",
};

export const STAGE_EVENTS = {
  BURNING: "burning",
  COAST: "coast",
  REENTRY: "reentry",
  LANDING: "landing",
  FAILED: "failed",
  COMPLETE: "complete",
};

export const ENGINEERING_NOTES = [
  "Aerodynamic drag and dynamic pressure use standard continuum-flow approximations with Mach-based drag rise and simplified shape correction.",
  "Thermal loading uses a Sutton-Graves style proportional approximation: heat flux scales with sqrt(rho) * v^3 and is integrated into vehicle skin temperature using material heat capacity.",
  "Structural load view estimates bending demand from dynamic pressure, sideforce, and wind-shear-driven angle of attack rather than full finite element vibration analysis.",
  "Stage separation, reentry guidance, and landing burn logic follow deterministic engineering heuristics suitable for desktop study and comparative trade analysis.",
];

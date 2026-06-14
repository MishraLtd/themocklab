import { MATERIALS } from "./constants.js";

const seaLevelVacBlend = (seaLevel, vacuum) => ({ seaLevel, vacuum });

export const ROCKET_DATABASE = {
  pslv: {
    key: "pslv",
    name: "PSLV",
    reusable: false,
    referenceDiameter: 2.8,
    baseCd: 0.31,
    structureFraction: 0.13,
    defaultMaterial: "aluminum",
    defaultPayload: 3800,
    landingCapable: false,
    stages: [
      {
        name: "PS1 Core",
        dryMass: 30000,
        fuelMass: 138000,
        burnTime: 105,
        thrust: seaLevelVacBlend(4800000, 5100000),
        diameter: 2.8,
        length: 20.3,
      },
      {
        name: "PS2",
        dryMass: 5200,
        fuelMass: 41500,
        burnTime: 150,
        thrust: seaLevelVacBlend(800000, 846000),
        diameter: 2.8,
        length: 12.8,
      },
      {
        name: "PS3",
        dryMass: 1800,
        fuelMass: 7600,
        burnTime: 112,
        thrust: seaLevelVacBlend(245000, 260000),
        diameter: 2.0,
        length: 3.6,
      },
      {
        name: "PS4",
        dryMass: 920,
        fuelMass: 2500,
        burnTime: 520,
        thrust: seaLevelVacBlend(14000, 15000),
        diameter: 2.0,
        length: 3.0,
      },
    ],
  },
  gslv: {
    key: "gslv",
    name: "GSLV Mk II",
    reusable: false,
    referenceDiameter: 2.8,
    baseCd: 0.33,
    structureFraction: 0.14,
    defaultMaterial: "aluminum",
    defaultPayload: 5000,
    landingCapable: false,
    stages: [
      {
        name: "S139 Core",
        dryMass: 36000,
        fuelMass: 138000,
        burnTime: 108,
        thrust: seaLevelVacBlend(4700000, 5000000),
        diameter: 2.8,
        length: 24.0,
      },
      {
        name: "GS2",
        dryMass: 6200,
        fuelMass: 39500,
        burnTime: 150,
        thrust: seaLevelVacBlend(790000, 860000),
        diameter: 2.8,
        length: 12.9,
      },
      {
        name: "CUS",
        dryMass: 4300,
        fuelMass: 12900,
        burnTime: 720,
        thrust: seaLevelVacBlend(73000, 93500),
        diameter: 2.8,
        length: 8.0,
      },
    ],
  },
  falcon9: {
    key: "falcon9",
    name: "Falcon 9 Block 5",
    reusable: true,
    referenceDiameter: 3.7,
    baseCd: 0.28,
    structureFraction: 0.11,
    defaultMaterial: "stainless",
    defaultPayload: 15600,
    landingCapable: true,
    stages: [
      {
        name: "Stage 1",
        dryMass: 25600,
        fuelMass: 411000,
        burnTime: 162,
        thrust: seaLevelVacBlend(7607000, 8227000),
        diameter: 3.7,
        length: 41.2,
      },
      {
        name: "Stage 2",
        dryMass: 4500,
        fuelMass: 107500,
        burnTime: 397,
        thrust: seaLevelVacBlend(845000, 981000),
        diameter: 3.7,
        length: 13.8,
      },
    ],
  },
  falconHeavy: {
    key: "falconHeavy",
    name: "Falcon Heavy",
    reusable: true,
    referenceDiameter: 3.7,
    baseCd: 0.3,
    structureFraction: 0.12,
    defaultMaterial: "stainless",
    defaultPayload: 25000,
    landingCapable: true,
    stages: [
      {
        name: "Core + Side Boosters",
        dryMass: 77200,
        fuelMass: 1150000,
        burnTime: 154,
        thrust: seaLevelVacBlend(22819000, 24680000),
        diameter: 12.2,
        length: 41.2,
      },
      {
        name: "Upper Stage",
        dryMass: 4500,
        fuelMass: 107500,
        burnTime: 397,
        thrust: seaLevelVacBlend(845000, 981000),
        diameter: 3.7,
        length: 13.8,
      },
    ],
  },
};

export function getRocketKeys() {
  return Object.keys(ROCKET_DATABASE);
}

export function getMaterialEntries() {
  return Object.entries(MATERIALS).map(([key, value]) => ({
    key,
    label: value.label,
  }));
}

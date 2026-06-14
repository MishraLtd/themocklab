import { SimulationEngine } from "./simulationEngine.js";

export function runMonteCarlo(rocket, baseParameters, samples = 20, duration = 480) {
  const results = [];
  for (let i = 0; i < samples; i += 1) {
    const params = {
      ...baseParameters,
      windSpeed: Math.max(0, baseParameters.windSpeed + (Math.random() - 0.5) * 24),
      stageTimingBias: baseParameters.stageTimingBias + (Math.random() - 0.5) * 8,
      launchAngle: baseParameters.launchAngle + (Math.random() - 0.5) * 1.8,
      reentryAngle: baseParameters.reentryAngle + (Math.random() - 0.5) * 0.9,
      payloadMass: Math.max(0, baseParameters.payloadMass + (Math.random() - 0.5) * 1800),
    };
    const sim = new SimulationEngine(rocket, params);
    while (sim.time < duration && !sim.failed && !sim.landed) {
      sim.step(0.25);
    }
    const summary = sim.finalizeSummary();
    results.push({
      id: i + 1,
      windSpeed: params.windSpeed,
      stageBias: params.stageTimingBias,
      maxQ: summary.maxQ,
      maxTemperature: summary.maxTemperature,
      maxG: summary.maxG,
      survived: summary.survived,
      score: summary.reentryScore,
    });
  }
  return results;
}

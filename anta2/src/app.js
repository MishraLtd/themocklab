import { DEFAULT_DT } from "./constants.js";
import { exportCsv, exportJson, exportReport } from "./exporter.js";
import { ROCKET_DATABASE, getRocketKeys } from "./rocketDatabase.js";
import { SimulationEngine } from "./simulationEngine.js";
import { UIManager } from "./ui.js";
import { VisualizationViewport } from "./visualizationEngine.js";
import { runMonteCarlo } from "./batchRunner.js";

export class AnalysisApp {
  constructor() {
    this.ui = new UIManager();
    this.rockets = getRocketKeys().map((key) => ROCKET_DATABASE[key]);
    this.ui.populateRocketOptions(this.rockets);
    this.ui.populateMaterials();
    this.ui.elements.rocketA.value = "falcon9";
    this.ui.elements.rocketB.value = "gslv";
    this.ui.elements.material.value = "stainless";

    this.primaryRocket = ROCKET_DATABASE[this.ui.elements.rocketA.value];
    this.secondaryRocket = ROCKET_DATABASE[this.ui.elements.rocketB.value];
    this.parameters = this.ui.readParameters();

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

  bindEvents() {
    const byId = (id) => document.getElementById(id);
    byId("startBtn").addEventListener("click", () => {
      this.running = true;
      this.replaying = false;
    });
    byId("pauseBtn").addEventListener("click", () => {
      this.running = false;
    });
    byId("stepBtn").addEventListener("click", () => {
      this.running = false;
      this.stepOnce(0.1);
    });
    byId("resetBtn").addEventListener("click", () => this.resetSims());
    byId("replayBtn").addEventListener("click", () => {
      this.running = false;
      this.replaying = true;
      this.replayCursor = 0;
    });
    byId("exportCsvBtn").addEventListener("click", () => exportCsv("primary-telemetry.csv", this.primarySim.history));
    byId("exportJsonBtn").addEventListener("click", () =>
      exportJson("analysis-session.json", {
        primary: { summary: this.primarySim.finalizeSummary(), history: this.primarySim.history },
        secondary: { summary: this.secondarySim.finalizeSummary(), history: this.secondarySim.history },
        parameters: this.parameters,
      })
    );
    byId("reportBtn").addEventListener("click", () =>
      exportReport("analysis-report.txt", [
        { label: "Primary", summary: this.primarySim.finalizeSummary() },
        { label: "Secondary", summary: this.secondarySim.finalizeSummary() },
      ])
    );
    byId("batchBtn").addEventListener("click", () => this.runBatch());
    byId("compareReportBtn").addEventListener("click", () =>
      exportJson("compare-report.json", {
        primary: this.primarySim.finalizeSummary(),
        secondary: this.secondarySim.finalizeSummary(),
      })
    );

    const reactiveIds = [
      "rocketA",
      "rocketB",
      "compareToggle",
      "launchAngle",
      "payloadMass",
      "thrustPercent",
      "windSpeed",
      "stageTimingBias",
      "reentryAngle",
      "simSpeed",
      "material",
      "noseCone",
      "viewMode",
      "crossSectionToggle",
      "failureModeToggle",
    ];
    reactiveIds.forEach((id) => byId(id).addEventListener("input", () => this.handleParameterChange()));
    window.addEventListener("resize", () => {
      this.primaryViewport.resize();
      this.secondaryViewport.resize();
      this.ui.resizeCharts();
    });
  }

  handleParameterChange() {
    this.parameters = this.ui.readParameters();
    this.ui.setCompareEnabled(this.parameters.compareEnabled);
    this.primaryRocket = ROCKET_DATABASE[this.ui.elements.rocketA.value];
    this.secondaryRocket = ROCKET_DATABASE[this.ui.elements.rocketB.value];
    this.ui.labelVehicles(this.primaryRocket.name, this.secondaryRocket.name);
    this.resetSims();
  }

  resetSims() {
    this.running = false;
    this.replaying = false;
    this.replayCursor = 0;
    this.primarySim = new SimulationEngine(this.primaryRocket, this.parameters);
    this.secondarySim = new SimulationEngine(this.secondaryRocket, this.parameters);
    this.primaryViewport.setRocket(this.primaryRocket);
    this.secondaryViewport.setRocket(this.secondaryRocket);
    this.refreshUI();
  }

  stepOnce(dt) {
    const a = this.primarySim.step(dt);
    const b = this.parameters.compareEnabled ? this.secondarySim.step(dt) : null;
    this.refreshUI(a, b);
  }

  loop(now) {
    const elapsed = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    const simDt = elapsed * this.parameters.simSpeed;

    let sampleA = this.primarySim.history.at(-1);
    let sampleB = this.secondarySim.history.at(-1);

    if (this.running) {
      const steps = Math.max(1, Math.round(simDt / DEFAULT_DT));
      const dt = Math.max(DEFAULT_DT, simDt / steps);
      for (let i = 0; i < steps; i += 1) {
        sampleA = this.primarySim.step(dt);
        if (this.parameters.compareEnabled) {
          sampleB = this.secondarySim.step(dt);
        }
      }
    } else if (this.replaying) {
      sampleA = this.primarySim.history[Math.min(this.replayCursor, this.primarySim.history.length - 1)] || sampleA;
      sampleB = this.parameters.compareEnabled
        ? this.secondarySim.history[Math.min(this.replayCursor, this.secondarySim.history.length - 1)] || sampleB
        : null;
      this.replayCursor += Math.max(1, Math.round(this.parameters.simSpeed));
      if (this.replayCursor >= this.primarySim.history.length) {
        this.replaying = false;
      }
    }

    this.refreshUI(sampleA, sampleB);
    requestAnimationFrame(this.loop.bind(this));
  }

  refreshUI(sampleA = this.primarySim.history.at(-1), sampleB = this.secondarySim.history.at(-1)) {
    if (!sampleA) {
      sampleA = this.primarySim.snapshot();
      if (this.parameters.compareEnabled && !sampleB) {
        sampleB = this.secondarySim.snapshot();
      }
    }

    this.primaryViewport.update(sampleA, this.parameters);
    this.primaryViewport.render();
    if (this.parameters.compareEnabled && sampleB) {
      this.secondaryViewport.update(sampleB, this.parameters);
      this.secondaryViewport.render();
    }

    this.ui.updateMetrics(this.ui.elements.metricsA, sampleA, this.primarySim.summary);
    if (this.parameters.compareEnabled && sampleB) {
      this.ui.updateMetrics(this.ui.elements.metricsB, sampleB, this.secondarySim.summary);
    } else {
      this.ui.elements.metricsB.innerHTML = "";
    }
    this.ui.updateCharts(this.primarySim.history);
    this.ui.updateConsole(sampleA, this.parameters.compareEnabled ? sampleB : null);
    this.ui.updateHeader(this.running, this.replaying, sampleA.maxQWarning || sampleB?.maxQWarning);
  }

  runBatch() {
    const results = runMonteCarlo(
      this.primaryRocket,
      this.parameters,
      this.parameters.mcSamples,
      this.parameters.batchDuration
    );
    this.ui.renderBatchResults(results);
  }
}

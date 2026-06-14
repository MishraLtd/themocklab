import { CHART_KEYS, ENGINEERING_NOTES, MATERIALS } from "./constants.js";
import { TelemetryChart } from "./charts.js";

function metricCard(label, value, tone = "") {
  return `<div class="metric-card ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
}

export class UIManager {
  constructor() {
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

    CHART_KEYS.forEach(([canvasId, key, label, color]) => {
      const chart = new TelemetryChart(document.getElementById(canvasId), label, color);
      chart.resize();
      this.charts.set(key, chart);
    });
    this.renderNotes();
  }

  populateRocketOptions(rockets) {
    [this.elements.rocketA, this.elements.rocketB].forEach((select) => {
      select.innerHTML = rockets
        .map((rocket) => `<option value="${rocket.key}">${rocket.name}</option>`)
        .join("");
    });
  }

  populateMaterials() {
    this.elements.material.innerHTML = Object.entries(MATERIALS)
      .map(([key, material]) => `<option value="${key}">${material.label}</option>`)
      .join("");
  }

  readParameters() {
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
  }

  setCompareEnabled(enabled) {
    this.elements.viewportGrid.classList.toggle("compare-enabled", enabled);
    this.elements.secondaryPanel.style.display = enabled ? "" : "none";
  }

  updateMetrics(container, sample, summary) {
    if (!sample) return;
    container.innerHTML = [
      metricCard("Altitude", `${sample.altitude.toFixed(0)} m`),
      metricCard("Velocity", `${sample.velocity.toFixed(1)} m/s`),
      metricCard("Mach", `${sample.mach.toFixed(2)}`),
      metricCard("Q", `${sample.dynamicPressure.toFixed(0)} Pa`, sample.maxQWarning ? "warn" : ""),
      metricCard("Skin Temp", `${sample.temperature.toFixed(1)} K`, sample.temperature > 900 ? "danger" : ""),
      metricCard("Stability", `${sample.stabilityMargin.toFixed(2)} cal`, sample.stabilityMargin < 1 ? "warn" : "good"),
      metricCard("Stress", `${sample.stress.toFixed(0)}`),
      metricCard("Outcome", summary ? `${summary.reentryScore.toFixed(1)} score` : sample.phase),
    ].join("");
  }

  updateConsole(primary, secondary) {
    const rows = [
      ["Primary", primary],
      ["Secondary", secondary],
    ]
      .filter(([, sample]) => sample)
      .map(
        ([label, sample]) => `
          <div class="console-row">
            <strong>${label}</strong>
            <span>${sample.phase}</span>
            <span>${sample.fuelMass.toFixed(0)} kg fuel</span>
            <span>${sample.failed ? sample.failureReason : sample.landed ? "Landed" : "Nominal"}</span>
          </div>`
      );
    this.elements.consoleTable.innerHTML = rows.join("");
  }

  updateCharts(history) {
    this.charts.forEach((chart, key) => {
      chart.setValues(history.map((item) => item[key] ?? 0));
      chart.draw();
    });
  }

  renderBatchResults(rows) {
    this.elements.batchResults.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
              <div class="batch-row">
                <strong>Run ${row.id}</strong>
                <span>${row.maxQ.toFixed(0)} Pa Qmax</span>
                <span>${row.maxTemperature.toFixed(0)} K Tmax</span>
                <span class="${row.survived ? "good" : "danger"}">${row.score.toFixed(1)} score</span>
              </div>`
          )
          .join("")
      : "<p>No batch results yet.</p>";
  }

  updateHeader(isRunning, replaying, hasMaxQWarning) {
    this.elements.runModeLabel.textContent = isRunning ? "Running" : "Paused";
    this.elements.replayLabel.textContent = replaying ? "Playing back" : "Idle";
    const strong = this.elements.maxQWarning.querySelector("strong");
    strong.textContent = hasMaxQWarning ? "MAX-Q REGION" : "Nominal";
    strong.className = hasMaxQWarning ? "warn" : "good";
  }

  renderNotes() {
    this.elements.engineeringNotes.innerHTML = ENGINEERING_NOTES.map((note) => `<p>${note}</p>`).join("");
  }

  labelVehicles(primary, secondary) {
    this.elements.simALabel.textContent = primary;
    this.elements.simBLabel.textContent = secondary;
  }

  resizeCharts() {
    this.charts.forEach((chart) => chart.resize());
  }
}

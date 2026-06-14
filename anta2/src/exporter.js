function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(filename, history) {
  if (!history.length) return;
  const keys = Object.keys(history[0]);
  const csv = [
    keys.join(","),
    ...history.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(",")),
  ].join("\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv" }));
}

export function exportJson(filename, payload) {
  downloadBlob(filename, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
}

export function exportReport(filename, report) {
  const lines = [
    "Rocket Aerodynamics & Reentry Analysis Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    ...report.flatMap((entry) => [
      `[${entry.label}]`,
      `Rocket: ${entry.summary.rocket}`,
      `Duration: ${entry.summary.duration.toFixed(1)} s`,
      `Max altitude: ${entry.summary.maxAltitude.toFixed(0)} m`,
      `Max velocity: ${entry.summary.maxVelocity.toFixed(1)} m/s`,
      `Max Q: ${entry.summary.maxQ.toFixed(0)} Pa`,
      `Max temperature: ${entry.summary.maxTemperature.toFixed(1)} K`,
      `Max G: ${entry.summary.maxG.toFixed(2)}`,
      `Max stress: ${entry.summary.maxStress.toFixed(0)} N/m^2`,
      `Reentry survivability score: ${entry.summary.reentryScore.toFixed(1)}`,
      `Outcome: ${entry.summary.survived ? "Nominal / survivable" : `Failure - ${entry.summary.failureReason}`}`,
      "",
    ]),
  ].join("\n");
  downloadBlob(filename, new Blob([lines], { type: "text/plain" }));
}

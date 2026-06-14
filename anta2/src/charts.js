export class TelemetryChart {
  constructor(canvas, label, color) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.label = label;
    this.color = color;
    this.values = [];
    this.maxPoints = 240;
  }

  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || 240;
    const height = this.canvas.clientHeight || 150;
    this.canvas.width = width * ratio;
    this.canvas.height = height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  setValues(values) {
    this.values = values.slice(-this.maxPoints);
  }

  draw() {
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

    if (this.values.length < 2) {
      return;
    }

    const min = Math.min(...this.values);
    const max = Math.max(...this.values);
    const span = max - min || 1;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.values.forEach((value, index) => {
      const x = 8 + (index / Math.max(this.values.length - 1, 1)) * (width - 16);
      const y = height - 18 - ((value - min) / span) * (height - 38);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.fillText(max.toFixed(1), width - 56, 14);
  }
}

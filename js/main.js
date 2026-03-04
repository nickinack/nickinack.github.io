/* ============================================================
   KARTHIK VISWANATHAN — main.js
   Warm editorial · Minimal animations
   ============================================================ */

'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.text();
}
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url}`);
  return res.json();
}
function parseKV(text) {
  const obj = {};
  text.split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i === -1) return;
    obj[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return obj;
}
function parseResearch(text) {
  return text.split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(line => {
      const p = line.split('|').map(s => s.trim());
      return { icon: p[0], title: p[1], desc: p[2] };
    }).filter(r => r.title);
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

// ── Ink-Sketch Animal Canvas ──────────────────────────────────────────────────
// Draws faint pencil-style animal silhouettes on the warm cream background.
// All stroke-based (no fill) — like light pencil marks on parchment.

class AnimalCanvas {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.animals = [];
    this.clouds  = [];
    this.winds   = [];
    this.W = 0; this.H = 0;
    this._lastTs = 0;
    this._grassPhase = 0;
    this._sunAngle = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    this.populate();
    this.populateClouds();
    this.populateWinds();
    this.frame();
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.W = this.canvas.width;
    this.H = this.canvas.height;
    // Three ponds spread across the grassland
    const defs = [
      { tx: 0.18, rx: Math.min(130, this.W * 0.12), ry: 46 },
      { tx: 0.52, rx: Math.min(190, this.W * 0.17), ry: 58 },
      { tx: 0.82, rx: Math.min(140, this.W * 0.13), ry: 50 },
    ];
    this.ponds = defs.map(({ tx, rx, ry }) => {
      const phY = this.H * 0.70
        + Math.sin(tx * Math.PI * 2.5 + 0.8) * 16
        + Math.cos(tx * Math.PI * 1.5 + 0.3) * 10;
      return { cx: this.W * tx, cy: phY + ry * 2.2, rx, ry };
    });
  }

  // Types: bird, penguin, cat, rabbit, fish, monkey, bear
  populate() {
    const types = [
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'bird','bird','bird','bird','bird','bird','bird','bird','bird','bird',
      'penguin','penguin','penguin','penguin','penguin','penguin','penguin',
      'penguin','penguin','penguin','penguin','penguin','penguin','penguin',
      'cat','cat','cat','cat','cat','cat','cat',
      'cat','cat','cat','cat','cat','cat','cat',
      'rabbit','rabbit','rabbit','rabbit','rabbit','rabbit',
      'rabbit','rabbit','rabbit','rabbit','rabbit','rabbit',
      'fish','fish','fish','fish','fish','fish','fish','fish',
      'fish','fish','fish','fish','fish','fish','fish','fish',
      'monkey','monkey','monkey','monkey','monkey','monkey',
      'monkey','monkey','monkey','monkey','monkey','monkey',
      'bear','bear','bear','bear','bear','bear',
      'bear','bear','bear','bear','bear','bear',
    ];
    // Soft watercolour palette — one hue per species
    const palette = {
      bird:    '15, 12, 10',     // near-black
      penguin: '198, 90,  52',   // terracotta
      cat:     '178, 80, 140',   // dusty rose
      rabbit:  '128, 78, 178',   // lavender violet
      fish:    '46,  158, 140',  // teal
      monkey:  '182, 130,  38',  // golden amber
      bear:    '88,  142,  78',  // sage green
    };
    // Pre-count for slot-based spacing (avoids initial clustering)
    const birdTotal   = types.filter(t => t === 'bird').length;
    const groundTotal = types.filter(t => t !== 'bird' && t !== 'fish').length;
    let birdIdx = 0, groundIdx = 0, fishIdx = 0;

    types.forEach((type, i) => {
      const goRight = i % 2 === 0;
      const speedBase = { bird:0.55, penguin:0.32, cat:0.42, rabbit:0.38, fish:0.35, monkey:0.36, bear:0.28 }[type];

      let initX, initY, lane = 0, pondAssign = 0;

      if (type === 'fish') {
        pondAssign = fishIdx % this.ponds.length;
        const p    = this.ponds[pondAssign];
        initX = p.cx + (Math.random() - 0.5) * p.rx * 1.3;
        initY = p.cy + (Math.random() - 0.5) * p.ry * 0.5;
        fishIdx++;
      } else if (type === 'bird') {
        // Spread birds evenly in a grid across sky
        const col = birdIdx % 10, row = Math.floor(birdIdx / 10);
        initX = (col / 10) * this.W + Math.random() * (this.W / 10) * 0.8;
        initY = this.H * (0.12 + (row / Math.ceil(birdTotal / 10)) * 0.30 + Math.random() * 0.03);
        birdIdx++;
      } else {
        // Spread ground animals evenly; interleave lanes so same-lane animals
        // are spaced apart (lane alternates: 0,1,2,0,1,2… within each slot third)
        const slot = groundIdx / groundTotal;
        initX = slot * this.W + (Math.random() - 0.5) * (this.W / groundTotal) * 0.3;
        initY = this.H * 0.68;
        lane  = groundIdx % 3;
        groundIdx++;
      }

      this.animals.push({
        type,
        color: palette[type],
        lane,
        pondIdx: pondAssign,
        x:     initX,
        y:     initY,
        vx:    goRight ? speedBase + Math.random() * 0.25 : -(speedBase + Math.random() * 0.25),
        scale: type === 'fish' ? 0.5 + Math.random() * 0.4
             : 1.0 - lane * 0.12 + Math.random() * 0.3,  // far lane = slightly smaller
        alpha: type === 'fish' ? 0.22 + Math.random() * 0.10
             : 0.20 + Math.random() * 0.10 + lane * 0.04,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.025 + Math.random() * 0.03,
        driftAmp:   type === 'bird' ? 14 + Math.random() * 18 : 4,
        driftFreq:  0.008 + Math.random() * 0.008,
        driftOffset: Math.random() * Math.PI * 2,
        baseY: initY,
      });
    });
  }

  populateClouds() {
    for (let i = 0; i < 14; i++) {
      const goRight = i % 2 === 0;
      this.clouds.push({
        x:          Math.random() * this.W,
        y:          this.H * (0.03 + Math.random() * 0.22),
        vx:         (goRight ? 1 : -1) * (0.05 + Math.random() * 0.09),
        scale:      1.6 + Math.random() * 2.4,
        alpha:      0.20 + Math.random() * 0.12,
        wobble:     Math.random() * Math.PI * 2,
        wobbleSpd:  0.0015 + Math.random() * 0.002,
      });
    }
  }

  populateWinds() {
    for (let i = 0; i < 20; i++) {
      this.winds.push({
        x:        Math.random() * this.W,
        y:        this.H * (0.18 + Math.random() * 0.55),
        speed:    0.4 + Math.random() * 0.7,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 0.018 + Math.random() * 0.022,
        size:     14 + Math.random() * 32,
        alpha:    0.30 + Math.random() * 0.25,
        turns:    2 + Math.random(),          // how many coils
      });
    }
  }

  reset(a) {
    if (a.type === 'fish') {
      const pond = this.ponds[a.pondIdx || 0];
      a.x    = pond.cx + (Math.random() - 0.5) * pond.rx * 1.2;
      a.y    = pond.cy;
      a.baseY = pond.cy;
      return;
    }
    const goRight = a.vx > 0;
    a.x     = goRight ? -120 : this.W + 120;
    a.baseY = a.type === 'bird' ? this.H * (0.12 + Math.random() * 0.32) : this.H * 0.68;
    if (a.type !== 'bird') a.lane = (a.lane || 0); // keep same lane
    a.y     = a.baseY;
    a.driftOffset = Math.random() * Math.PI * 2;
  }

  // ── Drawers (all stroke, no fill) ──────────────────────────────────────────

  drawBird(ctx, phase) {
    const flap = Math.sin(phase) * 9;
    ctx.lineWidth = 1.8;
    // Left wing — filled teardrop
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(-11, -flap, -22, 2);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.quadraticCurveTo(11, -flap, 22, 2);
    ctx.lineTo(0, 1);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.arc(0, 1, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPenguin(ctx, phase) {
    const waddle = Math.sin(phase) * 0.09;
    ctx.save();
    ctx.rotate(waddle);
    ctx.lineWidth = 1.8;
    // Body — filled
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 15, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Head — filled
    ctx.beginPath();
    ctx.arc(0, -17, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Belly — cream contrast
    const fc = ctx.fillStyle;
    ctx.beginPath();
    ctx.ellipse(0, 4, 6, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,248,235,0.72)';
    ctx.fill(); ctx.fillStyle = fc;
    ctx.stroke();
    // Beak
    ctx.beginPath();
    ctx.moveTo(-3, -17); ctx.lineTo(0, -12); ctx.lineTo(3, -17);
    ctx.stroke();
    // Fins
    ctx.beginPath();
    ctx.moveTo(-10, -4); ctx.quadraticCurveTo(-18, 4, -12, 14);
    ctx.moveTo( 10, -4); ctx.quadraticCurveTo( 18, 4,  12, 14);
    ctx.stroke();
    // Feet
    ctx.beginPath();
    ctx.moveTo(-4, 16); ctx.lineTo(-7, 21);
    ctx.moveTo( 4, 16); ctx.lineTo( 7, 21);
    ctx.stroke();
    ctx.restore();
  }

  drawCat(ctx, phase) {
    const leg = Math.sin(phase) * 5;
    ctx.lineWidth = 1.8;
    // Body — filled
    ctx.beginPath();
    ctx.ellipse(2, 0, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Head — filled
    ctx.beginPath();
    ctx.arc(-13, -6, 7, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Ears — filled triangles
    ctx.beginPath();
    ctx.moveTo(-18, -11); ctx.lineTo(-15, -17); ctx.lineTo(-10, -12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-11, -11); ctx.lineTo(-8, -17); ctx.lineTo(-4, -12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(15, 4);
    ctx.quadraticCurveTo(24, 10, 22, 20);
    ctx.quadraticCurveTo(20, 26, 25, 28);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(-6,  8); ctx.lineTo(-8  + leg, 20);
    ctx.moveTo(-1,  8); ctx.lineTo(-2  - leg, 20);
    ctx.moveTo( 7,  8); ctx.lineTo( 9  + leg, 20);
    ctx.moveTo(12,  7); ctx.lineTo(13  - leg, 20);
    ctx.stroke();
  }

  drawRabbit(ctx, phase) {
    const wig = Math.sin(phase * 0.6) * 2.5;
    ctx.lineWidth = 1.8;
    // Body — filled
    ctx.beginPath();
    ctx.ellipse(0, 8, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Head — filled
    ctx.beginPath();
    ctx.arc(0, -8, 8, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Ears — filled
    ctx.beginPath();
    ctx.ellipse(-5 + wig, -23, 3, 9, -0.18, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse( 5 - wig, -23, 3, 9,  0.18, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Tail — fluffy white dot
    const fc2 = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(11, 10, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,248,235,0.80)';
    ctx.fill(); ctx.fillStyle = fc2;
    ctx.stroke();
    // Legs
    const hop = Math.abs(Math.sin(phase)) * 5;
    ctx.beginPath();
    ctx.moveTo(-5, 20); ctx.lineTo(-9, 26 - hop);
    ctx.moveTo( 5, 20); ctx.lineTo( 9, 26 - hop);
    ctx.stroke();
  }

  drawFish(ctx, phase) {
    const tail = Math.sin(phase) * 9;
    ctx.lineWidth = 1.5;
    // Body — solid filled
    ctx.beginPath();
    ctx.ellipse(-2, 0, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Tail — filled triangle
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(22,  -6 + tail);
    ctx.lineTo(22,   6 - tail);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Dorsal fin — filled
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.quadraticCurveTo(3, -16, 8, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eye — white dot
    ctx.beginPath();
    ctx.arc(-7, -1.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-7, -1.5, 1, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle; // pupil same as body colour
    ctx.fill();
  }

  drawMonkey(ctx, phase) {
    const arm = Math.sin(phase) * 11;
    ctx.lineWidth = 1.8;
    // Body — filled
    ctx.beginPath();
    ctx.ellipse(0, 2, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Head — filled
    ctx.beginPath();
    ctx.arc(0, -14, 9, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Ears — filled
    ctx.beginPath();
    ctx.arc(-9, -14, 3.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc( 9, -14, 3.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Muzzle — cream contrast
    const fc3 = ctx.fillStyle;
    ctx.beginPath();
    ctx.ellipse(0, -10, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,245,220,0.70)';
    ctx.fill(); ctx.fillStyle = fc3;
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(-9, -4); ctx.quadraticCurveTo(-18, 4 + arm, -15, 13);
    ctx.moveTo( 9, -4); ctx.quadraticCurveTo( 18, 4 - arm,  15, 13);
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(0, 13);
    ctx.quadraticCurveTo(16, 18, 20, 8);
    ctx.quadraticCurveTo(24, 0, 20, -4);
    ctx.stroke();
    // Legs
    const leg = Math.sin(phase * 0.8) * 6;
    ctx.beginPath();
    ctx.moveTo(-4, 13); ctx.lineTo(-5 + leg, 23);
    ctx.moveTo( 4, 13); ctx.lineTo( 5 - leg, 23);
    ctx.stroke();
  }

  drawBear(ctx, phase) {
    const step = Math.sin(phase) * 4;
    ctx.lineWidth = 1.8;
    // Body — filled
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Head — filled
    ctx.beginPath();
    ctx.arc(0, -16, 11, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Ears — filled
    ctx.beginPath();
    ctx.arc(-9, -25, 4.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc( 9, -25, 4.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Snout — cream contrast
    const fc4 = ctx.fillStyle;
    ctx.beginPath();
    ctx.ellipse(0, -13, 5.5, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,245,220,0.70)';
    ctx.fill(); ctx.fillStyle = fc4;
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(-13, -4); ctx.quadraticCurveTo(-20, 4, -16, 14);
    ctx.moveTo( 13, -4); ctx.quadraticCurveTo( 20, 4,  16, 14);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(-6, 19); ctx.lineTo(-7 + step, 30);
    ctx.moveTo( 6, 19); ctx.lineTo( 7 - step, 30);
    ctx.stroke();
  }

  drawCloud(ctx, w) {
    // Hand-drawn fluffy cloud via quadratic bezier bumps
    ctx.beginPath();
    ctx.moveTo(-40, 14);
    ctx.quadraticCurveTo(-54, 14, -54, 2  + Math.sin(w) * 1.5);
    ctx.quadraticCurveTo(-54, -14, -36, -16 + Math.cos(w * 0.9) * 1.5);
    ctx.quadraticCurveTo(-38, -36, -18, -30 + Math.sin(w * 1.1) * 2);
    ctx.quadraticCurveTo(-14, -48,   2, -42 + Math.cos(w * 0.7) * 2);
    ctx.quadraticCurveTo(  8, -54,  24, -46 + Math.sin(w * 0.8) * 2);
    ctx.quadraticCurveTo( 36, -46,  40, -32 + Math.cos(w) * 1.5);
    ctx.quadraticCurveTo( 54, -28,  52, -10 + Math.sin(w * 1.2) * 1.5);
    ctx.quadraticCurveTo( 58,   2,  48, 14);
    ctx.quadraticCurveTo( 44,  26,  30, 20);
    ctx.quadraticCurveTo( 20,  30,   6, 22);
    ctx.quadraticCurveTo(  0,  30, -14, 24);
    ctx.quadraticCurveTo(-26,  30, -36, 20);
    ctx.quadraticCurveTo(-48,  18, -40, 14);
    ctx.closePath();
  }

  // Irregular organic pond outline — definitely not a circle
  pondPath(ctx, cx, cy, rx, ry) {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.88, cy + ry * 0.08);
    // upper-left lobe (bulges out)
    ctx.bezierCurveTo(
      cx - rx * 1.18, cy - ry * 0.52,
      cx - rx * 0.80, cy - ry * 1.30,
      cx - rx * 0.10, cy - ry * 1.15
    );
    // top — slight notch creating two bumps
    ctx.bezierCurveTo(
      cx + rx * 0.18, cy - ry * 1.05,
      cx + rx * 0.42, cy - ry * 1.28,
      cx + rx * 0.72, cy - ry * 1.00
    );
    // upper-right — extends far right (the "wide" lobe)
    ctx.bezierCurveTo(
      cx + rx * 1.10, cy - ry * 0.72,
      cx + rx * 1.48, cy - ry * 0.18,
      cx + rx * 1.38, cy + ry * 0.38
    );
    // lower-right — squarish corner
    ctx.bezierCurveTo(
      cx + rx * 1.28, cy + ry * 0.85,
      cx + rx * 0.70, cy + ry * 1.18,
      cx + rx * 0.12, cy + ry * 1.10
    );
    // lower-left — gentle inward dip
    ctx.bezierCurveTo(
      cx - rx * 0.30, cy + ry * 1.02,
      cx - rx * 0.58, cy + ry * 1.20,
      cx - rx * 0.88, cy + ry * 0.82
    );
    // back to start
    ctx.bezierCurveTo(
      cx - rx * 1.12, cy + ry * 0.55,
      cx - rx * 1.10, cy + ry * 0.28,
      cx - rx * 0.88, cy + ry * 0.08
    );
    ctx.closePath();
  }

  // Returns the y of the rolling hill at a given x (used for both fill & grass placement)
  hillY(x) {
    const tx = x / this.W;
    return this.H * 0.70
      + Math.sin(tx * Math.PI * 2.5 + 0.8) * 16
      + Math.cos(tx * Math.PI * 1.5 + 0.3) * 10;
  }

  // ── Draw dispatcher ────────────────────────────────────────────────────────

  draw(ctx, animal) {
    switch (animal.type) {
      case 'bird':    this.drawBird(ctx, animal.phase);    break;
      case 'penguin': this.drawPenguin(ctx, animal.phase); break;
      case 'cat':     this.drawCat(ctx, animal.phase);     break;
      case 'rabbit':  this.drawRabbit(ctx, animal.phase);  break;
      case 'fish':    this.drawFish(ctx, animal.phase);    break;
      case 'monkey':  this.drawMonkey(ctx, animal.phase);  break;
      case 'bear':    this.drawBear(ctx, animal.phase);    break;
    }
  }

  // ── Animation loop — capped at ~24fps ─────────────────────────────────────

  frame(ts = 0) {
    requestAnimationFrame(t => this.frame(t));

    // Skip frames to stay near 24fps (41ms per frame)
    if (ts - this._lastTs < 41) return;
    this._lastTs = ts;

    const ctx = this.ctx;
    ctx.fillStyle = '#f7f2ea';
    ctx.fillRect(0, 0, this.W, this.H);

    // ── Sun ──
    {
      this._sunAngle += 0.004;
      const sx = this.W * 0.84, sy = this.H * 0.11, sr = 36;
      // Outer glow
      const grd = ctx.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 3.2);
      grd.addColorStop(0,   'rgba(255, 215, 60, 0.30)');
      grd.addColorStop(0.5, 'rgba(255, 200, 50, 0.10)');
      grd.addColorStop(1,   'rgba(255, 200, 50, 0)');
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      // Disc
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 210, 55, 0.82)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(238, 175, 28, 0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Rotating rays
      ctx.strokeStyle = 'rgba(255, 200, 50, 0.50)';
      for (let i = 0; i < 12; i++) {
        const a = this._sunAngle + (i / 12) * Math.PI * 2;
        const r1 = sr + 9, r2 = sr + (i % 2 === 0 ? 24 : 16);
        ctx.lineWidth = i % 2 === 0 ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
        ctx.lineTo(sx + Math.cos(a) * r2, sy + Math.sin(a) * r2);
        ctx.stroke();
      }
    }

    // ── Ground fill (rolling hills) ──
    {
      const W = this.W, H = this.H;
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, this.hillY(0));
      for (let x = 8; x <= W; x += 8) ctx.lineTo(x, this.hillY(x));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = 'rgba(95, 150, 75, 0.20)';
      ctx.fill();
      // Hand-drawn hill edge
      ctx.beginPath();
      ctx.moveTo(0, this.hillY(0));
      for (let x = 8; x <= W; x += 8) ctx.lineTo(x, this.hillY(x));
      ctx.strokeStyle = 'rgba(62, 118, 50, 0.38)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Ponds (three) ──
    this.ponds.forEach(({ cx: px, cy: py, rx, ry }) => {
      // Earthy bank rim
      this.pondPath(ctx, px, py, rx * 1.10, ry * 1.12);
      ctx.fillStyle = 'rgba(68, 122, 50, 0.28)';
      ctx.fill();
      // Water fill
      this.pondPath(ctx, px, py, rx, ry);
      ctx.fillStyle = 'rgba(72, 148, 210, 0.40)';
      ctx.fill();
      // Ripples
      ctx.beginPath();
      ctx.ellipse(px + rx * 0.22, py - ry * 0.20, rx * 0.30, ry * 0.28, 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(55, 125, 190, 0.18)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px - rx * 0.30, py + ry * 0.15, rx * 0.18, ry * 0.16, -0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(55, 125, 190, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Hand-drawn edge
      this.pondPath(ctx, px, py, rx, ry);
      ctx.strokeStyle = 'rgba(40, 100, 162, 0.52)';
      ctx.lineWidth = 2.6;
      ctx.stroke();
    });

    // ── Clouds (drawn beneath animals) ──
    this.clouds.forEach(c => {
      c.x      += c.vx;
      c.wobble += c.wobbleSpd;
      if (c.vx > 0 && c.x > this.W + 220) c.x = -220;
      if (c.vx < 0 && c.x < -220)         c.x = this.W + 220;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.fillStyle   = `rgba(100, 155, 215, ${c.alpha})`;
      ctx.strokeStyle = `rgba(75, 120, 185, ${c.alpha * 0.55})`;
      ctx.lineWidth   = 1.8 / c.scale;
      this.drawCloud(ctx, c.wobble);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // foot-to-centre offsets so each animal stands on the hill line
    const footOffset = { penguin:22, cat:20, rabbit:26, monkey:23, bear:30 };

    this.animals.forEach(a => {
      a.x     += a.vx;
      a.phase += a.phaseSpeed;

      if (a.type === 'fish') {
        // bounce horizontally inside the pond
        const pond = this.ponds[a.pondIdx || 0];
        if (a.x > pond.cx + pond.rx * 1.25) a.vx = -Math.abs(a.vx);
        if (a.x < pond.cx - pond.rx * 0.95) a.vx =  Math.abs(a.vx);
        a.y = pond.cy + Math.sin(a.phase * 0.4) * (pond.ry * 0.35);
      } else if (a.type === 'bird') {
        a.y = a.baseY + Math.sin(a.phase * a.driftFreq / a.phaseSpeed + a.driftOffset) * a.driftAmp;
        if (a.vx > 0 && a.x > this.W + 140) this.reset(a);
        if (a.vx < 0 && a.x < -140)         this.reset(a);
      } else {
        // ground animals snap to hill; lane pushes them deeper into the grass (no floating)
        a.y = this.hillY(a.x) - (footOffset[a.type] || 20) + (a.lane || 0) * 14;
        if (a.vx > 0 && a.x > this.W + 140) this.reset(a);
        if (a.vx < 0 && a.x < -140)         this.reset(a);
      }

      ctx.save();
      ctx.translate(a.x, a.y);
      if (a.vx < 0) ctx.scale(-1, 1);
      ctx.scale(a.scale, a.scale);
      ctx.strokeStyle = `rgba(${a.color}, ${a.alpha})`;
      ctx.fillStyle   = `rgba(${a.color}, ${a.alpha})`;
      this.draw(ctx, a);
      ctx.restore();
    });

    // ── Grass blades (drawn on top so foreground grass overlaps animals) ──
    this._grassPhase += 0.012;
    const gp = this._grassPhase;
    // ── Rolling wind swirls (spiral coils drifting across) ──
    this.winds.forEach(w => {
      w.x        += w.speed;
      w.rotation += w.rotSpeed;
      if (w.x > this.W + w.size * 4) w.x = -w.size * 4;

      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.strokeStyle = `rgba(175, 108, 38, ${w.alpha})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      // Draw Archimedean spiral: r = size * (angle / maxAngle)
      const maxAngle = w.turns * Math.PI * 2;
      const steps = 80;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t     = i / steps;
        const angle = t * maxAngle + w.rotation;
        const r     = w.size * t;
        const px    = Math.cos(angle) * r;
        const py    = Math.sin(angle) * r * 0.55; // flatten into ellipse
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Small tail line extending from centre outward
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(w.rotation) * w.size * 0.3, Math.sin(w.rotation) * w.size * 0.18);
      ctx.stroke();

      ctx.restore();
    });

    ctx.lineWidth = 1.3;
    for (let x = 0; x < this.W; x += 14) {
      if (this.ponds.some(p => x > p.cx - p.rx * 1.22 && x < p.cx + p.rx * 1.55)) continue;
      const baseY = this.hillY(x);
      const sway  = Math.sin(gp + x * 0.035) * 7 + Math.sin(gp * 1.4 + x * 0.018) * 3;
      const h     = 12 + Math.sin(x * 0.19) * 6;
      const g     = 108 + Math.floor(Math.sin(x * 0.25) * 22);
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + sway * 0.5, baseY - h * 0.5, x + sway, baseY - h);
      ctx.strokeStyle = `rgba(50, ${g}, 45, 0.68)`;
      ctx.stroke();
    }
  }
}

// ── Scroll Progress ───────────────────────────────────────────────────────────

function initScrollProgress() {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    bar.style.width = `${Math.min(window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100, 100)}%`;
  }, { passive: true });
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function initNavbar() {
  const nav   = document.getElementById('navbar');
  const btn   = document.getElementById('hamburger');
  const links = document.getElementById('nav-links');
  window.addEventListener('scroll', () => {
    nav && nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
  if (btn && links) {
    btn.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
}

// ── Scroll Reveal ─────────────────────────────────────────────────────────────

function initScrollReveal() {
  const obs = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );
  document.querySelectorAll('.reveal-item').forEach(i => obs.observe(i));
}

function wrapReveal(element, delay = 0) {
  element.classList.add('reveal-item');
  if (delay) element.style.transitionDelay = `${delay}ms`;
  return element;
}

// ── Count Up ──────────────────────────────────────────────────────────────────

function countUp(el, target, duration = 1000) {
  const isFloat = String(target).includes('.');
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const val = (1 - Math.pow(1 - t, 3)) * target;
    el.textContent = isFloat ? val.toFixed(2) : Math.floor(val);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCountUp() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        countUp(e.target, parseFloat(e.target.dataset.count));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num[data-count]').forEach(n => obs.observe(n));
}

// ── Skills reveal ─────────────────────────────────────────────────────────────

function initSkillReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.skill-items').forEach(el => obs.observe(el));
}

// ── Content Renderers ─────────────────────────────────────────────────────────

function renderHero(hero) {
  const tag    = document.getElementById('hero-tag');
  const name   = document.getElementById('hero-name');
  const bio    = document.getElementById('hero-bio');
  const email  = document.getElementById('hero-email-btn');
  const github = document.getElementById('hero-github-btn');
  const linked = document.getElementById('hero-linkedin-btn');

  if (tag)    tag.textContent = hero.tag;
  if (name)   name.textContent = hero.name;
  if (bio)    bio.textContent = hero.short_bio;
  if (email)  email.href  = `mailto:${hero.email}`;
  if (github) github.href = hero.github;
  if (linked) linked.href = hero.linkedin;
}

function renderAbout(bioText, education) {
  const col = document.getElementById('about-text');
  if (col) {
    bioText.trim().split('\n\n').forEach((para, i) => {
      if (!para.trim()) return;
      // Detect a block of "Key: value" lines
      const lines = para.trim().split('\n');
      const isFactBlock = lines.length > 1 && lines.every(l => /^[^:]+:\s*.+/.test(l.trim()));
      if (isFactBlock) {
        const block = wrapReveal(el('div', 'about-facts'), i * 90);
        lines.forEach(l => {
          const colon = l.indexOf(':');
          const key = l.slice(0, colon).trim();
          const val = l.slice(colon + 1).trim();
          block.innerHTML += `
            <div class="about-fact">
              <span class="fact-key">${key}</span>
              <span class="fact-val">${val}</span>
            </div>`;
        });
        col.appendChild(block);
      } else {
        col.appendChild(wrapReveal(el('p', null, para.replace(/\n/g, ' ')), i * 90));
      }
    });
  }

  // Stats
  const stats = [
    { num: 5,    suffix: '',  label: 'Publications' },
    { num: 1,    suffix: '',  label: 'Patent filed' },
    { num: 9.08, suffix: '',  label: 'GPA' },
    { num: 5,    suffix: '+', label: 'Years in research' },
  ];
  const grid = document.getElementById('stat-grid');
  if (grid) {
    stats.forEach((s, i) => {
      const item = wrapReveal(el('div', 'stat-item'), i * 70);
      const numEl = el('span', 'stat-num', '0');
      numEl.dataset.count = s.num;
      const labelEl = el('span', 'stat-label', s.label);
      item.appendChild(labelEl);
      item.appendChild(numEl);
      grid.appendChild(item);
    });
  }

  // Education
  const eduCard = document.getElementById('edu-card');
  if (eduCard && education?.length) {
    const edu = education[0];
    eduCard.innerHTML = `
      <div class="edu-inst">${edu.institution}</div>
      <div class="edu-deg">${edu.degree}</div>
      <div class="edu-meta">
        <span class="edu-gpa">${edu.gpa} GPA</span>
        <span>${edu.dates}</span>
        <span>${edu.location}</span>
      </div>
      <div class="edu-tags">${edu.activities.map(a => `<span class="edu-tag">${a}</span>`).join('')}</div>
    `;
  }
}

function renderResearch(interests) {
  const grid = document.getElementById('research-grid');
  if (!grid) return;
  interests.forEach((r, i) => {
    const item = wrapReveal(el('div', 'r-item'), i * 60);
    item.innerHTML = `
      <div class="r-icon-title">
        <span class="r-icon">${r.icon}</span>
        <span class="r-title">${r.title}</span>
      </div>
      <p class="r-desc">${r.desc}</p>
    `;
    grid.appendChild(item);
  });
}

function renderPublications(pubs) {
  const list = document.getElementById('pubs-list');
  if (!list) return;
  pubs.forEach((p, i) => {
    const item = wrapReveal(el('li', 'pub-item'), i * 55);
    const badgeCls = {
      journal: 'is-journal', conference: 'is-conference',
      workshop: 'is-workshop', preprint: 'is-preprint', patent: 'is-patent',
    }[p.type] || '';
    // Bold "Karthik Viswanathan" in authors
    const authorsHtml = p.authors.replace(/Karthik Viswanathan/g, '<strong>Karthik Viswanathan</strong>');
    item.innerHTML = `
      <span class="pub-n">${String(i + 1).padStart(2, '0')}</span>
      <div class="pub-body">
        <div class="pub-title${p.type === 'patent' ? ' is-patent' : ''}">${p.title}</div>
        <div class="pub-authors">${authorsHtml}</div>
        <div class="pub-footer">
          <span class="pub-venue">${p.venue}, ${p.year}</span>
          <span class="pub-badge ${badgeCls}">${p.type}</span>
          ${p.note ? `<span class="pub-note">${p.note}</span>` : ''}
          ${p.link && p.link !== '#' ? `<a class="pub-link" href="${p.link}" target="_blank">paper →</a>` : ''}
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderExperience(experience) {
  const list = document.getElementById('timeline');
  if (!list) return;
  experience.forEach((exp, i) => {
    const item = wrapReveal(el('div', 'exp-item'), i * 60);
    const techHtml = (exp.tech || []).map((t, ti) =>
      `<span>${t}</span>`
    ).join('');
    item.innerHTML = `
      <div class="exp-left">
        <div class="exp-company">${exp.company}</div>
        ${exp.company_sub ? `<span class="exp-company-sub">${exp.company_sub}</span>` : ''}
        <span class="exp-role">${exp.role}</span>
        <div class="exp-meta">
          <span>${exp.dates}</span>
          <span>${exp.location}</span>
        </div>
      </div>
      <div class="exp-right">
        <ul class="exp-bullets">
          ${exp.bullets.slice(0, 3).map(b => `<li>${b}</li>`).join('')}
        </ul>
        ${techHtml ? `<div class="exp-tech">${techHtml}</div>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}

function renderSkills(skills) {
  const wrap = document.getElementById('skills-wrap');
  if (!wrap) return;
  Object.entries(skills).forEach(([cat, tags], i) => {
    const group = wrapReveal(el('div', 'skill-group'), i * 70);
    group.innerHTML = `<div class="skill-cat">${cat}</div>`;
    const items = el('div', 'skill-items', tags.join(' · '));
    group.appendChild(items);
    wrap.appendChild(group);
  });
}

function renderContact(contact) {
  const inner = document.getElementById('contact-inner');
  if (!inner) return;
  inner.innerHTML = `
    <h2 class="contact-heading reveal-item">Let's talk.</h2>
    <p class="contact-blurb reveal-item">${contact.blurb}</p>
    <div class="contact-links">
      <a class="contact-row reveal-item" href="mailto:${contact.email}">
        <span class="c-label">Email</span>
        <span class="c-value">${contact.email}</span>
      </a>
      <a class="contact-row reveal-item" href="${contact.github}" target="_blank">
        <span class="c-label">GitHub</span>
        <span class="c-value">${contact.github.replace('https://','')}</span>
      </a>
      <a class="contact-row reveal-item" href="${contact.linkedin}" target="_blank">
        <span class="c-label">LinkedIn</span>
        <span class="c-value">${contact.linkedin.replace('https://','')}</span>
      </a>
    </div>
  `;
  inner.querySelectorAll('.reveal-item').forEach((el, i) =>
    wrapReveal(el, i * 70)
  );
}

function renderFooter(name) {
  const line = document.getElementById('footer-line');
  if (line) line.innerHTML = `<span>${name}</span> · ${new Date().getFullYear()}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  new AnimalCanvas();
  initScrollProgress();
  initNavbar();

  try {
    const [heroTxt, bioTxt, resTxt, pubs, exp, edu, skills, contact] = await Promise.all([
      fetchText('content/hero.txt'),
      fetchText('content/bio.txt'),
      fetchText('content/research_interests.txt'),
      fetchJSON('content/publications.json'),
      fetchJSON('content/experience.json'),
      fetchJSON('content/education.json'),
      fetchJSON('content/skills.json'),
      fetchJSON('content/contact.json'),
    ]);

    renderHero(parseKV(heroTxt));
    renderAbout(bioTxt, edu);
    renderResearch(parseResearch(resTxt));
    renderPublications(pubs);
    renderExperience(exp);
    renderSkills(skills);
    renderContact(contact);
    renderFooter(parseKV(heroTxt).name || 'Karthik Viswanathan');

    initScrollReveal();
    initCountUp();
    initSkillReveal();

    // Re-scroll to hash after dynamic content has shifted the layout
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }

  } catch (err) {
    console.error('Content load error:', err);
    const tag = document.getElementById('hero-tag');
    if (tag) {
      tag.textContent = 'Run: bash start.sh to view';
      tag.style.color = '#a00';
    }
    initScrollReveal();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main();
  const hs = document.getElementById('hello-screen');
  if (hs) hs.addEventListener('animationend', () => hs.remove());
});

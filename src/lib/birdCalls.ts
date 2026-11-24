import type { BirdCallPattern } from '../data/natureCatalog';

let activeContext: AudioContext | null = null;
let stopTimer: number | null = null;

export function stopBirdCall(): void {
  if (stopTimer !== null) {
    window.clearTimeout(stopTimer);
    stopTimer = null;
  }
  if (activeContext) {
    try {
      void activeContext.close();
    } catch {
      // Ignore audio context teardown error
    }
    activeContext = null;
  }
}

function scheduleTone(
  ctx: AudioContext,
  startOffset: number,
  duration: number,
  startFreq: number,
  endFreq: number,
  peakGain = 0.14,
  type: OscillatorType = 'sine',
  vibratoHz = 0,
  vibratoDepth = 0
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  if (endFreq !== startFreq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(80, endFreq), now + duration);
  }

  if (vibratoHz > 0 && vibratoDepth > 0) {
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(vibratoHz, now);
    lfoGain.gain.setValueAtTime(vibratoDepth, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + Math.min(0.03, duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function scheduleWoodClick(ctx: AudioContext, startOffset: number, freq = 640) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.025);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.038);
}

function scheduleNoiseBurst(ctx: AudioContext, startOffset: number, duration: number, centerFreq: number, peakGain = 0.14) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = centerFreq;
  filter.Q.value = 2.6;

  const gain = ctx.createGain();
  const now = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(now);
  source.stop(now + duration + 0.02);
}

export function playBirdCall(pattern: BirdCallPattern, onEnded?: () => void): void {
  stopBirdCall();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    onEnded?.();
    return;
  }

  const ctx = new AudioCtx();
  activeContext = ctx;
  let totalSec = 2.2;

  switch (pattern) {
    case 'kohlmeise': {
      // Clear two-tone "zi-däh, zi-däh, zi-däh"
      [0.05, 0.52, 0.99, 1.46].forEach((t) => {
        scheduleTone(ctx, t, 0.16, 4100, 3950, 0.14);
        scheduleTone(ctx, t + 0.19, 0.21, 2950, 2850, 0.14);
      });
      totalSec = 2.0;
      break;
    }
    case 'blaumeise': {
      // High "zi-zi-ziiii-dürrr"
      scheduleTone(ctx, 0.05, 0.11, 6100, 6300, 0.11);
      scheduleTone(ctx, 0.22, 0.11, 6200, 6400, 0.11);
      scheduleTone(ctx, 0.42, 0.65, 5100, 4400, 0.12, 'sine', 24, 380);
      scheduleTone(ctx, 1.35, 0.11, 6100, 6300, 0.11);
      scheduleTone(ctx, 1.52, 0.55, 5000, 4300, 0.12, 'sine', 24, 360);
      totalSec = 2.2;
      break;
    }
    case 'rotkehlchen': {
      // Cascading pearl-like melody
      const notes: Array<[number, number, number, number]> = [
        [0.05, 0.14, 3400, 4800],
        [0.21, 0.16, 5200, 3900],
        [0.39, 0.12, 4300, 5600],
        [0.54, 0.22, 4900, 3400],
        [0.82, 0.18, 3600, 5100],
        [1.04, 0.28, 5400, 3200],
        [1.45, 0.12, 4600, 5800],
        [1.62, 0.34, 4100, 3100],
      ];
      notes.forEach(([t, d, f1, f2]) => scheduleTone(ctx, t, d, f1, f2, 0.12, 'sine', 16, 120));
      totalSec = 2.1;
      break;
    }
    case 'amsel': {
      // Rich flute-like phrases
      scheduleTone(ctx, 0.06, 0.28, 1850, 2150, 0.16, 'sine', 5, 35);
      scheduleTone(ctx, 0.38, 0.26, 2350, 1980, 0.16, 'sine', 5, 30);
      scheduleTone(ctx, 0.68, 0.36, 2050, 2550, 0.15, 'sine', 6, 40);
      scheduleTone(ctx, 1.15, 0.14, 2900, 2400, 0.11);
      scheduleTone(ctx, 1.32, 0.28, 2200, 1750, 0.14, 'sine', 6, 35);
      totalSec = 1.9;
      break;
    }
    case 'buntspecht': {
      // Sharp "kix!" + rapid wood drumming roll
      scheduleTone(ctx, 0.06, 0.07, 3600, 2100, 0.18, 'triangle');
      for (let i = 0; i < 14; i++) {
        scheduleWoodClick(ctx, 0.45 + i * 0.048, 620 + (i % 3) * 45);
      }
      scheduleTone(ctx, 1.45, 0.07, 3650, 2150, 0.18, 'triangle');
      totalSec = 1.8;
      break;
    }
    case 'gruenspecht': {
      // Descending laughing "klü-klü-klü-klü-klü"
      for (let i = 0; i < 9; i++) {
        const f = 2250 - i * 115;
        scheduleTone(ctx, 0.06 + i * 0.16, 0.11, f, f * 0.84, 0.15, 'triangle');
      }
      totalSec = 1.75;
      break;
    }
    case 'eichelhaeher': {
      // Harsh raspy "rätsch!"
      scheduleNoiseBurst(ctx, 0.08, 0.32, 1850, 0.22);
      scheduleTone(ctx, 0.08, 0.3, 1450, 1180, 0.08, 'sawtooth');
      scheduleNoiseBurst(ctx, 0.72, 0.34, 1780, 0.22);
      scheduleTone(ctx, 0.72, 0.32, 1400, 1120, 0.08, 'sawtooth');
      totalSec = 1.4;
      break;
    }
    case 'kleiber': {
      // Clear "twitt-twitt-twitt"
      [0.08, 0.36, 0.64, 0.92, 1.2].forEach((t) => {
        scheduleTone(ctx, t, 0.15, 2900, 3550, 0.15);
      });
      totalSec = 1.6;
      break;
    }
    case 'buchfink': {
      // Descending finch trill with upbeat end flourish
      for (let i = 0; i < 7; i++) {
        const f = 4100 - i * 210;
        scheduleTone(ctx, 0.06 + i * 0.11, 0.08, f, f - 150, 0.13);
      }
      scheduleTone(ctx, 0.92, 0.14, 2700, 3400, 0.14);
      scheduleTone(ctx, 1.09, 0.19, 3100, 4200, 0.16);
      totalSec = 1.5;
      break;
    }
    case 'gimpel': {
      // Soft melancholy flute "djüüü"
      scheduleTone(ctx, 0.1, 0.48, 2250, 2050, 0.14, 'sine', 4, 25);
      scheduleTone(ctx, 0.95, 0.5, 2200, 1980, 0.14, 'sine', 4, 25);
      totalSec = 1.75;
      break;
    }
    case 'stieglitz': {
      // Sparkling "stieglitt-stieglitt"
      [0.06, 0.56, 1.08].forEach((t) => {
        scheduleTone(ctx, t, 0.09, 4400, 5400, 0.12);
        scheduleTone(ctx, t + 0.11, 0.1, 5100, 4200, 0.12);
        scheduleTone(ctx, t + 0.23, 0.14, 4600, 5900, 0.12);
      });
      totalSec = 1.7;
      break;
    }
    case 'zaunkoenig': {
      // Loud rapid energetic trill
      for (let i = 0; i < 16; i++) {
        const base = i % 2 === 0 ? 4800 : 5700;
        scheduleTone(ctx, 0.06 + i * 0.085, 0.068, base, base + 250, 0.14, 'sine', 28, 300);
      }
      totalSec = 1.65;
      break;
    }
    case 'rauchschwalbe': {
      // Fast airy twitter
      [0.06, 0.22, 0.36, 0.54, 0.7, 0.88, 1.06].forEach((t, idx) => {
        scheduleTone(ctx, t, 0.11, 3600 + (idx % 3) * 550, 4500, 0.11);
      });
      scheduleTone(ctx, 1.24, 0.24, 3100, 2400, 0.11, 'triangle', 32, 220);
      totalSec = 1.65;
      break;
    }
    case 'star': {
      // Whistles + clicks
      scheduleTone(ctx, 0.08, 0.32, 3400, 4500, 0.13);
      scheduleWoodClick(ctx, 0.52, 850);
      scheduleWoodClick(ctx, 0.64, 920);
      scheduleTone(ctx, 0.82, 0.35, 2900, 2100, 0.13, 'sine', 10, 90);
      scheduleTone(ctx, 1.28, 0.25, 4200, 5200, 0.12);
      totalSec = 1.75;
      break;
    }
    case 'maeusebussard': {
      // Long descending mewing "hiäääh"
      scheduleTone(ctx, 0.1, 0.78, 2550, 1650, 0.15, 'triangle', 7, 45);
      scheduleTone(ctx, 1.15, 0.72, 2480, 1600, 0.14, 'triangle', 7, 40);
      totalSec = 2.05;
      break;
    }
    case 'waldkauz': {
      // Classic eerie "huuu ... hu-hu-huuuu"
      scheduleTone(ctx, 0.1, 0.55, 510, 470, 0.18, 'sine', 4, 14);
      scheduleTone(ctx, 0.95, 0.14, 490, 505, 0.16);
      scheduleTone(ctx, 1.15, 0.14, 510, 495, 0.16);
      scheduleTone(ctx, 1.36, 0.7, 525, 455, 0.18, 'sine', 5.5, 22);
      totalSec = 2.25;
      break;
    }
  }

  stopTimer = window.setTimeout(() => {
    stopBirdCall();
    onEnded?.();
  }, Math.round(totalSec * 1000));
}

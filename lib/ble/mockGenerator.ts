import type { SensorSample } from '@/lib/ble/types';

/**
 * Generates a plausible ~1Hz sensor stream so the app is fully testable
 * before real hardware exists. Not a physiological model — just smooth
 * random walks anchored to a baseline that responds to resistance level,
 * which is all the UI needs to look and feel real.
 */
export class MockSensorGenerator {
  private elapsedSec = 0;
  private co2 = 600;
  private voc = 90;
  private gasResistance = 120_000;
  private heartRate = 70;
  private respRate = 14;
  private tempC = 34;
  private humidityPct = 55;

  reset(): void {
    this.elapsedSec = 0;
    this.co2 = 600;
    this.voc = 90;
    this.gasResistance = 120_000;
    this.heartRate = 70;
    this.respRate = 14;
    this.tempC = 34;
    this.humidityPct = 55;
  }

  /** Produces the next sample; call roughly once per second. */
  next(resistanceLevel: number): SensorSample {
    this.elapsedSec += 1;
    const r = clamp(resistanceLevel, 1, 10);

    // Higher resistance -> faster CO2 buildup inside the mask, slower
    // (more controlled) breathing, higher effort heart rate.
    this.co2 = walk(this.co2, 400 + r * 60, 8);
    this.voc = walk(this.voc, 80 + r * 4, 3);
    this.gasResistance = walk(this.gasResistance, 140_000 - r * 4_000, 3_000);
    this.heartRate = walk(this.heartRate, 95 + r * 4, 1.5);
    this.respRate = walk(this.respRate, 16 - r * 0.5, 0.4);
    this.tempC = walk(this.tempC, 35, 0.1);
    this.humidityPct = walk(this.humidityPct, 70, 1);

    const hrv = clamp(80 - this.heartRate * 0.4 + noise(4), 10, 120);

    return {
      ts: new Date().toISOString(),
      co2Ppm: round(this.co2),
      gasResistanceOhm: round(this.gasResistance),
      vocIndex: round(this.voc),
      heartRate: round(this.heartRate),
      hrvMs: round(hrv),
      respRate: round(this.respRate, 1),
      tempC: round(this.tempC, 1),
      humidityPct: round(this.humidityPct, 1),
    };
  }
}

function walk(current: number, target: number, noiseAmplitude: number): number {
  const pull = (target - current) * 0.06;
  return current + pull + noise(noiseAmplitude);
}

function noise(amplitude: number): number {
  return (Math.random() - 0.5) * 2 * amplitude;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

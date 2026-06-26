// Non-clinical, relative 0-100 scoring heuristics.
//
// IMPORTANT: AeroScan is a training/wellness product, not a medical device.
// These functions must never be renamed/reframed to imply diagnostic output
// (see hardware brief Section 2). Tune the constants below as real session
// data comes in — they are reasonable placeholders, not derived from
// clinical reference ranges.
//
// This file is intentionally duplicated in lib/scoring/index.ts (RN app, for
// the live in-session trend lines) since Deno edge functions and the Expo
// app don't share a build pipeline. Keep the two in sync by hand.

export interface ReadingForScoring {
  heartRate: number | null;
  respRate: number | null;
  co2Ppm: number | null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function breathingEfficiencyScore({ respRate, co2Ppm }: ReadingForScoring): number | null {
  if (respRate == null && co2Ppm == null) return null;

  const idealRespMin = 8;
  const idealRespMax = 16;
  let respScore = 100;
  if (respRate != null) {
    if (respRate < idealRespMin) respScore = 100 - (idealRespMin - respRate) * 6;
    else if (respRate > idealRespMax) respScore = 100 - (respRate - idealRespMax) * 6;
  }

  // 400-1000ppm treated as the "efficient" band for masked resistance
  // breathing; this is a usability scale, not a CO2 safety threshold.
  let co2Score = 100;
  if (co2Ppm != null) {
    co2Score = co2Ppm <= 1000 ? 100 : 100 - (co2Ppm - 1000) / 20;
  }

  const weight = respRate != null && co2Ppm != null ? [0.6, 0.4] : respRate != null ? [1, 0] : [0, 1];
  return Math.round(clamp(respScore * weight[0] + co2Score * weight[1]));
}

export function fatBurnIndex({ heartRate, resistanceLevel }: ReadingForScoring & { resistanceLevel: number | null }): number | null {
  if (heartRate == null) return null;

  // Placeholder fixed max-HR estimate until user DOB/age is collected for a
  // per-user Karvonen-style estimate.
  const estimatedMaxHr = 185;
  const hrPercent = (heartRate / estimatedMaxHr) * 100;

  const zoneLow = 60;
  const zoneHigh = 70;
  let zoneScore = 100;
  if (hrPercent < zoneLow) zoneScore = 100 - (zoneLow - hrPercent) * 4;
  else if (hrPercent > zoneHigh) zoneScore = 100 - (hrPercent - zoneHigh) * 3;

  const resistanceBonus = clamp(resistanceLevel ?? 0, 0, 10) * 1.5;
  return Math.round(clamp(zoneScore * 0.85 + resistanceBonus));
}

export function caloriesPerMinuteEstimate(heartRate: number | null): number {
  if (heartRate == null) return 0;
  // Rough HR%-scaled burn rate, not a weight/age-adjusted MET calculation.
  return clamp((heartRate / 220) * 12, 4, 14);
}

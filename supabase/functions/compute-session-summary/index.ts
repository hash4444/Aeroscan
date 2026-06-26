// Edge Function: compute-session-summary
//
// Invoked by the app right after it finishes the single batch upload of a
// session's buffered sensor_readings. Reads those rows back, computes the
// session_summaries row (relative 0-100 scores, never clinical values), and
// upserts it.
//
// Runs with the *caller's* JWT (not the service role) so every query is
// still governed by RLS — this function can only ever summarize a session
// the requesting user owns.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { breathingEfficiencyScore, caloriesPerMinuteEstimate, fatBurnIndex } from './scoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function average(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (present.length === 0) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id || typeof session_id !== 'string') {
      return new Response(JSON.stringify({ error: 'session_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, started_at, ended_at, resistance_level')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: readings, error: readingsError } = await supabase
      .from('sensor_readings')
      .select('ts, heart_rate, resp_rate, co2_ppm')
      .eq('session_id', session_id)
      .order('ts', { ascending: true });

    if (readingsError) {
      return new Response(JSON.stringify({ error: readingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = readings ?? [];

    const breathingScores = rows.map((r) =>
      breathingEfficiencyScore({ heartRate: r.heart_rate, respRate: r.resp_rate, co2Ppm: r.co2_ppm }),
    );
    const fatBurnScores = rows.map((r) =>
      fatBurnIndex({
        heartRate: r.heart_rate,
        respRate: r.resp_rate,
        co2Ppm: r.co2_ppm,
        resistanceLevel: session.resistance_level,
      }),
    );

    const avgHeartRate = average(rows.map((r) => r.heart_rate));

    const startedAt = new Date(session.started_at).getTime();
    const endedAt = session.ended_at
      ? new Date(session.ended_at).getTime()
      : rows.length > 0
        ? new Date(rows[rows.length - 1].ts).getTime()
        : startedAt;
    const durationSec = Math.max(0, Math.round((endedAt - startedAt) / 1000));

    const caloriesEst = Math.round(caloriesPerMinuteEstimate(avgHeartRate) * (durationSec / 60));

    const summary = {
      session_id,
      avg_fat_burn_index: average(fatBurnScores),
      avg_breathing_efficiency: average(breathingScores),
      duration_sec: durationSec,
      calories_est: caloriesEst,
    };

    const { error: upsertError } = await supabase.from('session_summaries').upsert(summary);

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!session.ended_at) {
      await supabase
        .from('sessions')
        .update({ ended_at: new Date(endedAt).toISOString(), status: 'completed' })
        .eq('id', session_id);
    }

    return new Response(JSON.stringify({ summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

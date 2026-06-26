# AeroScan

Companion mobile app + backend for the AeroScan smart respiratory training
mask — a connected device with embedded breath-gas (VOC/CO2) and PPG/HRV
sensors that streams live data over BLE during a training session.

> **Not a medical device.** AeroScan reports relative, non-clinical scores
> ("Fat-Burn Index", "Breathing Efficiency Score", 0–100) meant to help users
> track their own training trends over time. It does not diagnose, treat, or
> measure any clinical metric, and nothing in this app should be presented or
> interpreted as medical data.

## Stack

- **App:** Expo (managed, SDK 56) + Expo Router, React Native, TypeScript (strict)
- **Styling:** NativeWind v4 / Tailwind
- **State:** Zustand (with `persist` for settings)
- **Charts:** victory-native (Skia) `CartesianChart`/`Line`
- **BLE:** react-native-ble-plx, with a built-in mock generator so the app is
  fully usable before real hardware/firmware is ready
- **Local buffering:** expo-sqlite (durable buffer between BLE samples and
  the Supabase upload at session end)
- **Backend:** Supabase — Postgres (RLS-protected), Auth, Realtime, Storage,
  and a Deno Edge Function that computes session summaries server-side

## Project layout

```
app/                      Expo Router screens
  (tabs)/                 Home, Trends, Settings — bottom tab navigator
  onboarding/              Pairing + mask-size selection
  session/                 Live session + session detail/history
  sign-in.tsx
lib/
  ble/                     Connection manager, mock generator, packet decode, constants
  scoring/                 Shared non-clinical scoring heuristics
  storage/                 Local SQLite session buffer
  store/                   Zustand stores (auth, device, session, settings)
  supabase/                Client, typed queries, generated row types
components/ui/             Shared design-system components
supabase/
  migrations/              SQL schema + RLS policies
  functions/                compute-session-summary Edge Function
  config.toml
```

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npx expo start
```

Apply the database schema to your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy compute-session-summary
```

### Developing without hardware

Toggle **Settings → Use mock BLE device** to drive the entire pairing,
live-session, and history flow from a simulated AeroScan device — no real
mask required. The mock generator produces a plausible, slowly-varying
sensor stream and responds to resistance-level changes the same way real
firmware would be expected to.

## BLE integration status

`lib/ble/constants.ts` and `lib/ble/types.ts` contain **placeholder** GATT
service/characteristic UUIDs and an assumed packet layout, each marked with
`TODO(firmware)`. These are deliberately fake values, not guesses at real
assigned UUIDs — they exist so the app layer (scanning, connecting,
streaming, resistance control, OTA entry point) is fully wired and testable
against the mock generator, and only the constants/decode logic need to
change once real firmware specs are available.

## Data model

- `profiles` — per-user preferences (units)
- `devices` — paired mask per user
- `sessions` — one row per training session
- `sensor_readings` — raw per-sample telemetry for a session
- `session_summaries` — computed aggregate scores for a session

All tables are protected by row-level security scoped to `auth.uid()`.
Raw samples are buffered locally and batch-uploaded when a session ends;
the `compute-session-summary` Edge Function then computes the session's
Fat-Burn Index / Breathing Efficiency Score server-side from the uploaded
readings.

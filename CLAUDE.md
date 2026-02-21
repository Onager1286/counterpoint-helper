# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Counterpoint Helper — a React + TypeScript web application for learning counterpoint composition with real-time analysis and MIDI playback. Teaches the five species of counterpoint following Johann Joseph Fux's strict rules from "Gradus ad Parnassum".

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server → http://localhost:5173
npm run build        # tsc + vite build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint (max-warnings 0) — NOTE: eslint may not be installed locally; use npm run build as the correctness gate
```

No test runner is configured. `npm run build` is the primary correctness gate: it runs `tsc` in strict mode before bundling.

## Project Status

Phases 1–7 complete. Phase 8 (Polish & Educational Content) remains.

**Recently completed:** Phase 7 — MIDI playback via Tone.js with PlaybackControls UI. Phase 6 UI redesign with "Classical Music Study Chamber" theme.

## Architecture

### Tech Stack
- React 18 + TypeScript 5 (strict) + Vite 5
- VexFlow 4.2 — music notation rendering (imperative DOM API, wrapped by a static service class)
- Tone.js 14.7 — MIDI playback via `TonePlaybackService` (static class, dual PolySynth)
- Pure client-side; no backend

### Source Layout

```
src/
├── core/                         # Pure TypeScript — zero React dependencies
│   ├── types/                    # Shared type definitions (see below)
│   ├── models/
│   │   └── Interval.ts           # getInterval(), isPerfectConsonance()
│   ├── generators/               # Cantus Firmus generation
│   │   ├── cantusFirmusGenerator.ts   # Backtracking algorithm, clef-aware octaves
│   │   ├── cfConstraints.ts           # CFConstraints(key, totalLength) — candidate filtering
│   │   └── cfValidator.ts             # Final CF validation gate
│   ├── rules/                    # Rule engine — 53 rules across 6 categories
│   │   ├── index.ts              # analyzeComposition() orchestrator
│   │   ├── registry.ts           # ALL_RULES, getRulesForSpecies(), getRuleById()
│   │   ├── helpers/              # Reusable primitives (see Helpers section)
│   │   └── categories/           # One file per musical category (see Rules section)
│   └── utils/
│       ├── musicMath.ts          # pitchToMidi(), midiToPitch(), semitoneDifference()
│       ├── keySignatures.ts      # KEY_SIGNATURES map, getScaleDegrees(), parseKey()
│       ├── noteParser.ts         # parsePitch(), createNote(), formatNote()
│       └── vexflowFormatters.ts  # pitchToVexFlow(), durationToVexFlow()
├── services/
│   ├── tonejs/
│   │   └── TonePlaybackService.ts  # Static class — init(), play(), stop(), dual-synth playback
│   └── vexflow/
│       ├── VexFlowService.ts     # Static class — render() and renderGrandStaff()
│       ├── types.ts              # RenderOptions, GrandStaffRenderOptions, RenderMetadata
│       ├── noteFormatter.ts      # Note[] → StaveNote[], measure/system grouping
│       └── CoordinateMapper.ts   # SVG pixel coords → (measure, MIDI note) for click input
├── context/
│   └── CompositionContext.tsx    # Global state provider + auto-analysis trigger
├── components/
│   ├── CantusFirmusGenerator/
│   │   ├── CantusFirmusGenerator.tsx
│   │   └── CantusFirmusGenerator.module.css
│   ├── InteractiveStaffDisplay/
│   │   ├── InteractiveStaffDisplay.tsx
│   │   └── InteractiveStaffDisplay.module.css
│   ├── SpeciesSelector/
│   │   ├── SpeciesSelector.tsx      # Card-grid species picker (I–V)
│   │   ├── SpeciesSelector.module.css
│   │   └── index.ts
│   ├── AnalysisPanel/
│   │   ├── AnalysisPanel.tsx        # Submit-based analysis UI with completeness checks
│   │   ├── AnalysisPanel.module.css
│   │   └── index.ts
│   ├── PlaybackControls/
│   │   ├── PlaybackControls.tsx     # Play/Stop, tempo display, Tone.js integration
│   │   ├── PlaybackControls.module.css
│   │   └── index.ts
│   ├── ViolationDisplay/
│   │   ├── ViolationDisplay.tsx
│   │   └── ViolationDisplay.module.css
│   └── StaffDisplay/             # Read-only single staff (legacy)
└── constants/
    └── musicConstants.ts         # NOTE_NAMES, CONSONANT_INTERVALS, etc.
```

### Key Design Patterns

**1. Separation of Concerns** — `core/` is pure logic with no React imports. All business logic lives there and is reachable without rendering anything.

**2. Global State via Context** — `CompositionContext` holds `cantusFirmus`, `counterpoint`, `species`, `key`, and `analysisResult`. Analysis is triggered manually via `submitAnalysis()` (not automatic). The `AnalysisPanel` component manages the submit flow with completeness checking and stale-result detection. Components should call `submitAnalysis()` rather than `analyzeComposition()` directly.

**3. Rule Engine** — Each rule is a standalone object (id, name, severity, species[], check). Rules are organised by musical category, not by species. `analyzeComposition()` filters by species and runs all matching checks. See the Rule Implementation section below for the pattern and ID conventions.

**4. VexFlow as a Static Service** — `VexFlowService` is a static class; do not instantiate it. Call `VexFlowService.render(container, ...)` or `VexFlowService.renderGrandStaff(container, ...)` directly. It returns `RenderMetadata` used by `CoordinateMapper` to translate click positions back into musical data.

**5. Beat-Aware Helpers** — Species II–V place multiple notes per measure at different beat positions. The helpers in `beatHelpers.ts` and `scaleHelpers.ts` are the correct primitives for iterating and analysing those notes. Do not use the legacy whole-note helpers for anything beyond Species I.

### UI Design System

The application uses a warm, refined "Classical Music Study Chamber" theme with CSS custom properties defined in `src/index.css`.

**Typography** (Google Fonts loaded in `index.html`):
- Display: Cormorant Garamond (h1, h2, app title)
- Headings: Playfair Display (h3, h4, section titles)
- Body: Source Serif Pro (paragraphs, educational content)
- UI: Alegreya Sans (buttons, labels, form elements)

**Color palette** (key CSS variables):
- `--color-parchment` / `--color-parchment-dark` — warm cream backgrounds
- `--color-burgundy` / `--color-burgundy-light` — primary accent
- `--color-brass` / `--color-brass-light` — secondary accent (decorative)
- `--color-success`, `--color-error`, `--color-warning` — semantic colors

**Styling approach:**
- Global variables and base styles in `src/index.css`
- App layout in `src/App.css`
- Component-specific styles use CSS Modules (`.module.css` files)

---

## Type Definitions

All types live in `src/core/types/` and are shared across the stack.

| File | Key exports |
|---|---|
| `music.types.ts` | `Note`, `NoteDuration` (`'1'\|'2'\|'4'\|'8'\|'16'`), `Interval`, `VoiceMotion`, `MotionType`, `Accidental`, `Clef` |
| `analysis.types.ts` | `Rule`, `Violation`, `AnalysisResult`, `RuleContext`, `Severity` (`'error'\|'warning'`) |
| `species.types.ts` | `Species` enum (First=1…Fifth=5), `SpeciesConfig`, `SPECIES_CONFIGS` |
| `key.types.ts` | `Key` (tonic, mode, signature), `Scale`, `Mode` (`'major'\|'minor'`) |

`Note` is the central object everywhere: `{ pitch, midiNumber, duration, measureIndex, beatPosition, scaleDegree, accidental }`.

---

## Cantus Firmus Generation

`CantusFirmusGenerator` uses a backtracking loop (up to 1 000 attempts). Each attempt:

1. Starts on the tonic at the clef-appropriate octave (bass = 3, treble = 5).
2. Fills interior notes via `CFConstraints.getCandidates()` with weighted-random selection (60 % stepwise, 30 % third, 10 % larger).
3. Appends a cadence note: the final tonic, accepted only if the penultimate note is 1–2 semitones away (never unison).
4. Rejects the attempt if the climax is not at a single interior position.
5. Passes the result through `validateCantusFirmus()` as a final gate.

`CFConstraints` enforces per-candidate rules: no repeats, stay within an octave of the tonic, max leap P5 (7 semitones), no melodic tritone (6 semitones), large-leap recovery, no consecutive same-direction leaps, no three consecutive leaps. For minor keys at the penultimate position it injects the raised 7th (leading tone) as an additional candidate via `getRaisedSeventh()`.

---

## Rule Engine

### Adding a rule

```typescript
// src/core/rules/categories/yourCategory.ts
import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';

export const yourRule: Rule = {
  id: 'all-your-rule',          // prefix conventions below
  name: 'Human-readable name',
  severity: 'error',            // 'error' blocks validity; 'warning' does not
  species: [Species.First, Species.Second],
  description: 'Brief description',
  check: (context: RuleContext): Violation[] => {
    // return [] if valid
  },
};
```

Then import and add to `ALL_RULES` in `src/core/rules/registry.ts`.

### ID prefix conventions

| Prefix | Meaning |
|---|---|
| `all-` | Every species |
| `species1-` | Species I only (legacy; new rules use `s1-`) |
| `s2-` / `s3-` / `s4-` / `s5-` | Single species |
| `s2s3-` / `s2s3s5-` | Shared subset |

### Rule categories (6 files, 53 rules total)

| File | Count | Focus |
|---|---|---|
| `intervalRules.ts` | 10 | Consonance on downbeats, tritone, aug/dim |
| `motionRules.ts` | 10 | Parallel / direct / leapfrog 5ths & 8ves, crossing |
| `melodicRules.ts` | 12 | Leap limits, range, climax/nadir, dissonance approach |
| `dissonanceTreatmentRules.ts` | 8 | Passing tone, neighbor, cambiata, suspension |
| `cadenceRules.ts` | 6 | Leading tone, tonic final, cadence shape |
| `voiceCrossingRules.ts` | 7 | Voice crossing, spacing, consecutive perfects |

### Helper modules (`src/core/rules/helpers/`)

| File | Primary exports |
|---|---|
| `contextHelpers.ts` | `getFirstCounterpointNote()`, `isCounterpointComplete()` |
| `intervalHelpers.ts` | `getVerticalInterval()`, `getDownbeatIntervals()`, `getIntervalAtBeat()` |
| `motionHelpers.ts` | `getVoiceMotion()`, `getAllMotions()`, `hasParallelPerfects()` |
| `beatHelpers.ts` | `getConsecutiveNotePairs()`, `getDownbeatNote()`, `getOffbeatNotes()`, `getIntervalBetweenNotes()` — **use these for Species II–V** |
| `scaleHelpers.ts` | `isDissonant()`, `isTritone()`, `isStepwiseMotion()`, `isTiedPair()`, `isLegalDissonance()` |

---

## Interval & Motion Calculations

`getInterval(pitch1, midi1, pitch2, midi2)` from `core/models/Interval.ts` returns an `Interval` with degree, quality, semitones, and `isConsonant`. It normalises compound intervals. Consonances: P1, m3, M3, P5, m6, M6, P8.

`getAllMotions(cf, cp)` from `motionHelpers.ts` returns every consecutive motion pair. Motion types: parallel, similar, contrary, oblique.

---

## VexFlow Rendering & Click Input

`VexFlowService` is **static** — do not instantiate.

```typescript
import { VexFlowService } from '../services/vexflow/VexFlowService';

// Render grand staff (CF on bass, CP on treble)
const metadata = VexFlowService.renderGrandStaff(
  containerElement,
  cantusFirmus,
  counterpoint,
  key,
  { measuresPerSystem: 4 }   // GrandStaffRenderOptions
);
// metadata: RenderMetadata — stave positions, system geometry
```

`InteractiveStaffDisplay` uses `CoordinateMapper` to convert click `(x, y)` back into `(measureIndex, midiNote)` using the returned metadata. The mapper needs the stave Y offsets, system height/spacing, and clef to infer pitch from pixel position.

**Responsive Staff Reflow:** The staff automatically adjusts `measuresPerSystem` based on container width using `ResizeObserver`. Width thresholds: 180px minimum per measure, max 4 measures per system. The component uses two refs: `wrapperRef` (always present for resize observation) and `staffRef` (for VexFlow rendering and click handling).

**Cursor overlay:** A semi-transparent SVG `<rect>` is appended after VexFlow renders — green (`rgba(76,175,80,0.45)`) on empty slots, blue (`rgba(33,150,243,0.45)`) on occupied slots. Query `svg rect[fill]` to inspect it in preview evals.

---

## Music Math Quick Reference

- `pitchToMidi('C4')` → 60. Formula: `(octave + 1) * 12 + noteValue`.
- `createNote(pitch, duration, measureIndex, beatPosition, scaleDegree)` — `scaleDegree` defaults to 1.
- `NoteDuration` values: `'1'` whole, `'2'` half, `'4'` quarter, `'8'` eighth, `'16'` sixteenth.
- Melodic tritone = exactly 6 semitones. Large leap = ≥ 5 semitones. Leap = ≥ 3 semitones. Step = ≤ 2 semitones.

---

## Tone.js Playback Service

`TonePlaybackService` (static class in `src/services/tonejs/`) wraps Tone.js:

- `init()` — must be called from a user-gesture handler to start AudioContext. Creates two `PolySynth` instances (CF and CP) with different timbres.
- `play(cf, cp, options?)` — schedules CF and CP notes on separate synths. Returns a `PlaybackHandle` with `stop()`.
- `stop()` — stops transport and disposes scheduled events.
- Duration mapping: `NoteDuration` `'1'|'2'|'4'|'8'|'16'` → Tone.js `'1n'|'2n'|'4n'|'8n'|'16n'`.
- Default BPM: 80.

`PlaybackControls` component provides Play/Stop toggle and interactive BPM slider (40–200 BPM).

---

## Preview Testing Gotchas

- `preview_snapshot` throws "t.slice is not a function" in this app — use `preview_screenshot` + `preview_eval` instead.
- Keyboard events must target `window`: `window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }))`.
- When dispatching multiple key events programmatically, add `setTimeout(..., 200)` between each to allow React re-renders.

---

## Phase 8: Polish & Educational Content (in progress)

**Completed:** Interactive BPM slider (PlaybackControls), arrow key cursor navigation for note entry (InteractiveStaffDisplay — Left/Right to move cursor freely, A–G replaces note in place, blue cursor on occupied slots).

**Remaining:** Richer educational tooltips / side panel, onboarding / tutorial flow.

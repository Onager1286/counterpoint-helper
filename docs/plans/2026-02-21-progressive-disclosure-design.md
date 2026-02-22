# Progressive Disclosure — Design Document
*2026-02-21*

## Problem

The app currently renders all UI simultaneously: species selector, cantus firmus generator, grand staff, analysis panel, and rule reference are all visible at once. This is visually overwhelming — users see a full editing workspace before they've even chosen a species or generated a cantus firmus, making the starting point unclear.

## Goal

Reduce clutter for all users by showing only what's relevant to the current step. Completed setup steps collapse to compact summary bars (re-expandable), and the composition workspace (staff + analysis) is hidden until the cantus firmus is generated.

---

## Design

### Two States

**State A — Setup (no cantus firmus yet)**
- Main/left area: a simple welcome/empty-state panel (parchment card, decorative note, short instruction text)
- Right sidebar: both steps fully expanded
  - Step 1: Species card grid (I–V)
  - Step 2: Cantus Firmus Generator form (key, length, Generate button)

**State B — Composition (CF exists)**
- Main/left area: full composition workspace — score frame (staff + playback), analysis panel
- Right sidebar: both steps collapsed to summary bars
  - `✓ First Species  [Edit]`
  - `✓ C major · 8 measures  [Edit]`
  - Rule Reference (collapsible, user-controlled)

Transition: clicking **Generate Cantus Firmus** triggers State A → State B. The sidebar steps animate closed, the welcome panel fades out, and the score frame slides in.

---

### Summary Bars

Each collapsed step renders as a slim pill/bar:
- Left: green checkmark + species or key/measures info (Playfair Display, muted)
- Right: "Edit" link in burgundy
- `border-left: 3px solid var(--color-success)` to signal completion

Clicking **Edit** re-opens only that step inline (accordion). The other step stays collapsed.

---

### Species Change While CF Exists

When the user edits the species step and picks a different species while a CF already exists:
- Species is updated immediately (existing behavior: `setSpecies()` + `clearCounterpoint()`)
- CF stays (not cleared)
- An inline banner appears in the CF Generator step:
  *"Species changed — the current cantus firmus was generated for a different species."*
  with a **[Regenerate now]** button that scrolls/opens the CF generator

Banner disappears when a new CF is generated.

---

### Welcome Panel

Simple parchment-styled empty state. Content:
- Decorative music symbol (Unicode `♩` or similar)
- Heading: *"Begin Your Study"*
- Short text: *"Select a species and generate a cantus firmus to start composing."*

No introduction to Fux or tutorial content — just a clean signpost.

---

## Files to Modify

| File | Change |
|---|---|
| `src/App.tsx` | Add `openStep: 1 \| 2 \| null` state; derive expansion from `cantusFirmus`; pass `isExpanded`/`onExpand`/`onGenerated` props; conditionally render welcome panel vs score frame |
| `src/App.css` | Add `.welcome-panel` styles; `.step-summary-bar` shared styles (or keep in module CSS) |
| `src/components/SpeciesSelector/SpeciesSelector.tsx` | Accept `isExpanded: boolean`, `onExpand: () => void` props; render summary bar when collapsed |
| `src/components/SpeciesSelector/SpeciesSelector.module.css` | Summary bar + collapse animation styles |
| `src/components/CantusFirmusGenerator/CantusFirmusGenerator.tsx` | Accept `isExpanded: boolean`, `onExpand: () => void`, `onGenerated: () => void` props; render summary bar; show species-changed banner |
| `src/components/CantusFirmusGenerator/CantusFirmusGenerator.module.css` | Summary bar + banner styles |

---

## State Logic (App.tsx)

```tsx
const { cantusFirmus, species, key } = useComposition();
const [openStep, setOpenStep] = useState<1 | 2 | null>(null);

// Expansion: both open while no CF; only the manually-opened step opens while CF exists
const step1Expanded = !cantusFirmus || openStep === 1;
const step2Expanded = !cantusFirmus || openStep === 2;

// Collapse both when a new CF is generated
const handleGenerated = () => setOpenStep(null);

// Summary labels
const speciesSummary = ROMAN_NUMERALS[species] + ' · ' + SPECIES_NAMES[species];
const cfSummary = key.tonic + ' ' + key.mode + ' · ' + (cantusFirmus?.length ?? 0) + ' measures';
```

Note: `SpeciesSelector` doesn't need an `onGenerated` prop — it just needs `isExpanded` and `onExpand`.

---

## Species-Changed Banner (CantusFirmusGenerator)

```tsx
// Local state inside CantusFirmusGeneratorComponent
const prevSpeciesRef = useRef(species);
const [speciesChangedWarning, setSpeciesChangedWarning] = useState(false);

useEffect(() => {
  if (cantusFirmus && species !== prevSpeciesRef.current) {
    setSpeciesChangedWarning(true);
  }
  prevSpeciesRef.current = species;
}, [species, cantusFirmus]);

// Clear on new generation
// (already clears via setCantusFirmus in existing generate handler)
useEffect(() => {
  setSpeciesChangedWarning(false);
}, [cantusFirmus]);
```

---

## Animations

All transitions use existing CSS custom properties:
- `--ease-elegant` for easing
- `0.3s` duration
- Accordion: `max-height` transition (0 → auto via JS-set pixel value) or `grid-template-rows: 0fr → 1fr` trick

---

## Verification

1. `npm run build` — tsc passes
2. Start dev server; app opens to welcome panel with sidebar fully expanded
3. Click a species card → species highlights, sidebar stays expanded
4. Click Generate → both steps collapse to summary bars, staff appears
5. Click "Edit" on species step → step 1 re-opens, step 2 stays collapsed
6. Change species → banner appears in CF Generator step ("species changed")
7. Click [Regenerate now] → opens CF generator step
8. Generate new CF → both collapse, banner gone, staff updates
9. Click "Edit" on CF step → step 2 re-opens for key/length changes
10. Responsive: at ≤960px single-column, sidebar flows below staff — verify collapse/expand still works

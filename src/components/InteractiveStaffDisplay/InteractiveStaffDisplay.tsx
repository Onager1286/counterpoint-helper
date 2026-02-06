import { useRef, useEffect, useState } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { VexFlowService } from '../../services/vexflow/VexFlowService';
import type { RenderMetadata } from '../../services/vexflow/types';
import type { NoteDuration } from '../../core/types/music.types';
import type { Key } from '../../core/types/key.types';
import { Species, SPECIES_CONFIGS } from '../../core/types/species.types';
import {
  yCoordinateToPitch,
  xCoordinateToBeatPosition,
  isClickInStaffBounds,
  getSystemIndex,
  VEXFLOW_STAVE_TOP_MARGIN,
} from '../../services/vexflow/CoordinateMapper';
import { createNote, parsePitch } from '../../core/utils/noteParser';
import styles from './InteractiveStaffDisplay.module.css';

// ─── Beat-slot ↔ position mapping ───────────────────────────────────────────
// Beat positions within a measure for each notesPerMeasure value:
//   1 note  → [0]           (whole note)
//   2 notes → [0, 2]        (half notes)
//   4 notes → [0, 1, 2, 3]  (quarter notes)
const BEAT_POSITIONS: Record<number, number[]> = { 1: [0], 2: [0, 2], 4: [0, 1, 2, 3] };

function effectiveNotesPerMeasure(species: Species): number {
  const npm = SPECIES_CONFIGS[species].notesPerMeasure;
  return npm === -1 ? 4 : npm; // Species V defaults to quarter-note grid
}

function durationForSpecies(species: Species): NoteDuration {
  if (species === Species.Fifth) return '4'; // quarter notes for V
  return SPECIES_CONFIGS[species].allowedDurations[0] as NoteDuration;
}

function beatSlotToPosition(slot: number, npm: number): { measureIndex: number; beatPosition: number } {
  return {
    measureIndex: Math.floor(slot / npm),
    beatPosition: BEAT_POSITIONS[npm][slot % npm],
  };
}

// ─── Key-signature-aware pitch ───────────────────────────────────────────────
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function applyKeySignature(letter: string, key: Key): string {
  if (key.signature > 0 && SHARP_ORDER.slice(0, key.signature).includes(letter))  return letter + '#';
  if (key.signature < 0 && FLAT_ORDER.slice(0, -key.signature).includes(letter))  return letter + 'b';
  return letter;
}

// ─── Smart octave selection ─────────────────────────────────────────────────
const NOTE_SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pickOctave(pitchRoot: string, referenceMidi: number): number {
  const letter = pitchRoot[0];
  const accidental = pitchRoot.slice(1);
  const semitone = NOTE_SEMITONES[letter]
    + (accidental === '#' ? 1 : accidental === '##' ? 2 : accidental === 'b' ? -1 : accidental === 'bb' ? -2 : 0);

  const octFloor = Math.floor((referenceMidi - semitone) / 12 - 1);
  const midiFloor = (octFloor + 1) * 12 + semitone;
  const midiCeil  = midiFloor + 12;
  return (referenceMidi - midiFloor) <= (midiCeil - referenceMidi) ? octFloor : octFloor + 1;
}

/**
 * Interactive staff display component with click-to-add-note functionality.
 * Displays a grand staff with treble (counterpoint) and bass (cantus firmus) staves.
 */
// ─── Responsive layout helpers ─────────────────────────────────────────────
const MIN_MEASURE_WIDTH = 180; // Minimum width per measure for readability
const MAX_MEASURES_PER_SYSTEM = 4;

function calculateMeasuresPerSystem(containerWidth: number): number {
  const maxMeasures = Math.floor(containerWidth / MIN_MEASURE_WIDTH);
  return Math.max(1, Math.min(maxMeasures, MAX_MEASURES_PER_SYSTEM));
}

export function InteractiveStaffDisplay() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef<HTMLDivElement>(null);
  const metadataRef = useRef<RenderMetadata | null>(null);

  const {
    cantusFirmus,
    counterpoint,
    key,
    species,
    addCounterpointNote,
    removeCounterpointNote,
  } = useComposition();

  const [selectedNoteIndex, setSelectedNoteIndex] = useState<number | null>(null);
  const [cursorSlot, setCursorSlot] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Track container width changes with ResizeObserver
  useEffect(() => {
    // Observe whichever element is available (staff container when CF exists, wrapper otherwise)
    const elementToObserve = staffRef.current || wrapperRef.current;
    if (!elementToObserve) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect.width which excludes padding
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });

    resizeObserver.observe(elementToObserve);

    // Set initial width (clientWidth includes padding, so subtract it for staff container)
    const computedStyle = getComputedStyle(elementToObserve);
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const initialWidth = elementToObserve.clientWidth - paddingLeft - paddingRight;
    if (initialWidth > 0) {
      setContainerWidth(initialWidth);
    }

    return () => resizeObserver.disconnect();
  }, [cantusFirmus]); // Re-attach when CF changes (staff container becomes available)

  // Reset cursor when CF changes (new composition) or species changes (grid resets)
  useEffect(() => {
    if (cantusFirmus) {
      setCursorSlot(counterpoint.length);
    }
  }, [cantusFirmus, species]);

  // Render grand staff whenever data or container width changes
  useEffect(() => {
    if (!staffRef.current || !cantusFirmus || cantusFirmus.length === 0) {
      return;
    }

    try {
      const measuresPerSystem = calculateMeasuresPerSystem(containerWidth);

      const metadata = VexFlowService.renderGrandStaff(
        staffRef.current,
        cantusFirmus,
        counterpoint,
        key,
        {
          width: containerWidth,
          measuresPerSystem,
          highlightedNotes: selectedNoteIndex !== null ? [selectedNoteIndex] : [],
        }
      );
      metadataRef.current = metadata;

      // ── cursor overlay ──
      const npm = effectiveNotesPerMeasure(species);
      const totalSlots = cantusFirmus.length * npm;
      if (cursorSlot < totalSlots) {
        const { measureIndex: cMeas, beatPosition: cBeat } = beatSlotToPosition(cursorSlot, npm);
        const svg = staffRef.current?.querySelector('svg');
        if (svg) {
          const sysIdx    = Math.floor(cMeas / metadata.measuresPerSystem);
          const measInSys = cMeas % metadata.measuresPerSystem;
          const beatFraction = cBeat / 4;
          const cursorX = measInSys * metadata.staveWidth
                        + metadata.staveWidth * (0.15 + 0.7 * beatFraction);
          const sysY    = metadata.topPadding + sysIdx * (metadata.systemHeight + metadata.systemSpacing);
          const cursorY = sysY + metadata.trebleStaveY + VEXFLOW_STAVE_TOP_MARGIN - 20;

          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x',      String(cursorX));
          rect.setAttribute('y',      String(cursorY));
          rect.setAttribute('width',  '6');
          rect.setAttribute('height', '80');
          rect.setAttribute('fill',   'rgba(76, 175, 80, 0.45)');
          rect.setAttribute('rx',     '3');
          svg.appendChild(rect);
        }
      }
    } catch (error) {
      console.error('Error rendering grand staff:', error);
    }
  }, [cantusFirmus, counterpoint, key, selectedNoteIndex, cursorSlot, species, containerWidth]);

  // Handle staff clicks
  const handleStaffClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!staffRef.current || !metadataRef.current || !cantusFirmus) {
      return;
    }

    const metadata = metadataRef.current;
    const rect = staffRef.current.getBoundingClientRect();

    // Get click coordinates relative to container
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Determine which system was clicked
    const systemIndex = getSystemIndex(
      y,
      metadata.systemHeight,
      metadata.systemSpacing,
      metadata.topPadding
    );

    // Calculate Y position relative to the system
    const systemY = metadata.topPadding + (systemIndex * (metadata.systemHeight + metadata.systemSpacing));
    // Add VexFlow's internal top margin to get actual staff line position
    const trebleStaveY = systemY + metadata.trebleStaveY + VEXFLOW_STAVE_TOP_MARGIN;

    // Check if click is within treble staff bounds (ignore bass staff)
    if (!isClickInStaffBounds(y, trebleStaveY)) {
      return;
    }

    // Map X coordinate to measure index + beat position (snaps to cursor centres)
    const npm = effectiveNotesPerMeasure(species);
    const { measureIndex, beatPosition } = xCoordinateToBeatPosition(
      x,
      metadata.staveWidth,
      metadata.measuresPerSystem,
      systemIndex,
      BEAT_POSITIONS[npm]
    );

    // Map Y coordinate to diatonic pitch (key-aware) with nearest-octave selection
    let referenceMidi = 60;
    if (counterpoint.length > 0) {
      referenceMidi = counterpoint[counterpoint.length - 1].midiNumber;
    } else {
      const cfNote = cantusFirmus[measureIndex];
      if (cfNote) referenceMidi = cfNote.midiNumber;
    }
    const pitch = yCoordinateToPitch(y, trebleStaveY, 'treble', key, referenceMidi);

    if (measureIndex >= cantusFirmus.length) {
      return;
    }

    // Collision check: exact (measure, beat) slot — same predicate as keyboard handler
    const existingNoteIndex = counterpoint.findIndex(
      n => n.measureIndex === measureIndex && n.beatPosition === beatPosition
    );

    if (existingNoteIndex !== -1) {
      // Toggle select / delete
      if (selectedNoteIndex === existingNoteIndex) {
        removeCounterpointNote(existingNoteIndex);
        setSelectedNoteIndex(null);
      } else {
        setSelectedNoteIndex(existingNoteIndex);
      }
    } else {
      // Create note at this beat slot
      const newNote = createNote(
        pitch,
        durationForSpecies(species),
        measureIndex,
        beatPosition,
        1  // scaleDegree placeholder
      );

      addCounterpointNote(newNote);
      setSelectedNoteIndex(null);
    }
  };

  // Keyboard handler: step-entry (A–G), octave shift (↑↓), backspace, legacy delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cantusFirmus || cantusFirmus.length === 0) return;

      const npm   = effectiveNotesPerMeasure(species);
      const total = cantusFirmus.length * npm;
      const upper = e.key.toUpperCase();

      // ── A–G: place note at cursor ──
      if ('ABCDEFG'.includes(upper) && upper.length === 1) {
        e.preventDefault();
        if (cursorSlot >= total) return;

        const { measureIndex, beatPosition } = beatSlotToPosition(cursorSlot, npm);

        // Skip if a note already occupies this slot
        const alreadyThere = counterpoint.some(
          n => n.measureIndex === measureIndex && n.beatPosition === beatPosition
        );
        if (alreadyThere) {
          setCursorSlot(prev => Math.min(prev + 1, total));
          return;
        }

        // Determine pitch with key-signature accidentals
        const pitchRoot = applyKeySignature(upper, key);

        // Smart octave: prefer note closest to previous CP note, then CF, then C4
        let referenceMidi = 60;
        if (counterpoint.length > 0) {
          // Find the note at cursorSlot - 1 by position, fall back to last in array
          const prevSlot = beatSlotToPosition(cursorSlot - 1, npm);
          const prev = counterpoint.find(
            n => n.measureIndex === prevSlot.measureIndex && n.beatPosition === prevSlot.beatPosition
          );
          referenceMidi = prev ? prev.midiNumber : counterpoint[counterpoint.length - 1].midiNumber;
        } else {
          const cfNote = cantusFirmus[measureIndex];
          if (cfNote) referenceMidi = cfNote.midiNumber;
        }

        const octave  = pickOctave(pitchRoot, referenceMidi);
        const pitch   = `${pitchRoot}${octave}`;
        const duration = durationForSpecies(species);

        addCounterpointNote(createNote(pitch, duration, measureIndex, beatPosition, 1));
        setCursorSlot(prev => Math.min(prev + 1, total));
        setSelectedNoteIndex(null);
        return;
      }

      // ── ArrowUp / ArrowDown: shift last-entered note by one octave ──
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (cursorSlot === 0) return;

        const prevSlot = beatSlotToPosition(cursorSlot - 1, npm);
        const idx = counterpoint.findIndex(
          n => n.measureIndex === prevSlot.measureIndex && n.beatPosition === prevSlot.beatPosition
        );
        if (idx === -1) return;

        const note   = counterpoint[idx];
        const parsed = parsePitch(note.pitch);
        const newOctave = e.key === 'ArrowUp' ? parsed.octave + 1 : parsed.octave - 1;

        // Rebuild pitch string preserving accidental symbol
        const accSymbol = note.pitch.match(/[#b]+/)?.[0] ?? '';
        const newPitch  = `${parsed.noteName}${accSymbol}${newOctave}`;

        const newNote = createNote(newPitch, note.duration, note.measureIndex, note.beatPosition, note.scaleDegree);
        removeCounterpointNote(idx);
        addCounterpointNote(newNote);
        // Cursor does not move
        return;
      }

      // ── Backspace: remove note at cursor−1, retreat cursor ──
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (cursorSlot === 0) return;

        const prevSlot = beatSlotToPosition(cursorSlot - 1, npm);
        const idx = counterpoint.findIndex(
          n => n.measureIndex === prevSlot.measureIndex && n.beatPosition === prevSlot.beatPosition
        );
        if (idx !== -1) {
          removeCounterpointNote(idx);
        }
        setCursorSlot(prev => prev - 1);
        setSelectedNoteIndex(null);
        return;
      }

      // ── Delete: legacy click-select removal ──
      if (e.key === 'Delete' && selectedNoteIndex !== null) {
        removeCounterpointNote(selectedNoteIndex);
        setSelectedNoteIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cantusFirmus, counterpoint, key, species, cursorSlot, selectedNoteIndex, addCounterpointNote, removeCounterpointNote]);

  // Show empty state if no CF generated yet
  if (!cantusFirmus || cantusFirmus.length === 0) {
    return (
      <div ref={wrapperRef} className={styles.container}>
        <div className={styles.emptyState}>
          Generate a Cantus Firmus above to start composing
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={styles.container}>
      <div className={styles.instructions}>
        <strong>Instructions:</strong> Press <strong>A–G</strong> to enter notes step by step.
        <strong> ↑ ↓</strong> adjust the last note&apos;s octave. <strong>Backspace</strong> removes it.
        You can also click the treble staff directly to place notes.
        {species === Species.First && (
          <span> Each measure takes one whole note.</span>
        )}
        {species === Species.Second && (
          <span> Each measure takes two half notes — click the left or right half of a measure.</span>
        )}
        {species === Species.Third && (
          <span> Each measure takes four quarter notes — click anywhere in the measure to select the beat.</span>
        )}
        {species === Species.Fourth && (
          <span> Each measure takes two half notes. Syncopation (ties) is evaluated during analysis.</span>
        )}
      </div>

      <div
        ref={staffRef}
        className={styles.staffContainer}
        onClick={handleStaffClick}
      />

      {selectedNoteIndex !== null && (
        <div className={styles.selectionHint}>
          Note selected. Click again to delete, or press Delete/Backspace.
        </div>
      )}
    </div>
  );
}

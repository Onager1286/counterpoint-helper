import type { Key } from '../../core/types/key.types';
import { pitchToMidi } from '../../core/utils/musicMath';

/**
 * Coordinate mapping utilities for converting SVG click coordinates
 * to musical data (pitches, measures).
 *
 * VexFlow uses 10px spacing between staff lines.
 */

/**
 * VexFlow renders staves with internal top margin for clef/key signature.
 * The Stave Y parameter is the top of the bounding box, but staff lines
 * start approximately 40px below.
 */
export const VEXFLOW_STAVE_TOP_MARGIN = 40;

const DIATONIC_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function applyKeySignature(letter: string, key: Key): string {
  if (key.signature > 0 && SHARP_ORDER.slice(0, key.signature).includes(letter)) {
    return letter + '#';
  }
  if (key.signature < 0 && FLAT_ORDER.slice(0, -key.signature).includes(letter)) {
    return letter + 'b';
  }
  return letter;
}

function getDiatonicPitchForStep(
  stepOffset: number,
  baseLetter: string,
  baseOctave: number
): { letter: string; octave: number } {
  const baseIndex = DIATONIC_ORDER.indexOf(baseLetter);
  const baseNumber = baseOctave * 7 + baseIndex;
  const targetNumber = baseNumber + stepOffset;

  const octave = Math.floor(targetNumber / 7);
  const index = ((targetNumber % 7) + 7) % 7;
  const letter = DIATONIC_ORDER[index];

  return { letter, octave };
}

function nearestOctave(pitchRoot: string, baseOctave: number, referenceMidi: number): number {
  const baseMidi = pitchToMidi(`${pitchRoot}${baseOctave}`);
  const octaveOffset = Math.round((referenceMidi - baseMidi) / 12);
  return baseOctave + octaveOffset;
}

/**
 * Maps Y-coordinate to pitch string based on diatonic staff steps.
 *
 * @param y - Y-coordinate relative to container
 * @param staveY - Y-coordinate of the top of the staff
 * @param clef - Musical clef ('treble' or 'bass')
 * @param key - Musical key signature
 * @param referenceMidi - MIDI note used to choose nearest octave
 * @returns Pitch in scientific notation (e.g., 'F#5')
 */
export function yCoordinateToPitch(
  y: number,
  staveY: number,
  clef: 'treble' | 'bass',
  key: Key,
  referenceMidi: number
): string {
  const LINE_SPACING = 10; // VexFlow standard

  // Calculate relative position from top of staff
  const relativeY = y - staveY;

  // Convert to half-line units (each line/space is one diatonic step)
  // Negative values are above the staff, positive below
  const halfLinePosition = Math.round(relativeY / (LINE_SPACING / 2));

  // Treble clef: top line = F5. Bass clef: top line = A3.
  const base = clef === 'treble'
    ? { letter: 'F', octave: 5 }
    : { letter: 'A', octave: 3 };

  // Moving down is a negative diatonic step offset.
  const stepOffset = -halfLinePosition;
  const { letter, octave } = getDiatonicPitchForStep(stepOffset, base.letter, base.octave);
  const pitchRoot = applyKeySignature(letter, key);
  const chosenOctave = nearestOctave(pitchRoot, octave, referenceMidi);

  return `${pitchRoot}${chosenOctave}`;
}

/**
 * Maps X-coordinate to measure index.
 *
 * @param x - X-coordinate relative to container
 * @param staveWidth - Width of a single measure in pixels
 * @param measuresPerSystem - Number of measures per system
 * @param systemIndex - Index of the current system
 * @returns Measure index (0-based)
 */
export function xCoordinateToMeasureIndex(
  x: number,
  staveWidth: number,
  measuresPerSystem: number,
  systemIndex: number
): number {
  // Which measure in the current system (0-based)
  const measureInSystem = Math.floor(x / staveWidth);

  // Calculate absolute measure index
  const measureIndex = (systemIndex * measuresPerSystem) + measureInSystem;

  return measureIndex;
}

/**
 * Maps X-coordinate to measure index + beat position, snapping to the
 * same horizontal centres that the cursor overlay uses.
 *
 * Each beat slot's centre fraction is  0.15 + 0.7 * (beat / 4).
 * The click is snapped to whichever centre is nearest.
 *
 * @param x              - X-coordinate relative to the SVG container
 * @param staveWidth     - Width of a single measure in pixels
 * @param measuresPerSystem - Number of measures per system row
 * @param systemIndex    - Which system row was clicked (0-based)
 * @param beatPositions  - Legal beat positions for the current species,
 *                         e.g. [0] for Species I, [0, 2] for II/IV, [0, 1, 2, 3] for III
 * @returns { measureIndex, beatPosition }
 */
export function xCoordinateToBeatPosition(
  x: number,
  staveWidth: number,
  measuresPerSystem: number,
  systemIndex: number,
  beatPositions: number[]
): { measureIndex: number; beatPosition: number } {
  const measureInSystem = Math.min(
    Math.floor(x / staveWidth),
    measuresPerSystem - 1
  );
  const measureIndex = systemIndex * measuresPerSystem + measureInSystem;

  const xWithinMeasure = x - measureInSystem * staveWidth;
  const fraction = xWithinMeasure / staveWidth;

  // Snap to the nearest beat-centre using the same formula as the cursor overlay
  let bestBeat = beatPositions[0];
  let bestDist = Infinity;
  for (const beat of beatPositions) {
    const centre = 0.15 + 0.7 * (beat / 4);
    const dist = Math.abs(fraction - centre);
    if (dist < bestDist) {
      bestDist = dist;
      bestBeat = beat;
    }
  }

  return { measureIndex, beatPosition: bestBeat };
}

/**
 * Validates that a click is within staff bounds.
 *
 * @param y - Y-coordinate relative to container
 * @param staveY - Y-coordinate of the top of the staff
 * @param staffHeight - Height of the staff in pixels (default: 40, which is 4 spaces)
 * @returns True if click is within staff bounds
 */
export function isClickInStaffBounds(
  y: number,
  staveY: number,
  staffHeight: number = 40
): boolean {
  const relativeY = y - staveY;

  // Allow clicks slightly above and below staff for ledger lines
  const MARGIN = 20; // pixels
  return relativeY >= -MARGIN && relativeY <= staffHeight + MARGIN;
}

/**
 * Determines which system (row of staves) was clicked.
 *
 * @param y - Y-coordinate relative to container
 * @param systemHeight - Height of a single system (treble + bass + spacing)
 * @param systemSpacing - Vertical spacing between systems
 * @param topPadding - Top padding of the first system
 * @returns System index (0-based)
 */
export function getSystemIndex(
  y: number,
  systemHeight: number,
  systemSpacing: number,
  topPadding: number
): number {
  const adjustedY = y - topPadding;
  return Math.floor(adjustedY / (systemHeight + systemSpacing));
}

import { StaveNote, Accidental } from 'vexflow';
import type { Note, Clef } from '../../core/types/music.types';
import { pitchToVexFlow, durationToVexFlow } from '../../core/utils/vexflowFormatters';

/**
 * Converts a single Note to a VexFlow StaveNote.
 *
 * @param note - Our internal Note object
 * @param clef - The clef for proper vertical positioning
 * @returns VexFlow StaveNote instance
 */
function noteToStaveNote(note: Note, clef: Clef): StaveNote {
  const vexPitch = pitchToVexFlow(note.pitch);
  const vexDuration = durationToVexFlow(note.duration);

  // Create the StaveNote with clef for correct vertical positioning
  const staveNote = new StaveNote({
    clef,
    keys: [vexPitch],
    duration: vexDuration,
  });

  // Extract and apply accidentals if present
  const accidentalMatch = note.pitch.match(/[#b]+/);
  if (accidentalMatch) {
    const accidentalSymbol = accidentalMatch[0];
    staveNote.addModifier(new Accidental(accidentalSymbol), 0);
  }

  return staveNote;
}

/**
 * Converts an array of Notes to an array of VexFlow StaveNotes.
 *
 * @param notes - Array of our internal Note objects
 * @param clef - The clef for proper vertical positioning
 * @returns Array of VexFlow StaveNote instances
 *
 * @example
 * const notes = [
 *   { pitch: 'D3', duration: '1' as NoteDuration },
 *   { pitch: 'F3', duration: '1' as NoteDuration },
 * ];
 * const staveNotes = formatNotes(notes, 'bass');
 */
export function formatNotes(notes: Note[], clef: Clef): StaveNote[] {
  if (!notes || notes.length === 0) {
    throw new Error('Cannot format empty note array');
  }

  return notes.map(note => noteToStaveNote(note, clef));
}

/**
 * Groups notes into measures keyed by measureIndex, sorted by beatPosition.
 * Returns a sparse array so that cpMeasures[i] aligns with CF measure i.
 *
 * @param notes - Array of notes to group
 * @returns Sparse array of arrays, each containing notes for one measure
 */
export function groupNotesIntoMeasures(notes: Note[]): Note[][] {
  const measures: Note[][] = [];
  for (const note of notes) {
    if (!measures[note.measureIndex]) {
      measures[note.measureIndex] = [];
    }
    measures[note.measureIndex].push(note);
  }
  for (const measure of measures) {
    if (measure) {
      measure.sort((a, b) => a.beatPosition - b.beatPosition);
    }
  }
  return measures;
}

/**
 * Splits measures into systems (staff lines) based on measures per system.
 *
 * @param measures - Array of measures
 * @param measuresPerSystem - Number of measures per system
 * @returns Array of systems, each containing an array of measures
 */
export function groupMeasuresIntoSystems(
  measures: Note[][],
  measuresPerSystem: number
): Note[][][] {
  const systems: Note[][][] = [];

  for (let i = 0; i < measures.length; i += measuresPerSystem) {
    systems.push(measures.slice(i, i + measuresPerSystem));
  }

  return systems;
}

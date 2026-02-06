import { Note, Interval } from '../../types/music.types';
import { getInterval } from '../../models/Interval';

/**
 * Get ALL notes at a measure, sorted by beatPosition.
 * Unlike getNoteAtMeasure (which returns only the first match), this
 * is correct for Species II-V where multiple notes share a measure.
 */
export function getNotesAtMeasure(notes: Note[], measureIndex: number): Note[] {
  return notes
    .filter(n => n.measureIndex === measureIndex)
    .sort((a, b) => a.beatPosition - b.beatPosition);
}

/**
 * Get the note at an exact (measureIndex, beatPosition) pair.
 */
export function getNoteAtBeat(
  notes: Note[],
  measureIndex: number,
  beatPosition: number
): Note | null {
  return notes.find(n => n.measureIndex === measureIndex && n.beatPosition === beatPosition) ?? null;
}

/**
 * Get the downbeat note (beatPosition === 0) at a measure.
 */
export function getDownbeatNote(notes: Note[], measureIndex: number): Note | null {
  return getNoteAtBeat(notes, measureIndex, 0);
}

/**
 * Get all off-beat notes (beatPosition > 0) at a measure, sorted by beatPosition.
 */
export function getOffbeatNotes(notes: Note[], measureIndex: number): Note[] {
  return notes
    .filter(n => n.measureIndex === measureIndex && n.beatPosition > 0)
    .sort((a, b) => a.beatPosition - b.beatPosition);
}

/**
 * Get all consecutive (prev, curr) note pairs from an array,
 * sorted by (measureIndex, beatPosition). This is the fundamental
 * iteration primitive for melodic analysis in Species II-V.
 */
export function getConsecutiveNotePairs(notes: Note[]): Array<{ prev: Note; curr: Note }> {
  const sorted = [...notes].sort((a, b) => {
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.beatPosition - b.beatPosition;
  });

  const pairs: Array<{ prev: Note; curr: Note }> = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push({ prev: sorted[i], curr: sorted[i + 1] });
  }
  return pairs;
}

/**
 * Compute the interval between two Note objects.
 * Thin wrapper over getInterval() to avoid repeating destructuring.
 */
export function getIntervalBetweenNotes(note1: Note, note2: Note): Interval {
  return getInterval(note1.pitch, note1.midiNumber, note2.pitch, note2.midiNumber);
}

import { Note, Interval } from '../../types/music.types';
import { getInterval } from '../../models/Interval';
import { getNoteAtMeasure } from './contextHelpers';

/**
 * Get vertical interval at specific measure index (or null if CP note missing).
 */
export function getVerticalInterval(
  cf: Note[],
  cp: Note[],
  measureIndex: number
): Interval | null {
  const cfNote = getNoteAtMeasure(cf, measureIndex);
  const cpNote = getNoteAtMeasure(cp, measureIndex);

  if (!cfNote || !cpNote) {
    return null;
  }

  return getInterval(cfNote.pitch, cfNote.midiNumber, cpNote.pitch, cpNote.midiNumber);
}

/**
 * Get all vertical intervals as array of { measureIndex, interval }.
 * Only includes measures where both voices have notes.
 */
export function getAllVerticalIntervals(
  cf: Note[],
  cp: Note[]
): Array<{ measureIndex: number; interval: Interval }> {
  const intervals: Array<{ measureIndex: number; interval: Interval }> = [];

  // Check each counterpoint note against cantus firmus
  for (const cpNote of cp) {
    const interval = getVerticalInterval(cf, cp, cpNote.measureIndex);
    if (interval) {
      intervals.push({
        measureIndex: cpNote.measureIndex,
        interval,
      });
    }
  }

  return intervals;
}

/**
 * Check if both voices have notes at measure.
 */
export function hasNotePairAtMeasure(
  cf: Note[],
  cp: Note[],
  measureIndex: number
): boolean {
  const cfNote = getNoteAtMeasure(cf, measureIndex);
  const cpNote = getNoteAtMeasure(cp, measureIndex);
  return cfNote !== null && cpNote !== null;
}

// ---------------------------------------------------------------------------
// Beat-aware interval helpers (Species II-V)
// ---------------------------------------------------------------------------

import { getDownbeatNote, getNoteAtBeat } from './beatHelpers';

/**
 * Get vertical intervals at beat 0 of every measure where both voices sound.
 * For Species II-V: this isolates the strong-beat intervals that must be consonant.
 */
export function getDownbeatIntervals(
  cf: Note[],
  cp: Note[]
): Array<{ measureIndex: number; interval: Interval }> {
  const results: Array<{ measureIndex: number; interval: Interval }> = [];

  // Iterate over CF measures (CF defines the measure set)
  for (const cfNote of cf) {
    const cpDownbeat = getDownbeatNote(cp, cfNote.measureIndex);
    if (!cpDownbeat) continue;

    const interval = getInterval(cfNote.pitch, cfNote.midiNumber, cpDownbeat.pitch, cpDownbeat.midiNumber);
    results.push({ measureIndex: cfNote.measureIndex, interval });
  }

  return results;
}

/**
 * Get the vertical interval at an arbitrary (measureIndex, beatPosition).
 * The CF note is always the single whole note for that measure — beatPosition
 * is only used to locate the CP note.
 */
export function getIntervalAtBeat(
  cf: Note[],
  cp: Note[],
  measureIndex: number,
  beatPosition: number
): Interval | null {
  const cfNote = getNoteAtMeasure(cf, measureIndex);
  const cpNote = getNoteAtBeat(cp, measureIndex, beatPosition);

  if (!cfNote || !cpNote) return null;

  return getInterval(cfNote.pitch, cfNote.midiNumber, cpNote.pitch, cpNote.midiNumber);
}

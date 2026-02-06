import { Interval } from '../../types/music.types';
import { Note } from '../../types/music.types';
import { Key } from '../../types/key.types';
import { Species } from '../../types/species.types';
import { getIntervalBetweenNotes, getNoteAtBeat, getNotesAtMeasure } from './beatHelpers';

/**
 * True if the two notes are one diatonic step apart (1 or 2 semitones).
 */
export function isStepwiseMotion(note1: Note, note2: Note): boolean {
  return Math.abs(note2.midiNumber - note1.midiNumber) <= 2;
}

/**
 * True if the interval between two notes is larger than a step.
 */
export function isLeap(note1: Note, note2: Note): boolean {
  return Math.abs(note2.midiNumber - note1.midiNumber) > 2;
}

/**
 * True when the interval is dissonant.
 */
export function isDissonant(interval: Interval): boolean {
  return !interval.isConsonant;
}

/**
 * True when the interval is a tritone (augmented 4th or diminished 5th — 6 semitones).
 */
export function isTritone(interval: Interval): boolean {
  return interval.semitones === 6;
}

/**
 * Returns the leading-tone scale degree (always 7).
 * Callers must additionally verify the accidental when the key is minor:
 * Fux uses harmonic minor, so the leading tone in minor must have accidental === 'sharp'.
 */
export function getLeadingToneDegree(_key: Key): number {
  return 7;
}

/**
 * Detect a tie in Fourth Species by structural inference.
 * A tie exists when:
 *   - species is Fourth
 *   - noteA is on beat 1 of its measure
 *   - noteB is on beat 0 of the next measure
 *   - both notes share the same MIDI pitch
 */
export function isTiedPair(noteA: Note, noteB: Note, species: Species): boolean {
  if (species !== Species.Fourth) return false;
  return (
    noteA.beatPosition === 1 &&
    noteB.beatPosition === 0 &&
    noteB.measureIndex === noteA.measureIndex + 1 &&
    noteA.midiNumber === noteB.midiNumber
  );
}

// ---------------------------------------------------------------------------
// Dissonance-pattern checks (used by Species V umbrella rule)
// ---------------------------------------------------------------------------

/**
 * Check the passing-tone pattern around notes[index]:
 *   notes[index-1] → notes[index] → notes[index+1]
 *   all stepwise, same direction, prev & next consonant against CF.
 */
function isPassingTone(notes: Note[], index: number, cf: Note[]): boolean {
  if (index === 0 || index >= notes.length - 1) return false;

  const prev = notes[index - 1];
  const curr = notes[index];
  const next = notes[index + 1];

  // Must be stepwise in same direction
  const dir1 = Math.sign(curr.midiNumber - prev.midiNumber);
  const dir2 = Math.sign(next.midiNumber - curr.midiNumber);
  if (dir1 === 0 || dir1 !== dir2) return false;
  if (!isStepwiseMotion(prev, curr) || !isStepwiseMotion(curr, next)) return false;

  // Prev and next must be consonant against the CF note sounding at their measure
  const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
  const cfNext = cf.find(n => n.measureIndex === next.measureIndex);
  if (!cfPrev || !cfNext) return false;

  const intervalPrev = getIntervalBetweenNotes(cfPrev, prev);
  const intervalNext = getIntervalBetweenNotes(cfNext, next);
  return intervalPrev.isConsonant && intervalNext.isConsonant;
}

/**
 * Check the neighbor-tone pattern around notes[index]:
 *   step away from a consonance, step back to that same consonance.
 *   Direction reverses: prev and next are the same pitch.
 */
function isNeighborTone(notes: Note[], index: number, cf: Note[]): boolean {
  if (index === 0 || index >= notes.length - 1) return false;

  const prev = notes[index - 1];
  const curr = notes[index];
  const next = notes[index + 1];

  // Stepwise in both directions, direction reverses
  if (!isStepwiseMotion(prev, curr) || !isStepwiseMotion(curr, next)) return false;
  if (prev.midiNumber !== next.midiNumber) return false;

  // Prev (= next) must be consonant
  const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
  if (!cfPrev) return false;
  return getIntervalBetweenNotes(cfPrev, prev).isConsonant;
}

/**
 * Check the nota cambiata (escape tone) pattern around notes[index]:
 *   step down to dissonance (index), leap down a 3rd, then step up.
 *   Specifically: prev is one step above curr, next is a third below curr,
 *   and notes[index+2] steps up from next.
 */
function isCambiataEscape(notes: Note[], index: number, cf: Note[]): boolean {
  if (index === 0 || index + 2 >= notes.length) return false;

  const prev  = notes[index - 1];
  const curr  = notes[index];       // the dissonance
  const next  = notes[index + 1];   // leap target (consonance)
  const after = notes[index + 2];   // step back up

  // Approach: step down (prev is above curr by 1-2 semitones)
  const approachDir = Math.sign(curr.midiNumber - prev.midiNumber);
  if (approachDir >= 0) return false; // must be downward
  if (!isStepwiseMotion(prev, curr)) return false;

  // Departure: leap down a third (3-4 semitones below curr)
  const leapSize = curr.midiNumber - next.midiNumber;
  if (leapSize < 3 || leapSize > 4) return false; // third = 3 or 4 semitones

  // Recovery: step up from next
  const recoveryDir = Math.sign(after.midiNumber - next.midiNumber);
  if (recoveryDir <= 0) return false;
  if (!isStepwiseMotion(next, after)) return false;

  // next must be consonant against its CF note
  const cfNext = cf.find(n => n.measureIndex === next.measureIndex);
  if (!cfNext) return false;
  return getIntervalBetweenNotes(cfNext, next).isConsonant;
}

/**
 * Check the suspension pattern around notes[index]:
 *   - notes[index-1] (preparation) has same pitch as notes[index] and is consonant
 *   - notes[index] is the dissonant suspension (on a strong beat, tied from previous)
 *   - notes[index+1] resolves downward by step to a consonance
 */
function isSuspension(notes: Note[], index: number, cf: Note[]): boolean {
  if (index === 0 || index >= notes.length - 1) return false;

  const prep    = notes[index - 1];
  const susp    = notes[index];
  const resolve = notes[index + 1];

  // Preparation: same pitch, must be consonant
  if (prep.midiNumber !== susp.midiNumber) return false;
  const cfPrep = cf.find(n => n.measureIndex === prep.measureIndex);
  if (!cfPrep) return false;
  if (!getIntervalBetweenNotes(cfPrep, prep).isConsonant) return false;

  // Resolution: step down, must be consonant
  if (susp.midiNumber - resolve.midiNumber < 1) return false; // must go down
  if (!isStepwiseMotion(susp, resolve)) return false;
  const cfResolve = cf.find(n => n.measureIndex === resolve.measureIndex);
  if (!cfResolve) return false;
  return getIntervalBetweenNotes(cfResolve, resolve).isConsonant;
}

/**
 * Umbrella check: is the dissonant note at notes[index] treated legally
 * according to any of the four Fux-permitted patterns?
 * Used by the Species V rule and can be reused by any species that allows
 * multiple treatment types.
 */
export function isLegalDissonance(notes: Note[], index: number, cf: Note[], _species: Species): boolean {
  return (
    isPassingTone(notes, index, cf) ||
    isNeighborTone(notes, index, cf) ||
    isCambiataEscape(notes, index, cf) ||
    isSuspension(notes, index, cf)
  );
}

// Re-export beat helpers that scaleHelpers consumers frequently need together
export { getNotesAtMeasure, getNoteAtBeat };

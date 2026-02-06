// Note parsing and formatting utilities

import { Note, NoteDuration, Accidental } from '../types/music.types';
import { pitchToMidi } from './musicMath';

/**
 * Parse a pitch string to extract note name and accidental
 */
export function parsePitch(pitch: string): { noteName: string; accidental?: Accidental; octave: number } {
  const match = pitch.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }

  const [, noteName, accidentalStr = '', octaveStr] = match;
  
  let accidental: Accidental | undefined;
  if (accidentalStr === '#') accidental = 'sharp';
  else if (accidentalStr === '##') accidental = 'double-sharp';
  else if (accidentalStr === 'b') accidental = 'flat';
  else if (accidentalStr === 'bb') accidental = 'double-flat';

  return {
    noteName,
    accidental,
    octave: parseInt(octaveStr),
  };
}

/**
 * Create a Note object from pitch and duration
 */
export function createNote(
  pitch: string,
  duration: NoteDuration,
  measureIndex: number,
  beatPosition: number,
  scaleDegree: number = 1
): Note {
  const midiNumber = pitchToMidi(pitch);
  const { accidental } = parsePitch(pitch);

  return {
    pitch,
    midiNumber,
    duration,
    measureIndex,
    beatPosition,
    scaleDegree,
    accidental,
  };
}

/**
 * Format a note for display
 */
export function formatNote(note: Note): string {
  return `${note.pitch} (${note.duration})`;
}

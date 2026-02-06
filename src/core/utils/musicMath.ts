// Music mathematics utilities

/**
 * Converts a pitch string to MIDI number
 * @param pitch Scientific pitch notation: 'C4', 'F#5', 'Bb3'
 * @returns MIDI note number (60 = C4)
 */
export function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }

  const [, noteName, accidental = '', octave] = match;

  const noteValues: Record<string, number> = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  };

  let midiNumber = noteValues[noteName];
  
  // Apply accidentals
  if (accidental === '#') midiNumber += 1;
  else if (accidental === '##') midiNumber += 2;
  else if (accidental === 'b') midiNumber -= 1;
  else if (accidental === 'bb') midiNumber -= 2;

  // Add octave offset (C4 = 60)
  midiNumber += (parseInt(octave) + 1) * 12;

  return midiNumber;
}

/**
 * Converts MIDI number to pitch string
 * @param midi MIDI note number
 * @returns Scientific pitch notation
 */
export function midiToPitch(midi: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteName = noteNames[midi % 12];
  return `${noteName}${octave}`;
}

/**
 * Calculate interval in semitones between two MIDI numbers
 */
export function semitoneDifference(midi1: number, midi2: number): number {
  return Math.abs(midi2 - midi1);
}

/**
 * Get the sign of a number (-1, 0, or 1)
 */
export function sign(num: number): number {
  if (num > 0) return 1;
  if (num < 0) return -1;
  return 0;
}

/**
 * Calculate the interval degree between two pitches
 * @returns Interval degree (1=unison, 2=second, etc.)
 */
export function getIntervalDegree(pitch1: string, pitch2: string): number {
  const note1 = pitch1.match(/^([A-G])/)?.[1];
  const note2 = pitch2.match(/^([A-G])/)?.[1];
  
  if (!note1 || !note2) return 1;

  const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const index1 = noteOrder.indexOf(note1);
  const index2 = noteOrder.indexOf(note2);

  let degree = Math.abs(index2 - index1) + 1;
  
  // Adjust for octave spanning
  const midi1 = pitchToMidi(pitch1);
  const midi2 = pitchToMidi(pitch2);
  const semitones = Math.abs(midi2 - midi1);
  
  if (semitones >= 12) {
    degree += Math.floor(semitones / 12) * 7;
  }

  return degree;
}

import type { NoteDuration } from '../types/music.types';
import type { Key } from '../types/key.types';

/**
 * Converts our pitch format to VexFlow format.
 *
 * @param pitch - Pitch in format 'C4', 'F#5', 'Bb3', etc.
 * @returns VexFlow pitch format: 'c/4', 'f#/5', 'bb/3', etc.
 *
 * @example
 * pitchToVexFlow('C4') // returns 'c/4'
 * pitchToVexFlow('F#5') // returns 'f#/5'
 * pitchToVexFlow('Bb3') // returns 'bb/3'
 */
export function pitchToVexFlow(pitch: string): string {
  const match = pitch.match(/^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/);

  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }

  const [, noteName, accidental = '', octave] = match;
  return `${noteName.toLowerCase()}${accidental}/${octave}`;
}

/**
 * Converts our duration format to VexFlow duration format.
 *
 * @param duration - Note duration ('1', '2', '4', '8', '16')
 * @returns VexFlow duration: 'w', 'h', 'q', '8', '16'
 *
 * @example
 * durationToVexFlow('1') // returns 'w' (whole note)
 * durationToVexFlow('2') // returns 'h' (half note)
 * durationToVexFlow('4') // returns 'q' (quarter note)
 */
export function durationToVexFlow(duration: NoteDuration): string {
  const durationMap: Record<NoteDuration, string> = {
    '1': 'w',
    '2': 'h',
    '4': 'q',
    '8': '8',
    '16': '16',
  };

  const vexDuration = durationMap[duration];

  if (!vexDuration) {
    throw new Error(`Unsupported duration: ${duration}`);
  }

  return vexDuration;
}

/**
 * Converts our key format to VexFlow key signature format.
 *
 * @param key - Key object with tonic
 * @returns VexFlow key signature string
 *
 * @example
 * keyToVexFlowSignature({ tonic: 'G', mode: 'major' }) // returns 'G'
 * keyToVexFlowSignature({ tonic: 'F', mode: 'major' }) // returns 'F'
 */
export function keyToVexFlowSignature(key: Key): string {
  return key.tonic;
}

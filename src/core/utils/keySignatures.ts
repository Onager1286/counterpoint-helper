// Key signature data and utilities

import { Key } from '../types/key.types';

export const KEY_SIGNATURES: Record<string, Key> = {
  // Major keys
  'C major': { tonic: 'C', mode: 'major', signature: 0 },
  'G major': { tonic: 'G', mode: 'major', signature: 1 },
  'D major': { tonic: 'D', mode: 'major', signature: 2 },
  'A major': { tonic: 'A', mode: 'major', signature: 3 },
  'E major': { tonic: 'E', mode: 'major', signature: 4 },
  'B major': { tonic: 'B', mode: 'major', signature: 5 },
  'F# major': { tonic: 'F#', mode: 'major', signature: 6 },
  'C# major': { tonic: 'C#', mode: 'major', signature: 7 },
  'F major': { tonic: 'F', mode: 'major', signature: -1 },
  'Bb major': { tonic: 'Bb', mode: 'major', signature: -2 },
  'Eb major': { tonic: 'Eb', mode: 'major', signature: -3 },
  'Ab major': { tonic: 'Ab', mode: 'major', signature: -4 },
  'Db major': { tonic: 'Db', mode: 'major', signature: -5 },
  'Gb major': { tonic: 'Gb', mode: 'major', signature: -6 },
  
  // Minor keys
  'A minor': { tonic: 'A', mode: 'minor', signature: 0 },
  'E minor': { tonic: 'E', mode: 'minor', signature: 1 },
  'B minor': { tonic: 'B', mode: 'minor', signature: 2 },
  'F# minor': { tonic: 'F#', mode: 'minor', signature: 3 },
  'C# minor': { tonic: 'C#', mode: 'minor', signature: 4 },
  'G# minor': { tonic: 'G#', mode: 'minor', signature: 5 },
  'D# minor': { tonic: 'D#', mode: 'minor', signature: 6 },
  'A# minor': { tonic: 'A#', mode: 'minor', signature: 7 },
  'D minor': { tonic: 'D', mode: 'minor', signature: -1 },
  'G minor': { tonic: 'G', mode: 'minor', signature: -2 },
  'C minor': { tonic: 'C', mode: 'minor', signature: -3 },
  'F minor': { tonic: 'F', mode: 'minor', signature: -4 },
  'Bb minor': { tonic: 'Bb', mode: 'minor', signature: -5 },
  'Eb minor': { tonic: 'Eb', mode: 'minor', signature: -6 },
};

/**
 * Get the scale degrees for a given key
 */
export function getScaleDegrees(key: Key): string[] {
  const majorScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const tonicIndex = majorScale.indexOf(key.tonic.charAt(0));
  
  // Rotate to start from tonic
  const degrees = [
    ...majorScale.slice(tonicIndex),
    ...majorScale.slice(0, tonicIndex)
  ];

  return degrees;
}

/**
 * Parse a key string like "D minor" into a Key object
 */
export function parseKey(keyString: string): Key {
  const key = KEY_SIGNATURES[keyString];
  if (!key) {
    throw new Error(`Unknown key: ${keyString}`);
  }
  return key;
}

/**
 * Get all available key names
 */
export function getAllKeyNames(): string[] {
  return Object.keys(KEY_SIGNATURES);
}

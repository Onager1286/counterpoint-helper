// Key and scale type definitions

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: string;           // 'C', 'D', 'Eb', 'F#', etc.
  mode: Mode;
  signature: number;       // Number of sharps (positive) or flats (negative)
}

export interface Scale {
  key: Key;
  degrees: string[];       // Scale degree note names: ['C', 'D', 'E', 'F', 'G', 'A', 'B']
  accidentals: Accidental[];
}

export type Accidental = 'natural' | 'sharp' | 'flat' | 'double-sharp' | 'double-flat';

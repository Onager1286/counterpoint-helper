// Core music type definitions

export type NoteDuration = '1' | '2' | '4' | '8' | '16';
export type Accidental = 'natural' | 'sharp' | 'flat' | 'double-sharp' | 'double-flat';
export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';

export interface Note {
  pitch: string;           // Scientific pitch notation: 'C4', 'F#5', 'Bb3'
  midiNumber: number;      // MIDI note number: 60 = C4
  duration: NoteDuration;  // Note duration
  measureIndex: number;    // Which measure this note belongs to
  beatPosition: number;    // Position within the measure (0-based)
  scaleDegree: number;     // Scale degree in current key (1-7)
  accidental?: Accidental; // Accidental if present
}

export interface Interval {
  degree: number;          // Interval degree: 1=unison, 2=second, 3=third, etc.
  quality: IntervalQuality;
  semitones: number;       // Number of semitones
  isConsonant: boolean;    // True for P1, P5, P8, M3, m3, M6, m6
}

export type IntervalQuality = 
  | 'perfect'
  | 'major'
  | 'minor'
  | 'augmented'
  | 'diminished';

export interface Measure {
  notes: Note[];
  index: number;
}

export type MotionType = 
  | 'parallel'   // Same direction, same interval
  | 'similar'    // Same direction, different interval
  | 'contrary'   // Opposite directions
  | 'oblique';   // One voice moves, other stays

export interface VoiceMotion {
  type: MotionType;
  voice1From: Note;
  voice1To: Note;
  voice2From: Note;
  voice2To: Note;
  intervalBefore: Interval;
  intervalAfter: Interval;
}

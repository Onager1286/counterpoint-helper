// Cantus Firmus constraints based on Fux rules

import { Note } from '../types/music.types';
import { Key } from '../types/key.types';
import { createNote } from '../utils/noteParser';
import { pitchToMidi } from '../utils/musicMath';

export class CFConstraints {
  private key: Key;
  private scaleDegrees: string[];
  private totalLength: number;

  constructor(key: Key, totalLength: number) {
    this.key = key;
    this.totalLength = totalLength;
    this.scaleDegrees = this.buildScale();
  }

  getCandidates(existingNotes: Note[], position: number): Note[] {
    const lastNote = existingNotes[existingNotes.length - 1];
    const candidates: Note[] = [];

    for (let degree = 1; degree <= 7; degree++) {
      for (let octaveOffset = -1; octaveOffset <= 1; octaveOffset++) {
        const pitch = this.getPitchForDegree(degree, lastNote, octaveOffset);
        const midi = pitchToMidi(pitch);

        if (this.isValidCandidate(pitch, midi, existingNotes, position)) {
          candidates.push(createNote(pitch, '1', position, 0, degree));
        }
      }
    }

    // Minor-key leading tone at penultimate position
    if (this.key.mode === 'minor' && position === this.totalLength - 2) {
      const raisedSeventh = this.getRaisedSeventh(existingNotes);
      if (raisedSeventh && this.isValidCandidate(raisedSeventh.pitch, raisedSeventh.midi, existingNotes, position)) {
        candidates.push(createNote(raisedSeventh.pitch, '1', position, 0, 7));
      }
    }

    return candidates;
  }

  private isValidCandidate(
    _pitch: string,
    midi: number,
    existingNotes: Note[],
    _position: number
  ): boolean {
    const lastNote = existingNotes[existingNotes.length - 1];

    // No repeated notes
    if (midi === lastNote.midiNumber) {
      return false;
    }

    // Stay within one octave of the tonic
    const firstNote = existingNotes[0];
    if (Math.abs(midi - firstNote.midiNumber) > 12) {
      return false;
    }

    const interval = Math.abs(midi - lastNote.midiNumber);

    // Max leap: perfect 5th (7 semitones)
    if (interval > 7) {
      return false;
    }

    // Melodic tritone (aug 4 / dim 5) forbidden
    if (interval === 6) {
      return false;
    }

    // Leap-sequence rules
    if (existingNotes.length >= 2) {
      const prevNote = existingNotes[existingNotes.length - 2];
      const prevInterval = lastNote.midiNumber - prevNote.midiNumber;   // signed
      const currInterval = midi - lastNote.midiNumber;                  // signed

      // 1) Large leap (4th or larger, ≥5 semitones) must be followed by step in opposite direction
      if (Math.abs(prevInterval) >= 5) {
        if (Math.abs(currInterval) > 2 || Math.sign(currInterval) === Math.sign(prevInterval)) {
          return false;
        }
      }

      // 2) No two consecutive leaps in the same direction
      if (Math.abs(prevInterval) >= 3 && Math.abs(currInterval) >= 3) {
        if (Math.sign(currInterval) === Math.sign(prevInterval)) {
          return false;
        }
      }

      // 3) No three consecutive leaps
      if (existingNotes.length >= 3) {
        const prevPrevNote = existingNotes[existingNotes.length - 3];
        const prevPrevInterval = Math.abs(prevNote.midiNumber - prevPrevNote.midiNumber);
        if (prevPrevInterval >= 3 && Math.abs(prevInterval) >= 3 && Math.abs(currInterval) >= 3) {
          return false;
        }
      }
    }

    return true;
  }

  private buildScale(): string[] {
    const majorScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const tonicIndex = majorScale.indexOf(this.key.tonic.charAt(0));
    
    const degrees = [
      ...majorScale.slice(tonicIndex),
      ...majorScale.slice(0, tonicIndex)
    ];

    return degrees.map((note) => {
      if (this.key.signature > 0) {
        const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
        if (sharpOrder.slice(0, this.key.signature).includes(note)) {
          return note + '#';
        }
      } else if (this.key.signature < 0) {
        const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
        if (flatOrder.slice(0, Math.abs(this.key.signature)).includes(note)) {
          return note + 'b';
        }
      }
      return note;
    });
  }

  private getPitchForDegree(degree: number, referenceNote: Note, octaveOffset: number): string {
    const octaveMatch = referenceNote.pitch.match(/-?\d+$/);
    const noteOctave = parseInt(octaveMatch ? octaveMatch[0] : '4');
    const scaleDegreeNote = this.scaleDegrees[degree - 1];
    return scaleDegreeNote + (noteOctave + octaveOffset);
  }

  private getRaisedSeventh(existingNotes: Note[]): { pitch: string; midi: number } | null {
    // The raised 7th is exactly 1 semitone below the tonic.
    // The first note is always the tonic, so derive target from it.
    const tonicMidi = existingNotes[0].midiNumber;
    const targetMidi = tonicMidi - 1;

    // Spell from the natural 7th degree name in the scale
    const naturalSeventh = this.scaleDegrees[6]; // e.g. 'G' in A minor
    const raised = naturalSeventh.endsWith('b')
      ? naturalSeventh.slice(0, -1)   // remove flat → natural
      : naturalSeventh + '#';          // add sharp

    // Find the octave where this pitch equals targetMidi
    for (let oct = 1; oct <= 6; oct++) {
      const candidate = raised + oct;
      if (pitchToMidi(candidate) === targetMidi) {
        return { pitch: candidate, midi: targetMidi };
      }
    }
    return null;
  }
}

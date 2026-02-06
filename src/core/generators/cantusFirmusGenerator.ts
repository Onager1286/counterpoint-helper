// Cantus Firmus Generator using backtracking algorithm

import { Note } from '../types/music.types';
import { Key } from '../types/key.types';
import { createNote } from '../utils/noteParser';
import { validateCantusFirmus } from './cfValidator';
import { CFConstraints } from './cfConstraints';

export interface CFConfig {
  key: Key;
  length: number; // 4-16 measures
  clef: 'treble' | 'bass';
}

export class CantusFirmusGenerator {
  private key: Key;
  private length: number;
  private clef: 'treble' | 'bass';
  private constraints: CFConstraints;

  constructor(config: CFConfig) {
    this.key = config.key;
    this.length = config.length;
    this.clef = config.clef;
    this.constraints = new CFConstraints(config.key, config.length);
  }

  /**
   * Generate a valid Cantus Firmus following strict Fux rules
   */
  generate(): Note[] {
    const maxAttempts = 1000;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const cf = this.generateAttempt();
      if (cf && validateCantusFirmus(cf, this.key)) {
        return cf;
      }
      attempts++;
    }

    throw new Error('Failed to generate valid Cantus Firmus after maximum attempts');
  }

  private generateAttempt(): Note[] | null {
    const notes: Note[] = [];
    
    // Start on tonic
    const startPitch = this.getTonicPitch();
    notes.push(createNote(startPitch, '1', 0, 0, 1));

    // Generate middle notes using backtracking
    for (let i = 1; i < this.length - 1; i++) {
      const candidates = this.constraints.getCandidates(notes, i);
      
      if (candidates.length === 0) {
        return null; // Backtrack
      }

      // Weighted random selection (prefer stepwise motion)
      const nextNote = this.selectWeightedRandom(candidates, notes);
      notes.push(nextNote);
    }

    // End with proper cadence (2→1 or 7→1)
    const cadenceNote = this.generateCadence(notes);
    if (!cadenceNote) return null;
    
    notes.push(cadenceNote);

    // Ensure single climax
    if (!this.hasSingleClimax(notes)) {
      return null;
    }

    return notes;
  }

  private getTonicPitch(): string {
    const octave = this.clef === 'bass' ? 3 : 5;
    return `${this.key.tonic}${octave}`;
  }

  private selectWeightedRandom(candidates: Note[], existingNotes: Note[]): Note {
    const lastNote = existingNotes[existingNotes.length - 1];
    const weights = candidates.map(note => {
      const interval = Math.abs(note.midiNumber - lastNote.midiNumber);
      
      // 60% stepwise (1-2 semitones), 30% third, 10% larger intervals
      if (interval <= 2) return 0.6;
      if (interval <= 4) return 0.3;
      return 0.1;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return candidates[i];
      }
    }

    return candidates[candidates.length - 1];
  }

  private generateCadence(notes: Note[]): Note | null {
    const tonicPitch = this.getTonicPitch();
    const finalNote = createNote(tonicPitch, '1', this.length - 1, 0, 1);

    // Check if we can reach tonic from penultimate note
    const penultimate = notes[notes.length - 1];
    const interval = Math.abs(finalNote.midiNumber - penultimate.midiNumber);

    // Should approach by step (scale degree 2→1 or 7→1), never unison
    if (interval >= 1 && interval <= 2) {
      return finalNote;
    }

    return null;
  }

  private hasSingleClimax(notes: Note[]): boolean {
    const maxMidi = Math.max(...notes.map(n => n.midiNumber));
    const climaxIndices = notes.reduce<number[]>((acc, n, i) => {
      if (n.midiNumber === maxMidi) acc.push(i);
      return acc;
    }, []);
    return climaxIndices.length === 1 && climaxIndices[0] > 0 && climaxIndices[0] < notes.length - 1;
  }
}

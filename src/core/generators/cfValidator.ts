// Validate generated Cantus Firmus against Fux rules

import { Note } from '../types/music.types';
import { Key } from '../types/key.types';

export function validateCantusFirmus(notes: Note[], _key: Key): boolean {
  if (notes.length < 4 || notes.length > 16) {
    return false;
  }

  // Must start and end on tonic
  if (notes[0].scaleDegree !== 1 || notes[notes.length - 1].scaleDegree !== 1) {
    return false;
  }

  // Must have single climax at an interior position
  const maxMidi = Math.max(...notes.map(n => n.midiNumber));
  const climaxIndex = notes.findIndex(n => n.midiNumber === maxMidi);
  const climaxCount = notes.filter(n => n.midiNumber === maxMidi).length;
  if (climaxCount !== 1 || climaxIndex === 0 || climaxIndex === notes.length - 1) {
    return false;
  }

  // Check for valid melodic contour
  for (let i = 1; i < notes.length; i++) {
    const interval = Math.abs(notes[i].midiNumber - notes[i - 1].midiNumber);
    
    // No repeated notes
    if (interval === 0) {
      return false;
    }

    // No large leaps
    if (interval > 7) {
      return false;
    }

    // No melodic tritone (aug 4 / dim 5)
    if (interval === 6) {
      return false;
    }
  }

  return true;
}

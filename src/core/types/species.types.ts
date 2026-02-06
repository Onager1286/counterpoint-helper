// Species counterpoint type definitions

export enum Species {
  First = 1,
  Second = 2,
  Third = 3,
  Fourth = 4,
  Fifth = 5,
}

export interface SpeciesConfig {
  species: Species;
  name: string;
  description: string;
  notesPerMeasure: number;
  allowedDurations: string[];
  requiresDownbeatConsonance: boolean;
  allowsPassingTones: boolean;
  allowsSyncopation: boolean;
}

export const SPECIES_CONFIGS: Record<Species, SpeciesConfig> = {
  [Species.First]: {
    species: Species.First,
    name: 'First Species',
    description: 'Note against note - whole notes only',
    notesPerMeasure: 1,
    allowedDurations: ['1'],
    requiresDownbeatConsonance: true,
    allowsPassingTones: false,
    allowsSyncopation: false,
  },
  [Species.Second]: {
    species: Species.Second,
    name: 'Second Species',
    description: 'Two notes against one - half notes',
    notesPerMeasure: 2,
    allowedDurations: ['2'],
    requiresDownbeatConsonance: true,
    allowsPassingTones: true,
    allowsSyncopation: false,
  },
  [Species.Third]: {
    species: Species.Third,
    name: 'Third Species',
    description: 'Four notes against one - quarter notes',
    notesPerMeasure: 4,
    allowedDurations: ['4'],
    requiresDownbeatConsonance: true,
    allowsPassingTones: true,
    allowsSyncopation: false,
  },
  [Species.Fourth]: {
    species: Species.Fourth,
    name: 'Fourth Species',
    description: 'Syncopation - tied half notes',
    notesPerMeasure: 2,
    allowedDurations: ['2'],
    requiresDownbeatConsonance: false,
    allowsPassingTones: false,
    allowsSyncopation: true,
  },
  [Species.Fifth]: {
    species: Species.Fifth,
    name: 'Fifth Species',
    description: 'Florid counterpoint - mixed durations',
    notesPerMeasure: -1, // Variable
    allowedDurations: ['1', '2', '4', '8'],
    requiresDownbeatConsonance: true,
    allowsPassingTones: true,
    allowsSyncopation: true,
  },
};

// Global composition state management

import { createContext, useContext, useState, ReactNode } from 'react';
import { Note } from '../core/types/music.types';
import { Species } from '../core/types/species.types';
import { Key } from '../core/types/key.types';
import { AnalysisResult } from '../core/types/analysis.types';
import { analyzeComposition } from '../core/rules';

interface CompositionState {
  cantusFirmus: Note[] | null;
  counterpoint: Note[];
  species: Species;
  key: Key;
  analysisResult: AnalysisResult | null;
}

interface CompositionContextType extends CompositionState {
  setCantusFirmus: (cf: Note[] | null) => void;
  addCounterpointNote: (note: Note) => void;
  removeCounterpointNote: (index: number) => void;
  clearCounterpoint: () => void;
  setSpecies: (species: Species) => void;
  setKey: (key: Key) => void;
  submitAnalysis: () => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
}

const CompositionContext = createContext<CompositionContextType | undefined>(undefined);

export function CompositionProvider({ children }: { children: ReactNode }) {
  const [cantusFirmus, setCantusFirmusState] = useState<Note[] | null>(null);
  const [counterpoint, setCounterpoint] = useState<Note[]>([]);
  const [species, setSpecies] = useState<Species>(Species.First);
  const [key, setKey] = useState<Key>({ tonic: 'C', mode: 'major', signature: 0 });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const setCantusFirmus = (cf: Note[] | null) => {
    setCantusFirmusState(cf);
    setAnalysisResult(null); // Clear old analysis when CF changes
  };

  const addCounterpointNote = (note: Note) => {
    setCounterpoint(prev => {
      const updated = [...prev, note].sort((a, b) => {
        if (a.measureIndex !== b.measureIndex) {
          return a.measureIndex - b.measureIndex;
        }
        return a.beatPosition - b.beatPosition;
      });

      return updated;
    });
  };

  const removeCounterpointNote = (index: number) => {
    setCounterpoint(prev => {
      const updated = prev.filter((_, i) => i !== index);

      return updated;
    });
  };

  const clearCounterpoint = () => {
    setCounterpoint([]);
    setAnalysisResult(null); // Clear analysis when clearing counterpoint
  };

  const submitAnalysis = () => {
    if (!cantusFirmus || cantusFirmus.length === 0) {
      setAnalysisResult(null);
      return;
    }

    const result = analyzeComposition({
      species,
      key,
      cantusFirmus,
      counterpoint,
    });
    setAnalysisResult(result);
  };

  const value: CompositionContextType = {
    cantusFirmus,
    counterpoint,
    species,
    key,
    analysisResult,
    setCantusFirmus,
    addCounterpointNote,
    removeCounterpointNote,
    clearCounterpoint,
    setSpecies,
    setKey,
    submitAnalysis,
    setAnalysisResult,
  };

  return (
    <CompositionContext.Provider value={value}>
      {children}
    </CompositionContext.Provider>
  );
}

export function useComposition() {
  const context = useContext(CompositionContext);
  if (context === undefined) {
    throw new Error('useComposition must be used within CompositionProvider');
  }
  return context;
}

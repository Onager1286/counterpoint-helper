// Analysis and rule checking type definitions

import { Note } from './music.types';
import { Species } from './species.types';
import { Key } from './key.types';

export type Severity = 'error' | 'warning';

export interface Violation {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  educationalMessage: string;
  location: {
    measureIndex: number;
    beatPosition?: number;
  };
  affectedNotes: Note[];
}

export interface AnalysisResult {
  violations: Violation[];
  isValid: boolean;
  errorCount: number;
  warningCount: number;
}

export interface RuleContext {
  species: Species;
  key: Key;
  cantusFirmus: Note[];
  counterpoint: Note[];
}

export interface Rule {
  id: string;
  name: string;
  severity: Severity;
  species: Species[];
  description: string;
  check: (context: RuleContext) => Violation[];
}

export interface RuleCategory {
  name: string;
  rules: Rule[];
}

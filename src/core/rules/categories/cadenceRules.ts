import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getIntervalBetweenNotes, getNotesAtMeasure } from '../helpers/beatHelpers';
import { getLeadingToneDegree, isStepwiseMotion, isTiedPair } from '../helpers/scaleHelpers';

const ALL_SPECIES = [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth];

// ---------------------------------------------------------------------------
// Helper: get the sorted counterpoint array
// ---------------------------------------------------------------------------
function sortedCounterpoint(context: RuleContext) {
  return [...context.counterpoint].sort((a, b) => {
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.beatPosition - b.beatPosition;
  });
}

// ---------------------------------------------------------------------------
// Cadence rules
// ---------------------------------------------------------------------------

export const penultimatLeadingToneRule: Rule = {
  id: 'all-penultimate-leading-tone',
  name: 'Penultimate note must be the leading tone',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'The note immediately before the final note must be scale degree 7 (the leading tone)',
  check: (context: RuleContext): Violation[] => {
    const sorted = sortedCounterpoint(context);
    if (sorted.length < 2) return [];

    const finalNote = sorted[sorted.length - 1];
    const penultimate = sorted[sorted.length - 2];

    const leadingDegree = getLeadingToneDegree(context.key);

    // Check scale degree
    if (penultimate.scaleDegree !== leadingDegree) {
      return [{
        ruleId: 'all-penultimate-leading-tone',
        ruleName: 'Penultimate note must be the leading tone',
        severity: 'error',
        message: `Penultimate note is scale degree ${penultimate.scaleDegree}, expected ${leadingDegree} (leading tone)`,
        educationalMessage: 'The note immediately before the final tonic must be the leading tone (scale degree 7). In minor keys, this is the raised 7th (harmonic minor). The leading tone creates strong pull toward the tonic.',
        location: { measureIndex: penultimate.measureIndex, beatPosition: penultimate.beatPosition },
        affectedNotes: [penultimate, finalNote],
      }];
    }

    // In minor keys, the leading tone must be raised (sharp)
    if (context.key.mode === 'minor' && penultimate.accidental !== 'sharp') {
      return [{
        ruleId: 'all-penultimate-leading-tone',
        ruleName: 'Penultimate note must be the leading tone',
        severity: 'error',
        message: 'Leading tone in minor must be raised (sharp) — use harmonic minor',
        educationalMessage: 'Fux uses harmonic minor for cadences. The 7th scale degree must be raised by a half step to create the leading-tone pull toward the tonic.',
        location: { measureIndex: penultimate.measureIndex, beatPosition: penultimate.beatPosition },
        affectedNotes: [penultimate, finalNote],
      }];
    }

    return [];
  },
};

export const penultimateApproachesByStepRule: Rule = {
  id: 'all-penultimate-approaches-by-step',
  name: 'Leading tone should be approached by step',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The leading tone in the penultimate position should be approached by stepwise motion',
  check: (context: RuleContext): Violation[] => {
    const sorted = sortedCounterpoint(context);
    if (sorted.length < 3) return [];

    const penultimate = sorted[sorted.length - 2];
    const beforePenultimate = sorted[sorted.length - 3];

    // Only warn if penultimate is actually the leading tone
    if (penultimate.scaleDegree !== getLeadingToneDegree(context.key)) return [];

    if (!isStepwiseMotion(beforePenultimate, penultimate)) {
      return [{
        ruleId: 'all-penultimate-approaches-by-step',
        ruleName: 'Leading tone should be approached by step',
        severity: 'warning',
        message: 'Leading tone is approached by leap',
        educationalMessage: 'Stepwise approach to the leading tone strengthens the cadential pull. A leap into the leading tone weakens the sense of arrival.',
        location: { measureIndex: penultimate.measureIndex, beatPosition: penultimate.beatPosition },
        affectedNotes: [beforePenultimate, penultimate],
      }];
    }

    return [];
  },
};

export const s4CadentialSuspensionRule: Rule = {
  id: 's4-cadential-suspension',
  name: 'Fourth Species cadence should use a 7-8 suspension',
  severity: 'warning',
  species: [Species.Fourth],
  description: 'The Fourth Species cadence is ideally a 7-8 suspension: leading tone held as suspension, resolving to tonic',
  check: (context: RuleContext): Violation[] => {
    const sorted = sortedCounterpoint(context);
    if (sorted.length < 3) return [];

    const cf = context.cantusFirmus;
    if (cf.length < 2) return [];

    const finalNote = sorted[sorted.length - 1];
    const penultimate = sorted[sorted.length - 2];
    const beforePenultimate = sorted[sorted.length - 3];

    // Check if we have a suspension pattern at the cadence:
    // beforePenultimate and penultimate are same pitch (tie), penultimate resolves down to final
    const hasSuspensionPattern =
      isTiedPair(beforePenultimate, penultimate, Species.Fourth) &&
      penultimate.scaleDegree === getLeadingToneDegree(context.key) &&
      finalNote.midiNumber < penultimate.midiNumber &&
      isStepwiseMotion(penultimate, finalNote);

    if (!hasSuspensionPattern) {
      return [{
        ruleId: 's4-cadential-suspension',
        ruleName: 'Fourth Species cadence should use a 7-8 suspension',
        severity: 'warning',
        message: 'Cadence does not use the recommended 7-8 suspension pattern',
        educationalMessage: 'The ideal Fourth Species cadence uses a suspension: the leading tone (7) is prepared on a weak beat, tied over the barline to become dissonant on the strong beat, then resolves down by step to the tonic (8/1). This creates maximum cadential tension and release.',
        location: { measureIndex: penultimate.measureIndex, beatPosition: penultimate.beatPosition },
        affectedNotes: [beforePenultimate, penultimate, finalNote],
      }];
    }

    return [];
  },
};

export const finalNoteIsTonicRule: Rule = {
  id: 'all-final-note-is-tonic',
  name: 'Final note must be the tonic',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'The last note of the counterpoint must be scale degree 1 (the tonic)',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length === 0) return [];

    const sorted = sortedCounterpoint(context);
    const finalNote = sorted[sorted.length - 1];

    if (finalNote.scaleDegree !== 1) {
      return [{
        ruleId: 'all-final-note-is-tonic',
        ruleName: 'Final note must be the tonic',
        severity: 'error',
        message: `Final note is scale degree ${finalNote.scaleDegree}, expected 1 (tonic)`,
        educationalMessage: 'The counterpoint must end on the tonic for complete harmonic closure. The tonic is the home note of the key and provides a sense of finality.',
        location: { measureIndex: finalNote.measureIndex, beatPosition: finalNote.beatPosition },
        affectedNotes: [finalNote],
      }];
    }

    return [];
  },
};

export const cadenceNoOffbeatDissonanceRule: Rule = {
  id: 's2s3s5-cadence-no-offbeat-dissonance',
  name: 'Final measure must be entirely consonant',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'No dissonant notes are permitted in the final measure',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    if (cf.length === 0) return [];

    const lastMeasure = cf[cf.length - 1].measureIndex;
    const cfNote = cf.find(n => n.measureIndex === lastMeasure);
    if (!cfNote) return [];

    const cpNotes = getNotesAtMeasure(context.counterpoint, lastMeasure);
    const violations: Violation[] = [];

    for (const note of cpNotes) {
      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!interval.isConsonant) {
        violations.push({
          ruleId: 's2s3s5-cadence-no-offbeat-dissonance',
          ruleName: 'Final measure must be entirely consonant',
          severity: 'error',
          message: `Dissonance in final measure at beat ${note.beatPosition + 1}`,
          educationalMessage: 'The final measure of the counterpoint must be entirely consonant. No dissonance treatment (passing tones, etc.) is permitted in the closing measure.',
          location: { measureIndex: lastMeasure, beatPosition: note.beatPosition },
          affectedNotes: [cfNote, note],
        });
      }
    }

    return violations;
  },
};

export const noCadenceAtClimaxRule: Rule = {
  id: 'all-no-cadence-at-climax',
  name: 'Climax should not be in the last two measures',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The melodic climax (highest note) should occur in the middle of the piece, not at the cadence',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 3) return [];

    const cf = context.cantusFirmus;
    if (cf.length < 3) return [];

    const sorted = sortedCounterpoint(context);
    const maxMidi = Math.max(...sorted.map(n => n.midiNumber));
    const climax = sorted.find(n => n.midiNumber === maxMidi);
    if (!climax) return [];

    // Last two CF measures
    const lastMeasure = cf[cf.length - 1].measureIndex;
    const penultimateMeasure = cf[cf.length - 2].measureIndex;

    if (climax.measureIndex === lastMeasure || climax.measureIndex === penultimateMeasure) {
      return [{
        ruleId: 'all-no-cadence-at-climax',
        ruleName: 'Climax should not be in the last two measures',
        severity: 'warning',
        message: `Melodic climax (${climax.pitch}) is in measure ${climax.measureIndex + 1} — too close to the cadence`,
        educationalMessage: 'Placing the melodic climax at the very end of the piece robs the cadence of its sense of resolution. The climax should occur roughly in the middle third of the counterpoint.',
        location: { measureIndex: climax.measureIndex, beatPosition: climax.beatPosition },
        affectedNotes: [climax],
      }];
    }

    return [];
  },
};

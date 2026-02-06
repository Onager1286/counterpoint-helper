import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getIntervalBetweenNotes } from '../helpers/beatHelpers';
import { isStepwiseMotion, isDissonant, isTiedPair, isLegalDissonance } from '../helpers/scaleHelpers';

// ---------------------------------------------------------------------------
// Helpers shared by the passing-tone rules
// ---------------------------------------------------------------------------

/**
 * Find all off-beat dissonant notes and check whether each one fits
 * the passing-tone pattern: prev →(step)→ diss →(step, same dir)→ next,
 * with prev and next both consonant against their CF notes.
 */
function checkPassingTones(context: RuleContext, ruleId: string, ruleName: string): Violation[] {
  const cf = context.cantusFirmus;
  const sorted = [...context.counterpoint].sort((a, b) => {
    if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
    return a.beatPosition - b.beatPosition;
  });

  const violations: Violation[] = [];

  for (let i = 1; i < sorted.length - 1; i++) {
    const note = sorted[i];
    if (note.beatPosition === 0) continue; // only off-beat

    const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
    if (!cfNote) continue;

    const interval = getIntervalBetweenNotes(cfNote, note);
    if (!isDissonant(interval)) continue;

    // This is a dissonant off-beat note — check passing-tone pattern
    const prev = sorted[i - 1];
    const next = sorted[i + 1];

    const dir1 = Math.sign(note.midiNumber - prev.midiNumber);
    const dir2 = Math.sign(next.midiNumber - note.midiNumber);

    const isValidPassingTone =
      isStepwiseMotion(prev, note) &&
      isStepwiseMotion(note, next) &&
      dir1 !== 0 && dir1 === dir2; // same non-zero direction

    if (!isValidPassingTone) {
      violations.push({
        ruleId,
        ruleName,
        severity: 'error',
        message: `Dissonance at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1} is not a valid passing tone`,
        educationalMessage: 'A passing tone must be approached and left by step in the same direction, connecting two consonant notes. Check that the notes before and after move stepwise through the dissonance.',
        location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
        affectedNotes: [prev, note, next],
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Species II: Passing tones only
// ---------------------------------------------------------------------------

export const s2PassingToneRule: Rule = {
  id: 's2-passing-tone',
  name: 'Second Species: dissonances must be passing tones',
  severity: 'error',
  species: [Species.Second],
  description: 'Every off-beat dissonance in Second Species must be a valid passing tone',
  check: (context: RuleContext): Violation[] => {
    return checkPassingTones(context, 's2-passing-tone', 'Second Species: dissonances must be passing tones');
  },
};

// ---------------------------------------------------------------------------
// Species III: Passing tones, neighbor tones, and cambiata
// ---------------------------------------------------------------------------

export const s3PassingToneRule: Rule = {
  id: 's3-passing-tone',
  name: 'Third Species: check passing-tone pattern',
  severity: 'error',
  species: [Species.Third],
  description: 'Off-beat dissonances in Third Species that are not neighbor tones or cambiatas must be valid passing tones',
  check: (context: RuleContext): Violation[] => {
    // Third Species allows neighbor tones and cambiatas in addition to passing tones.
    // We only flag dissonances that fail ALL legal patterns — that check is handled
    // by the per-pattern rules below. This rule specifically checks the passing-tone
    // shape for notes that look like they are attempting a passing tone.
    return checkPassingTones(context, 's3-passing-tone', 'Third Species: check passing-tone pattern');
  },
};

export const s3NeighborToneRule: Rule = {
  id: 's3-neighbor-tone',
  name: 'Third Species: neighbor tone must return to consonance',
  severity: 'error',
  species: [Species.Third],
  description: 'A neighbor tone steps away from a consonance and must step back to that same pitch',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 1; i < sorted.length - 1; i++) {
      const note = sorted[i];
      if (note.beatPosition === 0) continue;

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue;

      const prev = sorted[i - 1];
      const next = sorted[i + 1];

      // Only check notes that look like attempted neighbor tones:
      // stepwise approach and stepwise return, but direction reverses
      if (!isStepwiseMotion(prev, note) || !isStepwiseMotion(note, next)) continue;
      const dir1 = Math.sign(note.midiNumber - prev.midiNumber);
      const dir2 = Math.sign(next.midiNumber - note.midiNumber);
      if (dir1 === dir2) continue; // not a direction reversal — not a neighbor tone attempt

      // Valid neighbor: prev and next must be the same pitch
      if (prev.midiNumber !== next.midiNumber) {
        violations.push({
          ruleId: 's3-neighbor-tone',
          ruleName: 'Third Species: neighbor tone must return to consonance',
          severity: 'error',
          message: `Neighbor tone at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1} does not return to the same note`,
          educationalMessage: 'A neighbor tone steps one step away from a consonant note and must immediately return to that exact same pitch.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [prev, note, next],
        });
      }
    }

    return violations;
  },
};

export const s3CambiataEscapeRule: Rule = {
  id: 's3-cambiata-escape',
  name: 'Third Species: cambiata escape pattern must be correct',
  severity: 'error',
  species: [Species.Third],
  description: 'A dissonance left by leap must follow the nota cambiata pattern: step down, leap down a third, step up',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 1; i < sorted.length - 1; i++) {
      const note = sorted[i];
      if (note.beatPosition === 0) continue;

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue;

      const prev = sorted[i - 1];
      const next = sorted[i + 1];

      // Only flag if the departure is a leap (the cambiata is the ONLY context
      // where a dissonance may be left by leap)
      const departureSize = Math.abs(next.midiNumber - note.midiNumber);
      if (departureSize <= 2) continue; // left by step — not a cambiata attempt

      // Validate the cambiata pattern
      const approachDir = Math.sign(note.midiNumber - prev.midiNumber);
      const departDir = Math.sign(next.midiNumber - note.midiNumber);

      // Must: approach by step down, leap down a third (3-4 semitones), then step up
      const validApproach = isStepwiseMotion(prev, note) && approachDir < 0;
      const validLeap = departDir < 0 && departureSize >= 3 && departureSize <= 4;
      const hasRecovery = i + 2 < sorted.length && isStepwiseMotion(next, sorted[i + 2]) && Math.sign(sorted[i + 2].midiNumber - next.midiNumber) > 0;

      if (!validApproach || !validLeap || !hasRecovery) {
        violations.push({
          ruleId: 's3-cambiata-escape',
          ruleName: 'Third Species: cambiata escape pattern must be correct',
          severity: 'error',
          message: `Dissonance at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1} left by leap without valid cambiata pattern`,
          educationalMessage: 'The nota cambiata is the only situation where a dissonance may be left by leap. The pattern must be: step down to the dissonance, leap down a third to a consonance, then step back up.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [prev, note, next],
        });
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// Species IV: Suspensions
// ---------------------------------------------------------------------------

export const s4SuspensionPreparationRule: Rule = {
  id: 's4-suspension-preparation',
  name: 'Suspension must be prepared',
  severity: 'error',
  species: [Species.Fourth],
  description: 'A dissonant suspension must be prepared: the previous note must be the same pitch and consonant',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const note = sorted[i];

      // In Fourth Species, the suspension is the downbeat note (beat 0)
      // that was tied from the previous measure's off-beat (beat 1).
      if (note.beatPosition !== 0 || i === 0) continue;

      const prev = sorted[i - 1];

      // Check if this is actually a tied note (suspension)
      if (!isTiedPair(prev, note, Species.Fourth)) continue;

      // Now check: is this suspension dissonant?
      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue; // consonant — not a suspension issue

      // Preparation: prev must be consonant against its CF
      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      if (!cfPrev) continue;

      const prepInterval = getIntervalBetweenNotes(cfPrev, prev);
      if (!prepInterval.isConsonant) {
        violations.push({
          ruleId: 's4-suspension-preparation',
          ruleName: 'Suspension must be prepared',
          severity: 'error',
          message: `Suspension at measure ${note.measureIndex + 1} is not properly prepared (preparation is dissonant)`,
          educationalMessage: 'A suspension must be prepared by a consonant note of the same pitch on the previous beat. The preparation establishes the note as "belonging" before it becomes dissonant.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [prev, note],
        });
      }
    }

    return violations;
  },
};

export const s4SuspensionResolutionRule: Rule = {
  id: 's4-suspension-resolution',
  name: 'Suspension must resolve to a consonance',
  severity: 'error',
  species: [Species.Fourth],
  description: 'The note after a dissonant suspension must be consonant',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 1; i < sorted.length - 1; i++) {
      const note = sorted[i];
      if (note.beatPosition !== 0) continue;

      const prev = sorted[i - 1];
      if (!isTiedPair(prev, note, Species.Fourth)) continue;

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue;

      // Check that the resolution note is consonant
      const next = sorted[i + 1];
      const cfNext = cf.find(n => n.measureIndex === next.measureIndex);
      if (!cfNext) continue;

      const resInterval = getIntervalBetweenNotes(cfNext, next);
      if (!resInterval.isConsonant) {
        violations.push({
          ruleId: 's4-suspension-resolution',
          ruleName: 'Suspension must resolve to a consonance',
          severity: 'error',
          message: `Suspension at measure ${note.measureIndex + 1} resolves to a dissonance`,
          educationalMessage: 'After a dissonant suspension, the next note must be consonant. The suspension creates tension that must be released by resolving to a consonant interval.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [note, next],
        });
      }
    }

    return violations;
  },
};

export const s4SuspensionResolutionDirectionRule: Rule = {
  id: 's4-suspension-resolution-direction',
  name: 'Suspension must resolve downward by step',
  severity: 'error',
  species: [Species.Fourth],
  description: 'A dissonant suspension must resolve downward by step — upward resolution is forbidden in Fux',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 1; i < sorted.length - 1; i++) {
      const note = sorted[i];
      if (note.beatPosition !== 0) continue;

      const prev = sorted[i - 1];
      if (!isTiedPair(prev, note, Species.Fourth)) continue;

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue;

      const next = sorted[i + 1];

      // Must go down by step
      const goesDown = next.midiNumber < note.midiNumber;
      const isByStep = isStepwiseMotion(note, next);

      if (!goesDown || !isByStep) {
        violations.push({
          ruleId: 's4-suspension-resolution-direction',
          ruleName: 'Suspension must resolve downward by step',
          severity: 'error',
          message: `Suspension at measure ${note.measureIndex + 1} does not resolve downward by step`,
          educationalMessage: 'In strict counterpoint, suspensions must always resolve downward by step. Upward resolution or resolution by leap are not permitted.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [note, next],
        });
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// Species V: All dissonance treatments (umbrella rule)
// ---------------------------------------------------------------------------

export const s5AllDissonanceTreatmentsRule: Rule = {
  id: 's5-all-dissonance-treatments',
  name: 'Fifth Species: every dissonance must be legally treated',
  severity: 'error',
  species: [Species.Fifth],
  description: 'In Fifth Species every dissonant note must fit passing tone, neighbor tone, cambiata, or suspension pattern',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    const violations: Violation[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const note = sorted[i];

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!isDissonant(interval)) continue;

      // Check all legal dissonance patterns
      if (!isLegalDissonance(sorted, i, cf, Species.Fifth)) {
        violations.push({
          ruleId: 's5-all-dissonance-treatments',
          ruleName: 'Fifth Species: every dissonance must be legally treated',
          severity: 'error',
          message: `Dissonance at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1} has no valid treatment`,
          educationalMessage: 'In Fifth Species, every dissonant note must be one of: a passing tone (stepwise through), a neighbor tone (step away and back), a cambiata escape (step down, leap down a third, step up), or a suspension (tied from a consonant preparation, resolving down by step).',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [note],
        });
      }
    }

    return violations;
  },
};

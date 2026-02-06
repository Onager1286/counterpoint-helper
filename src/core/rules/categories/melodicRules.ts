import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getAllMotions } from '../helpers/motionHelpers';
import { getConsecutiveNotePairs, getIntervalBetweenNotes } from '../helpers/beatHelpers';
import { isStepwiseMotion, isLeap, isDissonant } from '../helpers/scaleHelpers';

export const preferContraryMotionRule: Rule = {
  id: 'species1-prefer-contrary-motion',
  name: 'Prefer contrary motion',
  severity: 'warning',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Composition should use contrary motion frequently for independence',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    if (motions.length < 3) return []; // Need at least 3 motions to analyze

    const contraryCount = motions.filter(m => m.type === 'contrary').length;
    const contraryRatio = contraryCount / motions.length;

    if (contraryRatio < 0.4) {
      return [{
        ruleId: 'species1-prefer-contrary-motion',
        ruleName: 'Prefer contrary motion',
        severity: 'warning',
        message: `Only ${Math.round(contraryRatio * 100)}% contrary motion (recommend >40%)`,
        educationalMessage: 'Contrary motion creates the strongest sense of melodic independence between voices. Try using contrary motion more frequently.',
        location: { measureIndex: 0 }, // General feedback
        affectedNotes: [],
      }];
    }

    return [];
  },
};

export const recoverLeapsRule: Rule = {
  id: 'species1-recover-leaps',
  name: 'Recover leaps by step',
  severity: 'warning',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Large leaps should be followed by stepwise motion in opposite direction',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 3) return [];

    const violations: Violation[] = [];

    for (let i = 1; i < cp.length - 1; i++) {
      const prev = cp[i - 1];
      const curr = cp[i];
      const next = cp[i + 1];

      const leap = Math.abs(curr.midiNumber - prev.midiNumber);
      const recovery = Math.abs(next.midiNumber - curr.midiNumber);

      // Leap is > P4 (5 semitones)
      if (leap > 5) {
        const leapDirection = Math.sign(curr.midiNumber - prev.midiNumber);
        const recoveryDirection = Math.sign(next.midiNumber - curr.midiNumber);

        // Recovery should be: opposite direction AND stepwise (≤2 semitones)
        const isProperRecovery =
          leapDirection !== recoveryDirection && recovery <= 2;

        if (!isProperRecovery) {
          violations.push({
            ruleId: 'species1-recover-leaps',
            ruleName: 'Recover leaps by step',
            severity: 'warning',
            message: `Leap at measure ${curr.measureIndex + 1} not recovered properly`,
            educationalMessage: 'Fux teaches that leaps larger than a fourth should be "recovered" by stepwise motion in the opposite direction.',
            location: { measureIndex: curr.measureIndex },
            affectedNotes: [prev, curr, next],
          });
        }
      }
    }

    return violations;
  },
};

export const climaxApproachRule: Rule = {
  id: 'species1-climax-approach',
  name: 'Approach climax by step',
  severity: 'warning',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Melodic climax should be approached and left by step',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 3) return [];

    // Find climax (highest note)
    const maxMidi = Math.max(...cp.map(n => n.midiNumber));
    const climaxNote = cp.find(n => n.midiNumber === maxMidi);

    if (!climaxNote) return [];
    const climaxIndex = cp.indexOf(climaxNote);

    const violations: Violation[] = [];

    // Check approach (if not first note)
    if (climaxIndex > 0) {
      const approach = Math.abs(climaxNote.midiNumber - cp[climaxIndex - 1].midiNumber);
      if (approach > 2) {
        violations.push({
          ruleId: 'species1-climax-approach',
          ruleName: 'Approach climax by step',
          severity: 'warning',
          message: `Climax at measure ${climaxNote.measureIndex + 1} approached by leap`,
          educationalMessage: 'Stepwise approach to the melodic climax creates smooth, singable melodies.',
          location: { measureIndex: climaxNote.measureIndex },
          affectedNotes: [cp[climaxIndex - 1], climaxNote],
        });
      }
    }

    // Check departure (if not last note)
    if (climaxIndex < cp.length - 1) {
      const departure = Math.abs(cp[climaxIndex + 1].midiNumber - climaxNote.midiNumber);
      if (departure > 2) {
        violations.push({
          ruleId: 'species1-climax-approach',
          ruleName: 'Leave climax by step',
          severity: 'warning',
          message: `Climax at measure ${climaxNote.measureIndex + 1} left by leap`,
          educationalMessage: 'Stepwise departure from the melodic climax creates smooth, singable melodies.',
          location: { measureIndex: climaxNote.measureIndex },
          affectedNotes: [climaxNote, cp[climaxIndex + 1]],
        });
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// All-species melodic rules
// ---------------------------------------------------------------------------

const ALL_SPECIES = [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth];

export const rangeLimitRule: Rule = {
  id: 'all-range-limit',
  name: 'Counterpoint range must not exceed a tenth',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The counterpoint line must stay within a tenth (16 semitones) of its starting note',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 2) return [];

    const start = cp[0].midiNumber;
    const violations: Violation[] = [];

    for (const note of cp) {
      if (Math.abs(note.midiNumber - start) > 16) {
        violations.push({
          ruleId: 'all-range-limit',
          ruleName: 'Counterpoint range must not exceed a tenth',
          severity: 'warning',
          message: `Note at measure ${note.measureIndex + 1} is more than a tenth from the opening note`,
          educationalMessage: 'A counterpoint line spanning more than a tenth loses melodic coherence. Keep the range compact for a singable melody.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [cp[0], note],
        });
      }
    }

    return violations;
  },
};

export const noLeapOfSeventhOrMoreRule: Rule = {
  id: 'all-no-leap-of-seventh-or-more',
  name: 'No melodic leap larger than a sixth',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'No single melodic leap in the counterpoint may exceed a minor sixth (8 semitones)',
  check: (context: RuleContext): Violation[] => {
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      const leapSize = Math.abs(curr.midiNumber - prev.midiNumber);
      if (leapSize > 8) {
        violations.push({
          ruleId: 'all-no-leap-of-seventh-or-more',
          ruleName: 'No melodic leap larger than a sixth',
          severity: 'error',
          message: `Leap of ${leapSize} semitones at measure ${curr.measureIndex + 1}`,
          educationalMessage: 'Fux prohibits melodic leaps larger than a minor sixth. Large leaps are difficult to sing and break melodic flow.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [prev, curr],
        });
      }
    }

    return violations;
  },
};

export const noRepeatedNotesRule: Rule = {
  id: 'all-no-repeated-notes',
  name: 'No repeated consecutive notes',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'Two consecutive notes at the same pitch are forbidden (except Fourth Species ties)',
  check: (context: RuleContext): Violation[] => {
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      if (prev.midiNumber !== curr.midiNumber) continue;

      // In Fourth Species, same-pitch consecutive notes are ties — skip
      if (context.species === Species.Fourth) {
        // Tie: prev is beat 1, curr is beat 0 of next measure
        if (prev.beatPosition === 1 && curr.beatPosition === 0 && curr.measureIndex === prev.measureIndex + 1) {
          continue;
        }
      }

      violations.push({
        ruleId: 'all-no-repeated-notes',
        ruleName: 'No repeated consecutive notes',
        severity: 'error',
        message: `Repeated note ${curr.pitch} at measure ${curr.measureIndex + 1}, beat ${curr.beatPosition + 1}`,
        educationalMessage: 'Consecutive notes at the same pitch stall the melodic line. Each note should move to a new pitch (ties in Fourth Species are the only exception).',
        location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
        affectedNotes: [prev, curr],
      });
    }

    return violations;
  },
};

export const noConsecutiveLeapsSameDirectionRule: Rule = {
  id: 'all-no-consecutive-leaps-same-direction',
  name: 'Avoid two consecutive leaps in the same direction',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'Two consecutive leaps in the same direction weaken the melodic line',
  check: (context: RuleContext): Violation[] => {
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    if (pairs.length < 2) return [];

    const violations: Violation[] = [];

    for (let i = 1; i < pairs.length; i++) {
      const { prev: a, curr: b } = pairs[i - 1];
      const { curr: c } = pairs[i];

      if (!isLeap(a, b) || !isLeap(b, c)) continue;

      const dir1 = Math.sign(b.midiNumber - a.midiNumber);
      const dir2 = Math.sign(c.midiNumber - b.midiNumber);

      if (dir1 === dir2) {
        violations.push({
          ruleId: 'all-no-consecutive-leaps-same-direction',
          ruleName: 'Avoid two consecutive leaps in the same direction',
          severity: 'warning',
          message: `Two consecutive leaps in the same direction ending at measure ${c.measureIndex + 1}`,
          educationalMessage: 'Consecutive leaps in the same direction create an ungainly melodic contour. Alternate leap direction or insert stepwise motion between leaps.',
          location: { measureIndex: c.measureIndex, beatPosition: c.beatPosition },
          affectedNotes: [a, b, c],
        });
      }
    }

    return violations;
  },
};

export const noThreeConsecutiveLeapsRule: Rule = {
  id: 'all-no-three-consecutive-leaps',
  name: 'No three consecutive leaps',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'Three or more consecutive leaps in any direction are forbidden',
  check: (context: RuleContext): Violation[] => {
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    if (pairs.length < 3) return [];

    const violations: Violation[] = [];

    for (let i = 2; i < pairs.length; i++) {
      const { prev: a, curr: b } = pairs[i - 2];
      const { curr: c } = pairs[i - 1];
      const { curr: d } = pairs[i];

      if (isLeap(a, b) && isLeap(b, c) && isLeap(c, d)) {
        violations.push({
          ruleId: 'all-no-three-consecutive-leaps',
          ruleName: 'No three consecutive leaps',
          severity: 'error',
          message: `Three consecutive leaps ending at measure ${d.measureIndex + 1}`,
          educationalMessage: 'Three or more leaps in a row make the melody impossible to follow. Return to stepwise motion after at most two leaps.',
          location: { measureIndex: d.measureIndex, beatPosition: d.beatPosition },
          affectedNotes: [a, b, c, d],
        });
      }
    }

    return violations;
  },
};

export const singleClimaxRule: Rule = {
  id: 'all-single-climax',
  name: 'Counterpoint should have a single climax',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The highest pitch in the counterpoint should appear exactly once',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 3) return [];

    const maxMidi = Math.max(...cp.map(n => n.midiNumber));
    const climaxNotes = cp.filter(n => n.midiNumber === maxMidi);

    if (climaxNotes.length > 1) {
      return [{
        ruleId: 'all-single-climax',
        ruleName: 'Counterpoint should have a single climax',
        severity: 'warning',
        message: `The highest note (${climaxNotes[0].pitch}) appears ${climaxNotes.length} times`,
        educationalMessage: 'A well-shaped counterpoint has a single melodic climax — one unique highest point. Repeating the climax dilutes its impact.',
        location: { measureIndex: climaxNotes[0].measureIndex },
        affectedNotes: climaxNotes,
      }];
    }

    return [];
  },
};

export const singleNadirRule: Rule = {
  id: 'all-single-nadir',
  name: 'Counterpoint should have a single nadir',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The lowest pitch in the counterpoint should appear exactly once',
  check: (context: RuleContext): Violation[] => {
    const cp = context.counterpoint;
    if (cp.length < 3) return [];

    const minMidi = Math.min(...cp.map(n => n.midiNumber));
    const nadirNotes = cp.filter(n => n.midiNumber === minMidi);

    if (nadirNotes.length > 1) {
      return [{
        ruleId: 'all-single-nadir',
        ruleName: 'Counterpoint should have a single nadir',
        severity: 'warning',
        message: `The lowest note (${nadirNotes[0].pitch}) appears ${nadirNotes.length} times`,
        educationalMessage: 'A well-shaped counterpoint has a single melodic low point. Repeating the nadir flattens the melodic contour.',
        location: { measureIndex: nadirNotes[0].measureIndex },
        affectedNotes: nadirNotes,
      }];
    }

    return [];
  },
};

export const noLeapToOffbeatDissonanceRule: Rule = {
  id: 's2s3s5-no-leap-to-offbeat-dissonance',
  name: 'Dissonant off-beat must be approached by step',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'A dissonant note on an off-beat must never be reached by leap',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      if (curr.beatPosition === 0) continue; // only off-beat

      const cfNote = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, curr);
      if (!isDissonant(interval)) continue;

      if (isLeap(prev, curr)) {
        violations.push({
          ruleId: 's2s3s5-no-leap-to-offbeat-dissonance',
          ruleName: 'Dissonant off-beat must be approached by step',
          severity: 'error',
          message: `Leap to dissonant off-beat at measure ${curr.measureIndex + 1}, beat ${curr.beatPosition + 1}`,
          educationalMessage: 'Dissonances on off-beats must always be approached by stepwise motion. A leap to a dissonance violates the fundamental rules of dissonance treatment.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [prev, curr],
        });
      }
    }

    return violations;
  },
};

export const noLargeLeapAfterOffbeatDissonanceRule: Rule = {
  id: 's3-no-large-leap-after-offbeat-dissonance',
  name: 'Must leave off-beat dissonance by step in same direction',
  severity: 'error',
  species: [Species.Third],
  description: 'In Third Species, the note after an off-beat dissonance must continue stepwise in the same direction',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (let i = 0; i < pairs.length - 1; i++) {
      const { prev, curr } = pairs[i];
      const { curr: next } = pairs[i + 1];

      if (curr.beatPosition === 0) continue; // only off-beat dissonances

      const cfNote = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, curr);
      if (!isDissonant(interval)) continue;

      // The departure must be stepwise in the same direction as the approach
      const approachDir = Math.sign(curr.midiNumber - prev.midiNumber);
      const departDir = Math.sign(next.midiNumber - curr.midiNumber);

      if (!isStepwiseMotion(curr, next) || departDir !== approachDir) {
        violations.push({
          ruleId: 's3-no-large-leap-after-offbeat-dissonance',
          ruleName: 'Must leave off-beat dissonance by step in same direction',
          severity: 'error',
          message: `Off-beat dissonance at measure ${curr.measureIndex + 1}, beat ${curr.beatPosition + 1} not left by step in same direction`,
          educationalMessage: 'In Third Species, a dissonant passing tone must continue stepwise in the same direction it was approached from. Changing direction or leaping breaks the passing-tone pattern.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [prev, curr, next],
        });
      }
    }

    return violations;
  },
};

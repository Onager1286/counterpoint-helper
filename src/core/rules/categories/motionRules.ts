import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getAllMotions } from '../helpers/motionHelpers';
import { getConsecutiveNotePairs, getIntervalBetweenNotes } from '../helpers/beatHelpers';

export const noParallelFifthsRule: Rule = {
  id: 'species1-no-parallel-fifths',
  name: 'No parallel perfect fifths',
  severity: 'error',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Parallel perfect fifths are forbidden',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const motion of motions) {
      const isParallelFifth =
        motion.type === 'parallel' &&
        motion.intervalBefore.degree === 5 &&
        motion.intervalBefore.quality === 'perfect' &&
        motion.intervalAfter.degree === 5 &&
        motion.intervalAfter.quality === 'perfect';

      if (isParallelFifth) {
        violations.push({
          ruleId: 'species1-no-parallel-fifths',
          ruleName: 'No parallel perfect fifths',
          severity: 'error',
          message: `Parallel fifths between measures ${motion.voice1From.measureIndex + 1}-${motion.voice1To.measureIndex + 1}`,
          educationalMessage: 'Parallel perfect fifths create a hollow sound and destroy melodic independence. Use contrary or oblique motion instead.',
          location: { measureIndex: motion.voice1To.measureIndex },
          affectedNotes: [motion.voice1From, motion.voice1To, motion.voice2From, motion.voice2To],
        });
      }
    }

    return violations;
  },
};

export const noParallelOctavesRule: Rule = {
  id: 'species1-no-parallel-octaves',
  name: 'No parallel perfect octaves',
  severity: 'error',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Parallel perfect octaves are forbidden',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const motion of motions) {
      const isParallelOctave =
        motion.type === 'parallel' &&
        motion.intervalBefore.degree === 8 &&
        motion.intervalBefore.quality === 'perfect' &&
        motion.intervalAfter.degree === 8 &&
        motion.intervalAfter.quality === 'perfect';

      if (isParallelOctave) {
        violations.push({
          ruleId: 'species1-no-parallel-octaves',
          ruleName: 'No parallel perfect octaves',
          severity: 'error',
          message: `Parallel octaves between measures ${motion.voice1From.measureIndex + 1}-${motion.voice1To.measureIndex + 1}`,
          educationalMessage: 'Parallel octaves eliminate the sense of two independent voices.',
          location: { measureIndex: motion.voice1To.measureIndex },
          affectedNotes: [motion.voice1From, motion.voice1To, motion.voice2From, motion.voice2To],
        });
      }
    }

    return violations;
  },
};

export const noDirectFifthsRule: Rule = {
  id: 'species1-no-direct-fifths',
  name: 'Avoid direct fifths',
  severity: 'warning',
  species: [Species.First],
  description: 'Approaching perfect fifth by similar motion is discouraged',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const motion of motions) {
      const isDirectFifth =
        motion.type === 'similar' &&
        motion.intervalAfter.degree === 5 &&
        motion.intervalAfter.quality === 'perfect';

      if (isDirectFifth) {
        violations.push({
          ruleId: 'species1-no-direct-fifths',
          ruleName: 'Avoid direct fifths',
          severity: 'warning',
          message: `Direct fifth at measure ${motion.voice1To.measureIndex + 1}`,
          educationalMessage: 'Direct (hidden) fifths can sound awkward. Prefer contrary or oblique motion when approaching perfect consonances.',
          location: { measureIndex: motion.voice1To.measureIndex },
          affectedNotes: [motion.voice1From, motion.voice1To, motion.voice2From, motion.voice2To],
        });
      }
    }

    return violations;
  },
};

export const noDirectOctavesRule: Rule = {
  id: 'species1-no-direct-octaves',
  name: 'Avoid direct octaves',
  severity: 'warning',
  species: [Species.First],
  description: 'Approaching octave by similar motion is discouraged',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const motion of motions) {
      const isDirectOctave =
        motion.type === 'similar' &&
        motion.intervalAfter.degree === 8 &&
        motion.intervalAfter.quality === 'perfect';

      if (isDirectOctave) {
        violations.push({
          ruleId: 'species1-no-direct-octaves',
          ruleName: 'Avoid direct octaves',
          severity: 'warning',
          message: `Direct octave at measure ${motion.voice1To.measureIndex + 1}`,
          educationalMessage: 'Direct octaves weaken voice independence, especially when the upper voice leaps.',
          location: { measureIndex: motion.voice1To.measureIndex },
          affectedNotes: [motion.voice1From, motion.voice1To, motion.voice2From, motion.voice2To],
        });
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// Beat-aware motion rules (Species II-V)
// ---------------------------------------------------------------------------

/**
 * Helper: check consecutive CP note pairs for parallel perfect intervals
 * against the sounding CF note at each CP note's measure.
 */
function findOffbeatParallels(
  context: RuleContext,
  targetDegree: number
): Array<{ prev: { note: import('../../types/music.types').Note }; curr: { note: import('../../types/music.types').Note }; cfPrev: import('../../types/music.types').Note; cfCurr: import('../../types/music.types').Note }> {
  const cf = context.cantusFirmus;
  const pairs = getConsecutiveNotePairs(context.counterpoint);
  const results: ReturnType<typeof findOffbeatParallels> = [];

  for (const { prev, curr } of pairs) {
    // Skip if this is a downbeat-to-downbeat pair (already caught by existing rules)
    if (prev.beatPosition === 0 && curr.beatPosition === 0) continue;

    const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
    const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
    if (!cfPrev || !cfCurr) continue;

    const intervalPrev = getIntervalBetweenNotes(cfPrev, prev);
    const intervalCurr = getIntervalBetweenNotes(cfCurr, curr);

    if (
      intervalPrev.degree === targetDegree && intervalPrev.quality === 'perfect' &&
      intervalCurr.degree === targetDegree && intervalCurr.quality === 'perfect'
    ) {
      results.push({ prev: { note: prev }, curr: { note: curr }, cfPrev, cfCurr });
    }
  }

  return results;
}

export const noParallelFifthsOffbeatRule: Rule = {
  id: 's2s3s5-no-parallel-fifths-offbeat',
  name: 'No parallel fifths (including off-beat)',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'Parallel perfect fifths between any two consecutive notes (including off-beat) are forbidden',
  check: (context: RuleContext): Violation[] => {
    const hits = findOffbeatParallels(context, 5);
    return hits.map(h => ({
      ruleId: 's2s3s5-no-parallel-fifths-offbeat',
      ruleName: 'No parallel fifths (including off-beat)',
      severity: 'error' as const,
      message: `Parallel fifths: measure ${h.prev.note.measureIndex + 1} beat ${h.prev.note.beatPosition + 1} → measure ${h.curr.note.measureIndex + 1} beat ${h.curr.note.beatPosition + 1}`,
      educationalMessage: 'Parallel fifths are forbidden between any two consecutive notes, not just downbeats. The rule applies to all note-to-note motion in the counterpoint.',
      location: { measureIndex: h.curr.note.measureIndex, beatPosition: h.curr.note.beatPosition },
      affectedNotes: [h.cfPrev, h.prev.note, h.cfCurr, h.curr.note],
    }));
  },
};

export const noParallelOctavesOffbeatRule: Rule = {
  id: 's2s3s5-no-parallel-octaves-offbeat',
  name: 'No parallel octaves (including off-beat)',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'Parallel perfect octaves between any two consecutive notes (including off-beat) are forbidden',
  check: (context: RuleContext): Violation[] => {
    const hits = findOffbeatParallels(context, 8);
    return hits.map(h => ({
      ruleId: 's2s3s5-no-parallel-octaves-offbeat',
      ruleName: 'No parallel octaves (including off-beat)',
      severity: 'error' as const,
      message: `Parallel octaves: measure ${h.prev.note.measureIndex + 1} beat ${h.prev.note.beatPosition + 1} → measure ${h.curr.note.measureIndex + 1} beat ${h.curr.note.beatPosition + 1}`,
      educationalMessage: 'Parallel octaves are forbidden between any two consecutive notes. Even off-beat to downbeat motion must avoid parallel octaves.',
      location: { measureIndex: h.curr.note.measureIndex, beatPosition: h.curr.note.beatPosition },
      affectedNotes: [h.cfPrev, h.prev.note, h.cfCurr, h.curr.note],
    }));
  },
};

export const noVoiceCrossingConsecutiveRule: Rule = {
  id: 'all-no-voice-crossing-consecutive',
  name: 'No voice crossing between consecutive beats',
  severity: 'error',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'The counterpoint must not cross the cantus firmus between any two consecutive notes',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfPrev || !cfCurr) continue;

      const signPrev = Math.sign(prev.midiNumber - cfPrev.midiNumber);
      const signCurr = Math.sign(curr.midiNumber - cfCurr.midiNumber);

      // Crossing: sign flips and neither is 0 (unison)
      if (signPrev !== 0 && signCurr !== 0 && signPrev !== signCurr) {
        violations.push({
          ruleId: 'all-no-voice-crossing-consecutive',
          ruleName: 'No voice crossing between consecutive beats',
          severity: 'error',
          message: `Voice crossing at measure ${curr.measureIndex + 1}, beat ${curr.beatPosition + 1}`,
          educationalMessage: 'The two voices must maintain their relative position (counterpoint above or below the cantus firmus). Crossing destroys voice independence.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [cfPrev, prev, cfCurr, curr],
        });
      }
    }

    return violations;
  },
};

export const noSimilarMotionToUnisonRule: Rule = {
  id: 'all-no-similar-motion-to-unison',
  name: 'Avoid approaching unison by similar motion',
  severity: 'warning',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Unisons should be reached by contrary or oblique motion, not similar motion',
  check: (context: RuleContext): Violation[] => {
    const motions = getAllMotions(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const motion of motions) {
      if (motion.type === 'similar' && motion.intervalAfter.degree === 1 && motion.intervalAfter.quality === 'perfect') {
        violations.push({
          ruleId: 'all-no-similar-motion-to-unison',
          ruleName: 'Avoid approaching unison by similar motion',
          severity: 'warning',
          message: `Unison approached by similar motion at measure ${motion.voice1To.measureIndex + 1}`,
          educationalMessage: 'Reaching a unison by similar motion weakens the sense of two independent voices. Use contrary or oblique motion to arrive at unisons.',
          location: { measureIndex: motion.voice1To.measureIndex },
          affectedNotes: [motion.voice1From, motion.voice1To, motion.voice2From, motion.voice2To],
        });
      }
    }

    return violations;
  },
};

/**
 * Helper: find "leapfrog" parallels — two consecutive CP notes each forming
 * the same perfect interval with their respective CF notes.
 * This catches disguised parallels that the downbeat-only check misses.
 */
function findLeapfrogParallels(context: RuleContext, targetDegree: number): Array<{ prev: import('../../types/music.types').Note; curr: import('../../types/music.types').Note }> {
  const cf = context.cantusFirmus;
  const pairs = getConsecutiveNotePairs(context.counterpoint);
  const results: Array<{ prev: import('../../types/music.types').Note; curr: import('../../types/music.types').Note }> = [];

  for (const { prev, curr } of pairs) {
    const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
    const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
    if (!cfPrev || !cfCurr) continue;
    // Only interesting when CF actually moves
    if (cfPrev.midiNumber === cfCurr.midiNumber) continue;

    const iPrev = getIntervalBetweenNotes(cfPrev, prev);
    const iCurr = getIntervalBetweenNotes(cfCurr, curr);

    if (
      iPrev.degree === targetDegree && iPrev.quality === 'perfect' &&
      iCurr.degree === targetDegree && iCurr.quality === 'perfect'
    ) {
      results.push({ prev, curr });
    }
  }

  return results;
}

export const noLeapfrogFifthsRule: Rule = {
  id: 's2s3-no-leapfrog-fifths',
  name: 'No disguised parallel fifths',
  severity: 'error',
  species: [Species.Second, Species.Third],
  description: 'Two consecutive counterpoint notes each forming a P5 with the CF constitute disguised parallel fifths',
  check: (context: RuleContext): Violation[] => {
    const hits = findLeapfrogParallels(context, 5);
    return hits.map(h => ({
      ruleId: 's2s3-no-leapfrog-fifths',
      ruleName: 'No disguised parallel fifths',
      severity: 'error' as const,
      message: `Disguised parallel fifths: measure ${h.prev.measureIndex + 1} beat ${h.prev.beatPosition + 1} → measure ${h.curr.measureIndex + 1} beat ${h.curr.beatPosition + 1}`,
      educationalMessage: 'Even when the counterpoint leaps, consecutive perfect fifths against the cantus firmus are heard as parallel fifths and are forbidden.',
      location: { measureIndex: h.curr.measureIndex, beatPosition: h.curr.beatPosition },
      affectedNotes: [h.prev, h.curr],
    }));
  },
};

export const noLeapfrogOctavesRule: Rule = {
  id: 's2s3-no-leapfrog-octaves',
  name: 'No disguised parallel octaves',
  severity: 'error',
  species: [Species.Second, Species.Third],
  description: 'Two consecutive counterpoint notes each forming a P8 with the CF constitute disguised parallel octaves',
  check: (context: RuleContext): Violation[] => {
    const hits = findLeapfrogParallels(context, 8);
    return hits.map(h => ({
      ruleId: 's2s3-no-leapfrog-octaves',
      ruleName: 'No disguised parallel octaves',
      severity: 'error' as const,
      message: `Disguised parallel octaves: measure ${h.prev.measureIndex + 1} beat ${h.prev.beatPosition + 1} → measure ${h.curr.measureIndex + 1} beat ${h.curr.beatPosition + 1}`,
      educationalMessage: 'Consecutive octaves against the cantus firmus — even with a leap in between — are heard as parallel octaves and are forbidden.',
      location: { measureIndex: h.curr.measureIndex, beatPosition: h.curr.beatPosition },
      affectedNotes: [h.prev, h.curr],
    }));
  },
};

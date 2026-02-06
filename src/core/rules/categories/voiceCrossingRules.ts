import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getConsecutiveNotePairs, getIntervalBetweenNotes } from '../helpers/beatHelpers';
import { isPerfectConsonance, isImperfectConsonance } from '../../models/Interval';

const ALL_SPECIES = [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth];

// ---------------------------------------------------------------------------
// Voice crossing & spacing
// ---------------------------------------------------------------------------

export const noVoiceCrossingRule: Rule = {
  id: 'all-no-voice-crossing',
  name: 'No voice crossing',
  severity: 'error',
  species: ALL_SPECIES,
  description: 'The counterpoint must stay on the same side of the cantus firmus throughout',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    if (sorted.length < 2) return [];

    // Determine the initial side (above or below)
    const cfFirst = cf.find(n => n.measureIndex === sorted[0].measureIndex);
    if (!cfFirst) return [];

    const initialSign = Math.sign(sorted[0].midiNumber - cfFirst.midiNumber);
    if (initialSign === 0) {
      // Started on unison — use the second note to determine side, if available
      // If we never establish a side, we can't check crossing
    }

    const violations: Violation[] = [];
    let lastSign = initialSign;

    for (let i = 1; i < sorted.length; i++) {
      const note = sorted[i];
      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const sign = Math.sign(note.midiNumber - cfNote.midiNumber);

      if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
        violations.push({
          ruleId: 'all-no-voice-crossing',
          ruleName: 'No voice crossing',
          severity: 'error',
          message: `Voice crossing at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1}`,
          educationalMessage: 'The counterpoint and cantus firmus must maintain their relative position — if the counterpoint starts above the CF, it must stay above (or reach unison). Crossing destroys the identity of the two voices.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [cfNote, note],
        });
      }

      if (sign !== 0) lastSign = sign;
    }

    return violations;
  },
};

export const noConsecutiveUnisonsRule: Rule = {
  id: 'all-no-voice-touching-consecutively',
  name: 'Avoid consecutive unisons',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'Two consecutive unisons between counterpoint and cantus firmus are discouraged',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfPrev || !cfCurr) continue;

      const iPrev = getIntervalBetweenNotes(cfPrev, prev);
      const iCurr = getIntervalBetweenNotes(cfCurr, curr);

      if (iPrev.degree === 1 && iPrev.quality === 'perfect' &&
          iCurr.degree === 1 && iCurr.quality === 'perfect') {
        violations.push({
          ruleId: 'all-no-voice-touching-consecutively',
          ruleName: 'Avoid consecutive unisons',
          severity: 'warning',
          message: `Consecutive unisons at measure ${curr.measureIndex + 1}`,
          educationalMessage: 'Two unisons in a row collapse the two voices into one. A single unison is acceptable, but sustained unison contact destroys the sense of two independent melodic lines.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [cfPrev, prev, cfCurr, curr],
        });
      }
    }

    return violations;
  },
};

export const spacingNotTooWideRule: Rule = {
  id: 'all-spacing-not-too-wide',
  name: 'Voices must not be more than two octaves apart',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'The vertical distance between counterpoint and cantus firmus must not exceed 24 semitones',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const violations: Violation[] = [];

    for (const cpNote of context.counterpoint) {
      const cfNote = cf.find(n => n.measureIndex === cpNote.measureIndex);
      if (!cfNote) continue;

      const distance = Math.abs(cpNote.midiNumber - cfNote.midiNumber);
      if (distance > 24) {
        violations.push({
          ruleId: 'all-spacing-not-too-wide',
          ruleName: 'Voices must not be more than two octaves apart',
          severity: 'warning',
          message: `Spacing of ${distance} semitones at measure ${cpNote.measureIndex + 1}, beat ${cpNote.beatPosition + 1}`,
          educationalMessage: 'Voices more than two octaves apart become difficult to hear as two related melodic lines. Keep the spacing within two octaves for clarity.',
          location: { measureIndex: cpNote.measureIndex, beatPosition: cpNote.beatPosition },
          affectedNotes: [cfNote, cpNote],
        });
      }
    }

    return violations;
  },
};

export const noUnisonAfterCrossingAttemptRule: Rule = {
  id: 's2s3s5-no-unison-on-offbeat-after-crossing-attempt',
  name: 'Off-beat unison does not excuse a directional flip',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'If the counterpoint reaches unison on an off-beat but the voices were on opposite sides, this is a sneak crossing',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      if (curr.beatPosition === 0) continue; // only off-beat unisons

      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfPrev || !cfCurr) continue;

      const signPrev = Math.sign(prev.midiNumber - cfPrev.midiNumber);
      const signCurr = Math.sign(curr.midiNumber - cfCurr.midiNumber);

      // Unison on off-beat (signCurr === 0) when previous was on a definite side
      if (signCurr === 0 && signPrev !== 0) {
        // Check if the next note after the unison goes to the opposite side
        // This makes it a "sneak crossing" through the unison
        const sorted = [...context.counterpoint].sort((a, b) => {
          if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
          return a.beatPosition - b.beatPosition;
        });
        const sortedIdx = sorted.indexOf(curr);

        if (sortedIdx < sorted.length - 1) {
          const next = sorted[sortedIdx + 1];
          const cfNext = cf.find(n => n.measureIndex === next.measureIndex);
          if (cfNext) {
            const signNext = Math.sign(next.midiNumber - cfNext.midiNumber);
            if (signNext !== 0 && signNext !== signPrev) {
              violations.push({
                ruleId: 's2s3s5-no-unison-on-offbeat-after-crossing-attempt',
                ruleName: 'Off-beat unison does not excuse a directional flip',
                severity: 'error',
                message: `Voice crossing via off-beat unison at measure ${curr.measureIndex + 1}, beat ${curr.beatPosition + 1}`,
                educationalMessage: 'Passing through a unison on an off-beat does not make a voice crossing legal. The voices must maintain their relative position throughout the piece.',
                location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
                affectedNotes: [cfPrev, prev, cfCurr, curr],
              });
            }
          }
        }
      }
    }

    return violations;
  },
};

// ---------------------------------------------------------------------------
// Harmonic texture rules
// ---------------------------------------------------------------------------

export const avoidParallelImperfectToPerfectRule: Rule = {
  id: 'all-avoid-parallel-imperfect-to-perfect',
  name: 'Avoid similar motion from imperfect to perfect consonance',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'Moving by similar motion from consecutive imperfect consonances into a perfect consonance weakens the perfect',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfPrev || !cfCurr) continue;

      const iPrev = getIntervalBetweenNotes(cfPrev, prev);
      const iCurr = getIntervalBetweenNotes(cfCurr, curr);

      if (!isImperfectConsonance(iPrev) || !isPerfectConsonance(iCurr)) continue;

      // Check similar motion: both voices move in same direction
      const cfDir = Math.sign(cfCurr.midiNumber - cfPrev.midiNumber);
      const cpDir = Math.sign(curr.midiNumber - prev.midiNumber);

      if (cfDir !== 0 && cfDir === cpDir) {
        violations.push({
          ruleId: 'all-avoid-parallel-imperfect-to-perfect',
          ruleName: 'Avoid similar motion from imperfect to perfect consonance',
          severity: 'warning',
          message: `Similar motion to ${iCurr.quality} ${iCurr.degree} at measure ${curr.measureIndex + 1}`,
          educationalMessage: 'Approaching a perfect consonance by similar motion from imperfect consonances weakens the stability of the perfect interval. Use contrary or oblique motion to reach perfects.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [cfPrev, prev, cfCurr, curr],
        });
      }
    }

    return violations;
  },
};

export const avoidConsecutivePerfectsSameRule: Rule = {
  id: 'all-avoid-consecutive-perfects-same',
  name: 'Avoid two identical perfect consonances in a row',
  severity: 'warning',
  species: ALL_SPECIES,
  description: 'Two consecutive perfect consonances of the same type create a monotonous texture',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const pairs = getConsecutiveNotePairs(context.counterpoint);
    const violations: Violation[] = [];

    for (const { prev, curr } of pairs) {
      const cfPrev = cf.find(n => n.measureIndex === prev.measureIndex);
      const cfCurr = cf.find(n => n.measureIndex === curr.measureIndex);
      if (!cfPrev || !cfCurr) continue;

      const iPrev = getIntervalBetweenNotes(cfPrev, prev);
      const iCurr = getIntervalBetweenNotes(cfCurr, curr);

      // Both must be perfect consonances of the same degree
      if (
        isPerfectConsonance(iPrev) && isPerfectConsonance(iCurr) &&
        iPrev.degree === iCurr.degree
      ) {
        // Skip unisons — those are handled by the consecutive-unisons rule
        if (iPrev.degree === 1) continue;

        violations.push({
          ruleId: 'all-avoid-consecutive-perfects-same',
          ruleName: 'Avoid two identical perfect consonances in a row',
          severity: 'warning',
          message: `Two consecutive perfect ${iPrev.degree === 5 ? 'fifths' : 'octaves'} at measure ${curr.measureIndex + 1}`,
          educationalMessage: 'Two identical perfect consonances in a row (even by contrary motion) creates a hollow, monotonous texture. Insert an imperfect consonance between them for richer sound.',
          location: { measureIndex: curr.measureIndex, beatPosition: curr.beatPosition },
          affectedNotes: [cfPrev, prev, cfCurr, curr],
        });
      }
    }

    return violations;
  },
};

export const noDoubleNeighborRule: Rule = {
  id: 's2s3s5-no-double-neighbor',
  name: 'No double-neighbor figure',
  severity: 'warning',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'Upper-neighbor then lower-neighbor (or vice versa) around the same consonance is a pointless oscillation',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const sorted = [...context.counterpoint].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    if (sorted.length < 5) return [];

    const violations: Violation[] = [];

    // Pattern: C D C E C  where C=consonance, D=upper neighbor diss, E=lower neighbor diss
    // (or the mirror: C E C D C)
    for (let i = 0; i < sorted.length - 4; i++) {
      const [a, b, c, d, e] = [sorted[i], sorted[i+1], sorted[i+2], sorted[i+3], sorted[i+4]];

      // a, c, e must be the same pitch (the consonance hub)
      if (a.midiNumber !== c.midiNumber || c.midiNumber !== e.midiNumber) continue;

      // b and d must be different (one above, one below)
      if (b.midiNumber === d.midiNumber) continue;
      const bIsAbove = b.midiNumber > a.midiNumber;
      const dIsAbove = d.midiNumber > c.midiNumber;
      if (bIsAbove === dIsAbove) continue; // both same side — not a double neighbor

      // b and d must both be dissonant
      const cfB = cf.find(n => n.measureIndex === b.measureIndex);
      const cfD = cf.find(n => n.measureIndex === d.measureIndex);
      if (!cfB || !cfD) continue;

      const iB = getIntervalBetweenNotes(cfB, b);
      const iD = getIntervalBetweenNotes(cfD, d);

      if (iB.isConsonant || iD.isConsonant) continue; // both must be dissonant

      violations.push({
        ruleId: 's2s3s5-no-double-neighbor',
        ruleName: 'No double-neighbor figure',
        severity: 'warning',
        message: `Double-neighbor figure around ${a.pitch} at measure ${a.measureIndex + 1}`,
        educationalMessage: 'A double neighbor — stepping to both sides of a consonant note with dissonant neighbors — creates a pointless oscillation. Choose one neighbor direction or use other melodic motion.',
        location: { measureIndex: b.measureIndex, beatPosition: b.beatPosition },
        affectedNotes: [a, b, c, d, e],
      });
    }

    return violations;
  },
};
import { Rule, RuleContext, Violation } from '../../types/analysis.types';
import { Species } from '../../types/species.types';
import { getAllVerticalIntervals, getVerticalInterval, getDownbeatIntervals } from '../helpers/intervalHelpers';
import { getFirstCounterpointNote, getLastCounterpointNote } from '../helpers/contextHelpers';
import { getNotesAtMeasure, getIntervalBetweenNotes } from '../helpers/beatHelpers';
import { isTritone, isTiedPair } from '../helpers/scaleHelpers';

export const consonanceRule: Rule = {
  id: 'species1-consonance',
  name: 'All intervals must be consonant',
  severity: 'error',
  species: [Species.First],
  description: 'Every vertical interval must be consonant in first species',
  check: (context: RuleContext): Violation[] => {
    const intervals = getAllVerticalIntervals(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const { measureIndex, interval } of intervals) {
      if (!interval.isConsonant) {
        violations.push({
          ruleId: 'species1-consonance',
          ruleName: 'All intervals must be consonant',
          severity: 'error',
          message: `Dissonant ${interval.quality} ${interval.degree} at measure ${measureIndex + 1}`,
          educationalMessage: 'First species counterpoint uses only consonant intervals: unisons, thirds, fifths, sixths, and octaves. Avoid seconds, fourths, sevenths, and tritones.',
          location: { measureIndex },
          affectedNotes: [
            context.cantusFirmus.find(n => n.measureIndex === measureIndex)!,
            context.counterpoint.find(n => n.measureIndex === measureIndex)!,
          ],
        });
      }
    }

    return violations;
  },
};

export const firstIntervalRule: Rule = {
  id: 'species1-first-interval',
  name: 'First interval must be unison or octave',
  severity: 'error',
  species: [Species.First],
  description: 'Opening interval must be P1 or P8',
  check: (context: RuleContext): Violation[] => {
    const firstCP = getFirstCounterpointNote(context);
    if (!firstCP) return []; // No notes yet

    const interval = getVerticalInterval(context.cantusFirmus, context.counterpoint, 0);
    if (!interval) return [];

    const isPerfectConsonance =
      (interval.degree === 1 && interval.quality === 'perfect') ||
      (interval.degree === 8 && interval.quality === 'perfect');

    if (!isPerfectConsonance) {
      return [{
        ruleId: 'species1-first-interval',
        ruleName: 'First interval must be unison or octave',
        severity: 'error',
        message: 'First note must form a unison or octave with cantus firmus',
        educationalMessage: 'Fux requires first species counterpoint to begin on the tonic, forming a perfect consonance (unison or octave) with the cantus firmus.',
        location: { measureIndex: 0 },
        affectedNotes: [context.cantusFirmus[0], firstCP],
      }];
    }

    return [];
  },
};

export const lastIntervalRule: Rule = {
  id: 'species1-last-interval',
  name: 'Final interval must be unison or octave',
  severity: 'error',
  species: [Species.First],
  description: 'Closing interval must be P1 or P8',
  check: (context: RuleContext): Violation[] => {
    const lastCP = getLastCounterpointNote(context);
    if (!lastCP) return [];

    const lastCF = context.cantusFirmus[context.cantusFirmus.length - 1];
    const interval = getVerticalInterval(
      context.cantusFirmus,
      context.counterpoint,
      lastCF.measureIndex
    );

    if (!interval) return [];

    const isPerfectConsonance =
      (interval.degree === 1 && interval.quality === 'perfect') ||
      (interval.degree === 8 && interval.quality === 'perfect');

    if (!isPerfectConsonance) {
      return [{
        ruleId: 'species1-last-interval',
        ruleName: 'Final interval must be unison or octave',
        severity: 'error',
        message: 'Final note must form a unison or octave with cantus firmus',
        educationalMessage: 'Counterpoint must end on the tonic for harmonic closure, forming a perfect consonance with the cantus firmus.',
        location: { measureIndex: lastCF.measureIndex },
        affectedNotes: [lastCF, lastCP],
      }];
    }

    return [];
  },
};

// ---------------------------------------------------------------------------
// Species II-V interval rules
// ---------------------------------------------------------------------------

export const downbeatConsonanceRule: Rule = {
  id: 's2s3s5-downbeat-consonance',
  name: 'Downbeat must be consonant',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'The downbeat (beat 0) of every measure must be consonant with the cantus firmus',
  check: (context: RuleContext): Violation[] => {
    const intervals = getDownbeatIntervals(context.cantusFirmus, context.counterpoint);
    const violations: Violation[] = [];

    for (const { measureIndex, interval } of intervals) {
      if (!interval.isConsonant) {
        const cfNote = context.cantusFirmus.find(n => n.measureIndex === measureIndex)!;
        const cpNote = context.counterpoint.find(n => n.measureIndex === measureIndex && n.beatPosition === 0)!;
        violations.push({
          ruleId: 's2s3s5-downbeat-consonance',
          ruleName: 'Downbeat must be consonant',
          severity: 'error',
          message: `Dissonant ${interval.quality} ${interval.degree} on downbeat of measure ${measureIndex + 1}`,
          educationalMessage: 'In Species II, III, and V the strong beat (downbeat) must always be consonant. Off-beat dissonances are allowed only if properly treated as passing tones or neighbors.',
          location: { measureIndex, beatPosition: 0 },
          affectedNotes: [cfNote, cpNote],
        });
      }
    }

    return violations;
  },
};

export const noTritonHarmonicRule: Rule = {
  id: 'all-no-tritone-harmonic',
  name: 'No vertical tritone',
  severity: 'error',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'A tritone (augmented 4th / diminished 5th) must never appear as a vertical interval',
  check: (context: RuleContext): Violation[] => {
    const violations: Violation[] = [];
    const cf = context.cantusFirmus;

    for (const cpNote of context.counterpoint) {
      const cfNote = cf.find(n => n.measureIndex === cpNote.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, cpNote);
      if (isTritone(interval)) {
        violations.push({
          ruleId: 'all-no-tritone-harmonic',
          ruleName: 'No vertical tritone',
          severity: 'error',
          message: `Tritone (${interval.quality} ${interval.degree}) at measure ${cpNote.measureIndex + 1}, beat ${cpNote.beatPosition + 1}`,
          educationalMessage: 'The tritone is the most dissonant interval in strict counterpoint and is never permitted as a vertical sonority in any species.',
          location: { measureIndex: cpNote.measureIndex, beatPosition: cpNote.beatPosition },
          affectedNotes: [cfNote, cpNote],
        });
      }
    }

    return violations;
  },
};

export const noAugmentedDiminishedIntervalsRule: Rule = {
  id: 'all-no-augmented-diminished-intervals',
  name: 'No augmented or diminished intervals',
  severity: 'error',
  species: [Species.First, Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'Augmented and diminished vertical intervals are forbidden',
  check: (context: RuleContext): Violation[] => {
    const violations: Violation[] = [];
    const cf = context.cantusFirmus;

    for (const cpNote of context.counterpoint) {
      const cfNote = cf.find(n => n.measureIndex === cpNote.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, cpNote);
      if (interval.quality === 'augmented' || interval.quality === 'diminished') {
        violations.push({
          ruleId: 'all-no-augmented-diminished-intervals',
          ruleName: 'No augmented or diminished intervals',
          severity: 'error',
          message: `${interval.quality} ${interval.degree} at measure ${cpNote.measureIndex + 1}, beat ${cpNote.beatPosition + 1}`,
          educationalMessage: 'Strict counterpoint permits only perfect, major, and minor intervals. Augmented and diminished intervals create instability that is not permitted in the Fux tradition.',
          location: { measureIndex: cpNote.measureIndex, beatPosition: cpNote.beatPosition },
          affectedNotes: [cfNote, cpNote],
        });
      }
    }

    return violations;
  },
};

export const penultimatBarConsonanceRule: Rule = {
  id: 's2s3s5-penultimate-bar-consonance',
  name: 'All notes in penultimate measure must be consonant',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fifth],
  description: 'Every note in the second-to-last measure must be consonant — no dissonance in the cadential approach',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    if (cf.length < 2) return [];

    const penultimateMeasure = cf[cf.length - 2].measureIndex;
    const cfNote = cf.find(n => n.measureIndex === penultimateMeasure);
    if (!cfNote) return [];

    const cpNotes = getNotesAtMeasure(context.counterpoint, penultimateMeasure);
    const violations: Violation[] = [];

    for (const cpNote of cpNotes) {
      const interval = getIntervalBetweenNotes(cfNote, cpNote);
      if (!interval.isConsonant) {
        violations.push({
          ruleId: 's2s3s5-penultimate-bar-consonance',
          ruleName: 'All notes in penultimate measure must be consonant',
          severity: 'error',
          message: `Dissonant ${interval.quality} ${interval.degree} in penultimate measure (measure ${penultimateMeasure + 1}), beat ${cpNote.beatPosition + 1}`,
          educationalMessage: 'The penultimate measure leads directly into the final cadence. All notes here must be consonant to prepare a clean resolution.',
          location: { measureIndex: penultimateMeasure, beatPosition: cpNote.beatPosition },
          affectedNotes: [cfNote, cpNote],
        });
      }
    }

    return violations;
  },
};

export const s4OffbeatConsonanceRule: Rule = {
  id: 's4-offbeat-consonance-required',
  name: 'Non-suspension off-beat notes must be consonant',
  severity: 'error',
  species: [Species.Fourth],
  description: 'In Fourth Species, off-beat notes that are not suspensions must be consonant',
  check: (context: RuleContext): Violation[] => {
    const cf = context.cantusFirmus;
    const cp = context.counterpoint;
    const violations: Violation[] = [];

    // Sort counterpoint by (measure, beat) to detect tied pairs
    const sorted = [...cp].sort((a, b) => {
      if (a.measureIndex !== b.measureIndex) return a.measureIndex - b.measureIndex;
      return a.beatPosition - b.beatPosition;
    });

    for (let i = 0; i < sorted.length; i++) {
      const note = sorted[i];
      if (note.beatPosition === 0) continue; // only check off-beat

      // Check if this off-beat note is the preparation half of a tied pair
      // (i.e. the next note is a tie continuation)
      const nextNote = sorted[i + 1] ?? null;
      if (nextNote && isTiedPair(note, nextNote, Species.Fourth)) {
        // This is a suspension preparation — skip the consonance check;
        // suspension rules handle it.
        continue;
      }

      const cfNote = cf.find(n => n.measureIndex === note.measureIndex);
      if (!cfNote) continue;

      const interval = getIntervalBetweenNotes(cfNote, note);
      if (!interval.isConsonant) {
        violations.push({
          ruleId: 's4-offbeat-consonance-required',
          ruleName: 'Non-suspension off-beat notes must be consonant',
          severity: 'error',
          message: `Dissonant off-beat note at measure ${note.measureIndex + 1}, beat ${note.beatPosition + 1} is not a suspension`,
          educationalMessage: 'In Fourth Species, dissonance is only permitted as a suspension (a note tied over from a consonant preparation). Off-beat notes that are not suspensions must be consonant.',
          location: { measureIndex: note.measureIndex, beatPosition: note.beatPosition },
          affectedNotes: [cfNote, note],
        });
      }
    }

    return violations;
  },
};

export const firstIntervalExpandedRule: Rule = {
  id: 'all-first-interval-expanded',
  name: 'Opening interval must be a perfect consonance',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'The opening interval in Species II-V must be P1, P5, or P8',
  check: (context: RuleContext): Violation[] => {
    const firstCP = getFirstCounterpointNote(context);
    if (!firstCP) return [];

    const interval = getVerticalInterval(context.cantusFirmus, context.counterpoint, 0);
    if (!interval) return [];

    const isPerfect =
      (interval.degree === 1 && interval.quality === 'perfect') ||
      (interval.degree === 5 && interval.quality === 'perfect') ||
      (interval.degree === 8 && interval.quality === 'perfect');

    if (!isPerfect) {
      return [{
        ruleId: 'all-first-interval-expanded',
        ruleName: 'Opening interval must be a perfect consonance',
        severity: 'error',
        message: 'Opening interval must be a unison, fifth, or octave',
        educationalMessage: 'Species II-V may begin on a perfect fifth in addition to the unison or octave allowed in first species. Any other opening interval is forbidden.',
        location: { measureIndex: 0 },
        affectedNotes: [context.cantusFirmus[0], firstCP],
      }];
    }

    return [];
  },
};

export const lastIntervalExpandedRule: Rule = {
  id: 'all-last-interval-expanded',
  name: 'Final interval must be unison or octave',
  severity: 'error',
  species: [Species.Second, Species.Third, Species.Fourth, Species.Fifth],
  description: 'The closing interval in Species II-V must be P1 or P8',
  check: (context: RuleContext): Violation[] => {
    const lastCP = getLastCounterpointNote(context);
    if (!lastCP) return [];

    const lastCF = context.cantusFirmus[context.cantusFirmus.length - 1];
    const interval = getVerticalInterval(
      context.cantusFirmus,
      context.counterpoint,
      lastCF.measureIndex
    );
    if (!interval) return [];

    const isPerfectUnisonOrOctave =
      (interval.degree === 1 && interval.quality === 'perfect') ||
      (interval.degree === 8 && interval.quality === 'perfect');

    if (!isPerfectUnisonOrOctave) {
      return [{
        ruleId: 'all-last-interval-expanded',
        ruleName: 'Final interval must be unison or octave',
        severity: 'error',
        message: 'Final note must form a unison or octave with the cantus firmus',
        educationalMessage: 'The final cadence must close on a perfect consonance of unison or octave for harmonic closure.',
        location: { measureIndex: lastCF.measureIndex },
        affectedNotes: [lastCF, lastCP],
      }];
    }

    return [];
  },
};

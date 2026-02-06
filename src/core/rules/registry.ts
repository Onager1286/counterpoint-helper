import { Rule } from '../types/analysis.types';
import { Species } from '../types/species.types';
import * as intervalRules from './categories/intervalRules';
import * as motionRules from './categories/motionRules';
import * as melodicRules from './categories/melodicRules';
import * as dissonanceTreatmentRules from './categories/dissonanceTreatmentRules';
import * as cadenceRules from './categories/cadenceRules';
import * as voiceCrossingRules from './categories/voiceCrossingRules';

/**
 * Export all rules as flat array.
 */
export const ALL_RULES: Rule[] = [
  // --- Interval rules (existing) ---
  intervalRules.consonanceRule,
  intervalRules.firstIntervalRule,
  intervalRules.lastIntervalRule,
  // --- Interval rules (new) ---
  intervalRules.downbeatConsonanceRule,
  intervalRules.noTritonHarmonicRule,
  intervalRules.noAugmentedDiminishedIntervalsRule,
  intervalRules.penultimatBarConsonanceRule,
  intervalRules.s4OffbeatConsonanceRule,
  intervalRules.firstIntervalExpandedRule,
  intervalRules.lastIntervalExpandedRule,

  // --- Motion rules (existing) ---
  motionRules.noParallelFifthsRule,
  motionRules.noParallelOctavesRule,
  motionRules.noDirectFifthsRule,
  motionRules.noDirectOctavesRule,
  // --- Motion rules (new) ---
  motionRules.noParallelFifthsOffbeatRule,
  motionRules.noParallelOctavesOffbeatRule,
  motionRules.noVoiceCrossingConsecutiveRule,
  motionRules.noSimilarMotionToUnisonRule,
  motionRules.noLeapfrogFifthsRule,
  motionRules.noLeapfrogOctavesRule,

  // --- Melodic rules (existing, now expanded to all species) ---
  melodicRules.preferContraryMotionRule,
  melodicRules.recoverLeapsRule,
  melodicRules.climaxApproachRule,
  // --- Melodic rules (new) ---
  melodicRules.rangeLimitRule,
  melodicRules.noLeapOfSeventhOrMoreRule,
  melodicRules.noRepeatedNotesRule,
  melodicRules.noConsecutiveLeapsSameDirectionRule,
  melodicRules.noThreeConsecutiveLeapsRule,
  melodicRules.singleClimaxRule,
  melodicRules.singleNadirRule,
  melodicRules.noLeapToOffbeatDissonanceRule,
  melodicRules.noLargeLeapAfterOffbeatDissonanceRule,

  // --- Dissonance treatment rules (new) ---
  dissonanceTreatmentRules.s2PassingToneRule,
  dissonanceTreatmentRules.s3PassingToneRule,
  dissonanceTreatmentRules.s3NeighborToneRule,
  dissonanceTreatmentRules.s3CambiataEscapeRule,
  dissonanceTreatmentRules.s4SuspensionPreparationRule,
  dissonanceTreatmentRules.s4SuspensionResolutionRule,
  dissonanceTreatmentRules.s4SuspensionResolutionDirectionRule,
  dissonanceTreatmentRules.s5AllDissonanceTreatmentsRule,

  // --- Cadence rules (new) ---
  cadenceRules.penultimatLeadingToneRule,
  cadenceRules.penultimateApproachesByStepRule,
  cadenceRules.s4CadentialSuspensionRule,
  cadenceRules.finalNoteIsTonicRule,
  cadenceRules.cadenceNoOffbeatDissonanceRule,
  cadenceRules.noCadenceAtClimaxRule,

  // --- Voice crossing rules (new) ---
  voiceCrossingRules.noVoiceCrossingRule,
  voiceCrossingRules.noConsecutiveUnisonsRule,
  voiceCrossingRules.spacingNotTooWideRule,
  voiceCrossingRules.noUnisonAfterCrossingAttemptRule,
  voiceCrossingRules.avoidParallelImperfectToPerfectRule,
  voiceCrossingRules.avoidConsecutivePerfectsSameRule,
  voiceCrossingRules.noDoubleNeighborRule,
];

/**
 * Get rules applicable to a specific species.
 * Returns only rules where rule.species includes the given species.
 */
export function getRulesForSpecies(species: Species): Rule[] {
  return ALL_RULES.filter(rule => rule.species.includes(species));
}

/**
 * Get rule by ID (useful for testing individual rules).
 */
export function getRuleById(ruleId: string): Rule | undefined {
  return ALL_RULES.find(rule => rule.id === ruleId);
}

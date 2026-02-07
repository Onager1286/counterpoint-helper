import { Rule, RuleCategoryId } from '../types/analysis.types';
import { Species } from '../types/species.types';
import * as intervalRules from './categories/intervalRules';
import * as motionRules from './categories/motionRules';
import * as melodicRules from './categories/melodicRules';
import * as dissonanceTreatmentRules from './categories/dissonanceTreatmentRules';
import * as cadenceRules from './categories/cadenceRules';
import * as voiceCrossingRules from './categories/voiceCrossingRules';

function tagCategory(rules: Rule[], category: RuleCategoryId): Rule[] {
  return rules.map(r => ({ ...r, category }));
}

/**
 * Display metadata for each rule category.
 */
export const RULE_CATEGORIES: Record<RuleCategoryId, { name: string; description: string }> = {
  intervals: { name: 'Intervals', description: 'Vertical interval consonance and dissonance' },
  motion: { name: 'Voice Motion', description: 'Parallel, similar, and contrary motion between voices' },
  melodic: { name: 'Melodic Rules', description: 'Melodic contour, leaps, and range' },
  dissonance: { name: 'Dissonance Treatment', description: 'Passing tones, neighbor tones, suspensions' },
  cadence: { name: 'Cadence', description: 'Ending patterns and leading tone treatment' },
  voiceCrossing: { name: 'Voice Crossing & Spacing', description: 'Voice independence and spacing limits' },
};

/** Ordered list of category IDs for consistent display. */
export const RULE_CATEGORY_ORDER: RuleCategoryId[] = [
  'intervals', 'motion', 'melodic', 'dissonance', 'cadence', 'voiceCrossing',
];

/**
 * Export all rules as flat array.
 */
export const ALL_RULES: Rule[] = [
  ...tagCategory([
    intervalRules.consonanceRule,
    intervalRules.firstIntervalRule,
    intervalRules.lastIntervalRule,
    intervalRules.downbeatConsonanceRule,
    intervalRules.noTritonHarmonicRule,
    intervalRules.noAugmentedDiminishedIntervalsRule,
    intervalRules.penultimatBarConsonanceRule,
    intervalRules.s4OffbeatConsonanceRule,
    intervalRules.firstIntervalExpandedRule,
    intervalRules.lastIntervalExpandedRule,
  ], 'intervals'),

  ...tagCategory([
    motionRules.noParallelFifthsRule,
    motionRules.noParallelOctavesRule,
    motionRules.noDirectFifthsRule,
    motionRules.noDirectOctavesRule,
    motionRules.noParallelFifthsOffbeatRule,
    motionRules.noParallelOctavesOffbeatRule,
    motionRules.noVoiceCrossingConsecutiveRule,
    motionRules.noSimilarMotionToUnisonRule,
    motionRules.noLeapfrogFifthsRule,
    motionRules.noLeapfrogOctavesRule,
  ], 'motion'),

  ...tagCategory([
    melodicRules.preferContraryMotionRule,
    melodicRules.recoverLeapsRule,
    melodicRules.climaxApproachRule,
    melodicRules.rangeLimitRule,
    melodicRules.noLeapOfSeventhOrMoreRule,
    melodicRules.noRepeatedNotesRule,
    melodicRules.noConsecutiveLeapsSameDirectionRule,
    melodicRules.noThreeConsecutiveLeapsRule,
    melodicRules.singleClimaxRule,
    melodicRules.singleNadirRule,
    melodicRules.noLeapToOffbeatDissonanceRule,
    melodicRules.noLargeLeapAfterOffbeatDissonanceRule,
  ], 'melodic'),

  ...tagCategory([
    dissonanceTreatmentRules.s2PassingToneRule,
    dissonanceTreatmentRules.s3PassingToneRule,
    dissonanceTreatmentRules.s3NeighborToneRule,
    dissonanceTreatmentRules.s3CambiataEscapeRule,
    dissonanceTreatmentRules.s4SuspensionPreparationRule,
    dissonanceTreatmentRules.s4SuspensionResolutionRule,
    dissonanceTreatmentRules.s4SuspensionResolutionDirectionRule,
    dissonanceTreatmentRules.s5AllDissonanceTreatmentsRule,
  ], 'dissonance'),

  ...tagCategory([
    cadenceRules.penultimatLeadingToneRule,
    cadenceRules.penultimateApproachesByStepRule,
    cadenceRules.s4CadentialSuspensionRule,
    cadenceRules.finalNoteIsTonicRule,
    cadenceRules.cadenceNoOffbeatDissonanceRule,
    cadenceRules.noCadenceAtClimaxRule,
  ], 'cadence'),

  ...tagCategory([
    voiceCrossingRules.noVoiceCrossingRule,
    voiceCrossingRules.noConsecutiveUnisonsRule,
    voiceCrossingRules.spacingNotTooWideRule,
    voiceCrossingRules.noUnisonAfterCrossingAttemptRule,
    voiceCrossingRules.avoidParallelImperfectToPerfectRule,
    voiceCrossingRules.avoidConsecutivePerfectsSameRule,
    voiceCrossingRules.noDoubleNeighborRule,
  ], 'voiceCrossing'),
];

/**
 * Get rules applicable to a specific species.
 * Returns only rules where rule.species includes the given species.
 */
export function getRulesForSpecies(species: Species): Rule[] {
  return ALL_RULES.filter(rule => rule.species.includes(species));
}

/**
 * Get rules for a species, grouped by category in display order.
 */
export function getRulesGroupedByCategory(species: Species): { categoryId: RuleCategoryId; rules: Rule[] }[] {
  const speciesRules = getRulesForSpecies(species);
  return RULE_CATEGORY_ORDER
    .map(categoryId => ({
      categoryId,
      rules: speciesRules.filter(r => r.category === categoryId),
    }))
    .filter(group => group.rules.length > 0);
}

/**
 * Get rule by ID (useful for testing individual rules).
 */
export function getRuleById(ruleId: string): Rule | undefined {
  return ALL_RULES.find(rule => rule.id === ruleId);
}

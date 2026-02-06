import { RuleContext, AnalysisResult, Violation } from '../types/analysis.types';
import { getRulesForSpecies } from './registry';

/**
 * Analyzes a composition against all applicable rules for the species.
 * Returns violations and summary statistics.
 *
 * @param context - RuleContext containing species, key, cantus firmus, and counterpoint
 * @returns AnalysisResult with violations, validity status, and counts
 */
export function analyzeComposition(context: RuleContext): AnalysisResult {
  // Get rules for current species
  const rules = getRulesForSpecies(context.species);

  // Run each rule and collect violations
  const violations: Violation[] = [];

  for (const rule of rules) {
    try {
      const ruleViolations = rule.check(context);
      violations.push(...ruleViolations);
    } catch (error) {
      console.error(`Rule ${rule.id} failed:`, error);
      // Don't break entire analysis if one rule fails
    }
  }

  // Calculate summary statistics
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;
  const isValid = errorCount === 0; // Warnings don't invalidate

  return {
    violations,
    isValid,
    errorCount,
    warningCount,
  };
}

/**
 * Analyzes only a specific subset of rules (for testing/debugging).
 *
 * @param context - RuleContext
 * @param ruleIds - Array of rule IDs to check
 * @returns AnalysisResult from selected rules only
 */
export function analyzeWithRules(
  context: RuleContext,
  ruleIds: string[]
): AnalysisResult {
  const allRules = getRulesForSpecies(context.species);
  const selectedRules = allRules.filter(rule => ruleIds.includes(rule.id));

  const violations: Violation[] = [];
  for (const rule of selectedRules) {
    try {
      const ruleViolations = rule.check(context);
      violations.push(...ruleViolations);
    } catch (error) {
      console.error(`Rule ${rule.id} failed:`, error);
    }
  }

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  return {
    violations,
    isValid: errorCount === 0,
    errorCount,
    warningCount,
  };
}

// Re-export for convenience
export * from './registry';

import { useEffect, useRef, useState } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { SPECIES_CONFIGS, Species } from '../../core/types/species.types';
import type { Note } from '../../core/types/music.types';
import type { Key } from '../../core/types/key.types';
import { ViolationDisplay } from '../ViolationDisplay';
import styles from './AnalysisPanel.module.css';

type SubmittedSnapshot = {
  cantusFirmus: Note[] | null;
  counterpoint: Note[];
  key: Key;
  species: Species;
};

type SubmitCompleteness = {
  isComplete: boolean;
  expectedSlots: number;
  presentSlots: number;
  missingMeasures: number[];
};

function requiredBeatsForNotesPerMeasure(notesPerMeasure: number): number[] {
  if (notesPerMeasure === 1) return [0];
  if (notesPerMeasure === 2) return [0, 2];
  return [0, 1, 2, 3];
}

function computeSubmitCompleteness(
  cantusFirmus: Note[],
  counterpoint: Note[],
  species: Species
): SubmitCompleteness {
  const measureCount = cantusFirmus.length;
  const notesPerMeasure = SPECIES_CONFIGS[species].notesPerMeasure;

  // Fifth Species (variable durations): require at least one note per measure
  if (notesPerMeasure === -1) {
    const measuresWithAny = new Set(counterpoint.map(n => n.measureIndex));
    const missingMeasures: number[] = [];
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      if (!measuresWithAny.has(measureIndex)) {
        missingMeasures.push(measureIndex);
      }
    }

    return {
      expectedSlots: measureCount,
      presentSlots: measureCount - missingMeasures.length,
      missingMeasures,
      isComplete: missingMeasures.length === 0,
    };
  }

  const requiredBeats = requiredBeatsForNotesPerMeasure(notesPerMeasure);
  const expectedSlots = measureCount * requiredBeats.length;

  const presentKeys = new Set<string>();
  for (const note of counterpoint) {
    if (note.measureIndex < 0 || note.measureIndex >= measureCount) continue;
    presentKeys.add(`${note.measureIndex}:${note.beatPosition}`);
  }

  let presentSlots = 0;
  const missingMeasuresSet = new Set<number>();
  for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
    for (const beatPosition of requiredBeats) {
      const key = `${measureIndex}:${beatPosition}`;
      if (presentKeys.has(key)) {
        presentSlots++;
      } else {
        missingMeasuresSet.add(measureIndex);
      }
    }
  }

  const missingMeasures = Array.from(missingMeasuresSet).sort((a, b) => a - b);

  return {
    expectedSlots,
    presentSlots,
    missingMeasures,
    isComplete: presentSlots === expectedSlots,
  };
}

function formatMissingMeasures(missingMeasures: number[], limit = 8): string {
  const oneBased = missingMeasures.map(m => m + 1);
  if (oneBased.length <= limit) {
    return oneBased.join(', ');
  }

  const shown = oneBased.slice(0, limit).join(', ');
  const remaining = oneBased.length - limit;
  return `${shown} and ${remaining} more`;
}

export function AnalysisPanel() {
  const {
    cantusFirmus,
    counterpoint,
    species,
    key,
    analysisResult,
    submitAnalysis,
  } = useComposition();

  const submittedSnapshotRef = useRef<SubmittedSnapshot | null>(null);
  const [lastSubmitCompleteness, setLastSubmitCompleteness] = useState<SubmitCompleteness | null>(null);

  // If the analysis result is cleared (new CF / reset), treat as a fresh start
  useEffect(() => {
    if (!analysisResult) {
      submittedSnapshotRef.current = null;
      setLastSubmitCompleteness(null);
    }
  }, [analysisResult]);

  const canSubmit = Boolean(cantusFirmus && cantusFirmus.length > 0);
  const hasSubmitted = submittedSnapshotRef.current !== null;

  const isStale = Boolean(
    hasSubmitted &&
      submittedSnapshotRef.current &&
      (cantusFirmus !== submittedSnapshotRef.current.cantusFirmus ||
        counterpoint !== submittedSnapshotRef.current.counterpoint ||
        key !== submittedSnapshotRef.current.key ||
        species !== submittedSnapshotRef.current.species)
  );

  const buttonLabel = !hasSubmitted ? 'Submit' : isStale ? 'Re-submit' : 'Submitted';

  const handleSubmit = () => {
    if (!cantusFirmus || cantusFirmus.length === 0) return;

    setLastSubmitCompleteness(computeSubmitCompleteness(cantusFirmus, counterpoint, species));
    submitAnalysis();
    submittedSnapshotRef.current = {
      cantusFirmus,
      counterpoint,
      key,
      species,
    };
  };

  const showStaleBanner = Boolean(analysisResult && isStale);
  const showIncompleteWarning = Boolean(
    analysisResult && lastSubmitCompleteness && !lastSubmitCompleteness.isComplete
  );

  const shouldShowViolationDisplay =
    analysisResult !== null &&
    (analysisResult.violations.length > 0 ||
      !lastSubmitCompleteness ||
      lastSubmitCompleteness.isComplete);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Analysis</h2>
          <p className={styles.subtitle}>
            Press Submit when you&apos;re ready for feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={styles.submitButton}
        >
          {buttonLabel}
        </button>
      </div>

      {!canSubmit && (
        <div className={styles.guidance}>
          Generate a Cantus Firmus above to enable analysis.
        </div>
      )}

      {canSubmit && !analysisResult && (
        <div className={styles.guidance}>
          Compose first, then press <strong>Submit</strong> to review errors and warnings.
        </div>
      )}

      {showStaleBanner && (
        <div className={styles.staleBanner}>
          Changes since last submit — press <strong>Re-submit</strong> to update results.
        </div>
      )}

      {showIncompleteWarning && lastSubmitCompleteness && (
        <div className={styles.incompleteWarning}>
          <div className={styles.incompleteTitle}>Incomplete composition</div>
          <div className={styles.incompleteBody}>
            Incomplete: filled {lastSubmitCompleteness.presentSlots}/{lastSubmitCompleteness.expectedSlots}{' '}
            required note positions.
            {lastSubmitCompleteness.missingMeasures.length > 0 && (
              <>
                {' '}
                Missing measures: {formatMissingMeasures(lastSubmitCompleteness.missingMeasures)}.
              </>
            )}
          </div>
        </div>
      )}

      {analysisResult && analysisResult.violations.length === 0 && showIncompleteWarning && (
        <div className={styles.neutralSuccess}>
          No violations detected in the notes you entered (composition incomplete).
        </div>
      )}

      {shouldShowViolationDisplay && <ViolationDisplay analysisResult={analysisResult} />}
    </div>
  );
}

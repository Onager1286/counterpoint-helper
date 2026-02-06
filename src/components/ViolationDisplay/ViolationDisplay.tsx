import { AnalysisResult } from '../../core/types/analysis.types';
import styles from './ViolationDisplay.module.css';

interface Props {
  analysisResult: AnalysisResult | null;
}

export function ViolationDisplay({ analysisResult }: Props) {
  // No analysis yet
  if (!analysisResult) {
    return null;
  }

  // No violations - success!
  if (analysisResult.violations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.successMessage}>
          ✓ No rule violations detected! Great work!
        </div>
      </div>
    );
  }

  const errors = analysisResult.violations.filter(v => v.severity === 'error');
  const warnings = analysisResult.violations.filter(v => v.severity === 'warning');

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        {errors.length > 0 && (
          <span className={styles.errorCount}>
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {warnings.length > 0 && (
          <span className={styles.warningCount}>
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {errors.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Errors</h3>
          {errors.map((violation, idx) => (
            <div key={`error-${idx}`} className={`${styles.violationCard} ${styles.errorCard}`}>
              <div className={styles.violationHeader}>
                <span className={styles.errorIcon}>⚠</span>
                <strong className={styles.violationName}>{violation.ruleName}</strong>
                <span className={styles.location}>
                  Measure {violation.location.measureIndex + 1}
                </span>
              </div>
              <p className={styles.message}>{violation.message}</p>
              <details className={styles.educational}>
                <summary>Learn more</summary>
                <p>{violation.educationalMessage}</p>
              </details>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Warnings</h3>
          {warnings.map((violation, idx) => (
            <div key={`warning-${idx}`} className={`${styles.violationCard} ${styles.warningCard}`}>
              <div className={styles.violationHeader}>
                <span className={styles.warningIcon}>ℹ</span>
                <strong className={styles.violationName}>{violation.ruleName}</strong>
                <span className={styles.location}>
                  Measure {violation.location.measureIndex + 1}
                </span>
              </div>
              <p className={styles.message}>{violation.message}</p>
              <details className={styles.educational}>
                <summary>Learn more</summary>
                <p>{violation.educationalMessage}</p>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

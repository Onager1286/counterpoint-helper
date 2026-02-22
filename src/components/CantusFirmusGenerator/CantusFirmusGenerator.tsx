import { useEffect, useRef, useState } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { CantusFirmusGenerator } from '../../core/generators/cantusFirmusGenerator';
import { getAllKeyNames, parseKey } from '../../core/utils/keySignatures';
import styles from './CantusFirmusGenerator.module.css';

interface CantusFirmusGeneratorProps {
  isExpanded: boolean;
  onExpand: () => void;
  onGenerated: () => void;
}

export function CantusFirmusGeneratorComponent({ isExpanded, onExpand, onGenerated }: CantusFirmusGeneratorProps) {
  const { setCantusFirmus, setKey, clearCounterpoint, cantusFirmus, species, key } = useComposition();
  const [selectedKey, setSelectedKey] = useState('C major');
  const [length, setLength] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Species-changed banner: fires when species changes while a CF already exists
  const prevSpeciesRef = useRef(species);
  const [speciesChangedWarning, setSpeciesChangedWarning] = useState(false);

  useEffect(() => {
    if (cantusFirmus && species !== prevSpeciesRef.current) {
      setSpeciesChangedWarning(true);
    }
    prevSpeciesRef.current = species;
  }, [species, cantusFirmus]);

  // Clear banner when a new CF is generated
  useEffect(() => {
    setSpeciesChangedWarning(false);
  }, [cantusFirmus]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const parsedKey = parseKey(selectedKey);
      setKey(parsedKey);

      const generator = new CantusFirmusGenerator({
        key: parsedKey,
        length,
        clef: 'bass',
      });

      const cf = generator.generate();
      setCantusFirmus(cf);
      clearCounterpoint();
      onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Cantus Firmus');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isExpanded) {
    return (
      <div
        key="summary"
        className={`${styles.summaryBar} ${speciesChangedWarning ? styles.summaryBarWarning : ''}`}
      >
        <span className={speciesChangedWarning ? styles.summaryWarn : styles.summaryCheck}>
          {speciesChangedWarning ? '⚠' : '✓'}
        </span>
        <span className={styles.summaryLabel}>
          {key.tonic} {key.mode} · {cantusFirmus?.length ?? 0} measures
        </span>
        <button type="button" className={styles.summaryEdit} onClick={onExpand}>
          {speciesChangedWarning ? 'Regenerate' : 'Edit'}
        </button>
      </div>
    );
  }

  return (
    <div key="expanded" className={styles.container}>
      <h2 className={styles.title}>Cantus Firmus Generator</h2>

      {speciesChangedWarning && (
        <div className={styles.speciesChangedBanner}>
          Species changed — regenerate the cantus firmus for best results.
        </div>
      )}

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Key
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className={styles.select}
          >
            {getAllKeyNames().map(keyName => (
              <option key={keyName} value={keyName}>
                {keyName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Length (measures)
          </label>
          <input
            type="number"
            min={4}
            max={16}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`${styles.generateButton} ${isGenerating ? styles.loading : ''}`}
        >
          {isGenerating ? 'Generating...' : 'Generate Cantus Firmus'}
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
}

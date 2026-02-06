import { useState } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { CantusFirmusGenerator } from '../../core/generators/cantusFirmusGenerator';
import { getAllKeyNames, parseKey } from '../../core/utils/keySignatures';
import { Species } from '../../core/types/species.types';
import styles from './CantusFirmusGenerator.module.css';

export function CantusFirmusGeneratorComponent() {
  const { setCantusFirmus, setKey, clearCounterpoint, species, setSpecies } = useComposition();
  const [selectedKey, setSelectedKey] = useState('C major');
  const [length, setLength] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const key = parseKey(selectedKey);
      setKey(key);

      const generator = new CantusFirmusGenerator({
        key,
        length,
        clef: 'bass',
      });

      const cf = generator.generate();
      setCantusFirmus(cf);
      clearCounterpoint();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Cantus Firmus');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Cantus Firmus Generator</h2>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Species
          </label>
          <select
            value={species}
            onChange={(e) => {
              setSpecies(parseInt(e.target.value, 10) as Species);
              clearCounterpoint();
            }}
            className={styles.select}
          >
            <option value={Species.First}>First Species — whole notes</option>
            <option value={Species.Second}>Second Species — half notes</option>
            <option value={Species.Third}>Third Species — quarter notes</option>
            <option value={Species.Fourth}>Fourth Species — syncopation</option>
          </select>
        </div>

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

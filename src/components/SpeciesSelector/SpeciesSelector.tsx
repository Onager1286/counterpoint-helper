import { useComposition } from '../../context/CompositionContext';
import { Species, SPECIES_CONFIGS } from '../../core/types/species.types';
import styles from './SpeciesSelector.module.css';

const ROMAN_NUMERALS: Record<Species, string> = {
  [Species.First]: 'I',
  [Species.Second]: 'II',
  [Species.Third]: 'III',
  [Species.Fourth]: 'IV',
  [Species.Fifth]: 'V',
};

const ALL_SPECIES = [
  Species.First,
  Species.Second,
  Species.Third,
  Species.Fourth,
  Species.Fifth,
] as const;

interface SpeciesSelectorProps {
  isExpanded: boolean;
  onExpand: () => void;
}

export function SpeciesSelector({ isExpanded, onExpand }: SpeciesSelectorProps) {
  const { species, setSpecies, clearCounterpoint } = useComposition();

  const handleSelect = (s: Species) => {
    if (s === species) return;
    setSpecies(s);
    clearCounterpoint();
  };

  if (!isExpanded) {
    return (
      <div key="summary" className={styles.summaryBar}>
        <span className={styles.summaryCheck}>✓</span>
        <span className={styles.summaryLabel}>
          {ROMAN_NUMERALS[species]} · {SPECIES_CONFIGS[species].name}
        </span>
        <button type="button" className={styles.summaryEdit} onClick={onExpand}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <div key="expanded" className={styles.container}>
      <h2 className={styles.title}>Select Your Species</h2>
      <p className={styles.subtitle}>
        Each species introduces new rhythmic and melodic techniques.
        Master them in order to build your counterpoint skills.
      </p>

      <div className={styles.grid}>
        {ALL_SPECIES.map((s) => {
          const config = SPECIES_CONFIGS[s];
          const isActive = s === species;
          return (
            <button
              key={s}
              type="button"
              className={`${styles.card} ${isActive ? styles.active : ''}`}
              onClick={() => handleSelect(s)}
              aria-pressed={isActive}
            >
              <span className={styles.numeral}>{ROMAN_NUMERALS[s]}</span>
              <span className={styles.name}>{config.name}</span>
              <span className={styles.description}>{config.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

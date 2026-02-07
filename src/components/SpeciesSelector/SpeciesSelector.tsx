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

export function SpeciesSelector() {
  const { species, setSpecies, clearCounterpoint } = useComposition();

  const handleSelect = (s: Species) => {
    if (s === species) return;
    setSpecies(s);
    clearCounterpoint();
  };

  return (
    <div className={styles.container}>
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

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

const ABBREV: Record<Species, string> = {
  [Species.First]:  '1:1',
  [Species.Second]: '2:1',
  [Species.Third]:  '4:1',
  [Species.Fourth]: 'Tied',
  [Species.Fifth]:  'Florid',
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
      <h3 className={styles.sectionLabel}>Select Species</h3>
      <div className={styles.buttonGroup} role="group" aria-label="Select counterpoint species">
        {ALL_SPECIES.map((s) => {
          const isActive = s === species;
          return (
            <button
              key={s}
              type="button"
              className={`${styles.pill} ${isActive ? styles.active : ''}`}
              onClick={() => handleSelect(s)}
              aria-pressed={isActive}
              title={SPECIES_CONFIGS[s].name}
            >
              <span className={styles.numeral}>{ROMAN_NUMERALS[s]}</span>
              <span className={styles.abbr}>{ABBREV[s]}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>{SPECIES_CONFIGS[species].description}</p>
    </div>
  );
}

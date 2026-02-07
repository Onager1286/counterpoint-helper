import { useState, useMemo } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { SPECIES_CONFIGS } from '../../core/types/species.types';
import { getRulesGroupedByCategory, RULE_CATEGORIES } from '../../core/rules/registry';
import type { RuleCategoryId } from '../../core/types/analysis.types';
import styles from './RuleReference.module.css';

export function RuleReference() {
  const { species } = useComposition();
  const [isOpen, setIsOpen] = useState(false);

  const grouped = useMemo(() => getRulesGroupedByCategory(species), [species]);
  const totalRules = useMemo(() => grouped.reduce((sum, g) => sum + g.rules.length, 0), [grouped]);

  const speciesName = SPECIES_CONFIGS[species].name;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
      >
        <div className={styles.toggleContent}>
          <h2 className={styles.title}>Rule Reference</h2>
          <span className={styles.count}>
            {totalRules} rules for {speciesName}
          </span>
        </div>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          &#9662;
        </span>
      </button>

      {isOpen && (
        <div className={styles.body}>
          <p className={styles.intro}>
            These are the counterpoint rules checked for {speciesName}.
            Study them before composing to write valid counterpoint.
          </p>

          {grouped.map(({ categoryId, rules }) => (
            <CategoryGroup key={categoryId} categoryId={categoryId} rules={rules} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({ categoryId, rules }: { categoryId: RuleCategoryId; rules: { name: string; severity: string; description: string }[] }) {
  const meta = RULE_CATEGORIES[categoryId];

  return (
    <details className={styles.category}>
      <summary className={styles.categoryHeader}>
        <span className={styles.categoryName}>{meta.name}</span>
        <span className={styles.categoryCount}>{rules.length}</span>
      </summary>

      <p className={styles.categoryDescription}>{meta.description}</p>

      <ul className={styles.ruleList}>
        {rules.map((rule) => (
          <li key={rule.name} className={styles.ruleItem}>
            <div className={styles.ruleHeader}>
              <span className={styles.ruleName}>{rule.name}</span>
              <span className={rule.severity === 'error' ? styles.badgeError : styles.badgeWarning}>
                {rule.severity}
              </span>
            </div>
            <p className={styles.ruleDescription}>{rule.description}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

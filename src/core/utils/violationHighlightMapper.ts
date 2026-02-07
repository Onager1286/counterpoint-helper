import type { Note } from '../types/music.types';
import type { Violation } from '../types/analysis.types';
import type { NoteHighlight } from '../../services/vexflow/types';

const HIGHLIGHT_COLORS = {
  error: '#B54834',
  warning: '#C49A3B',
  selection: '#2196F3',
} as const;

const PRIORITY = { warning: 1, error: 2, selection: 3 } as const;

function noteMatches(a: Note, b: Note): boolean {
  return (
    a.pitch === b.pitch &&
    a.measureIndex === b.measureIndex &&
    a.beatPosition === b.beatPosition
  );
}

/**
 * Maps violations and selection state into per-note highlights for VexFlow rendering.
 * Priority: selection (blue) > error (red) > warning (amber).
 */
export function mapViolationsToHighlights(
  cantusFirmus: Note[],
  counterpoint: Note[],
  violations: Violation[],
  selectedCPIndex: number | null,
): NoteHighlight[] {
  const best = new Map<string, { voice: 'cf' | 'cp'; index: number; priority: number; color: string }>();

  const upsert = (voice: 'cf' | 'cp', index: number, priority: number, color: string) => {
    const key = `${voice}-${index}`;
    const existing = best.get(key);
    if (!existing || priority > existing.priority) {
      best.set(key, { voice, index, priority, color });
    }
  };

  for (const v of violations) {
    const priority = PRIORITY[v.severity];
    const color = HIGHLIGHT_COLORS[v.severity];

    for (const note of v.affectedNotes) {
      const cfIdx = cantusFirmus.findIndex(n => noteMatches(n, note));
      if (cfIdx !== -1) {
        upsert('cf', cfIdx, priority, color);
        continue;
      }
      const cpIdx = counterpoint.findIndex(n => noteMatches(n, note));
      if (cpIdx !== -1) {
        upsert('cp', cpIdx, priority, color);
      }
    }
  }

  if (selectedCPIndex !== null) {
    upsert('cp', selectedCPIndex, PRIORITY.selection, HIGHLIGHT_COLORS.selection);
  }

  return Array.from(best.values()).map(({ voice, index, color }) => ({ voice, index, color }));
}

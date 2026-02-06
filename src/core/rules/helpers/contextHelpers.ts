import { RuleContext } from '../../types/analysis.types';
import { Note } from '../../types/music.types';

/**
 * Get first counterpoint note (or null if empty).
 */
export function getFirstCounterpointNote(context: RuleContext): Note | null {
  if (context.counterpoint.length === 0) {
    return null;
  }
  return context.counterpoint[0];
}

/**
 * Get last counterpoint note (or null if empty).
 */
export function getLastCounterpointNote(context: RuleContext): Note | null {
  if (context.counterpoint.length === 0) {
    return null;
  }
  return context.counterpoint[context.counterpoint.length - 1];
}

/**
 * Check if counterpoint matches CF length (complete exercise).
 */
export function isCounterpointComplete(context: RuleContext): boolean {
  return context.counterpoint.length === context.cantusFirmus.length;
}

/**
 * Get note at specific measure index (or null if not found).
 */
export function getNoteAtMeasure(notes: Note[], measureIndex: number): Note | null {
  const note = notes.find(n => n.measureIndex === measureIndex);
  return note ?? null;
}

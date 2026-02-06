import { VoiceMotion, MotionType, Note } from '../../types/music.types';
import { getInterval } from '../../models/Interval';

/**
 * Determine motion type from two intervals and voice directions.
 */
function determineMotionType(
  cf1: Note,
  cf2: Note,
  cp1: Note,
  cp2: Note
): MotionType {
  const cfDirection = Math.sign(cf2.midiNumber - cf1.midiNumber);
  const cpDirection = Math.sign(cp2.midiNumber - cp1.midiNumber);

  // Oblique: one voice stationary
  if (cfDirection === 0 && cpDirection !== 0) {
    return 'oblique';
  }
  if (cpDirection === 0 && cfDirection !== 0) {
    return 'oblique';
  }
  if (cfDirection === 0 && cpDirection === 0) {
    return 'oblique'; // Both stationary (rare in Species I)
  }

  // Contrary: opposite directions
  if (cfDirection !== cpDirection) {
    return 'contrary';
  }

  // Same direction - check if intervals are the same
  const interval1 = getInterval(cf1.pitch, cf1.midiNumber, cp1.pitch, cp1.midiNumber);
  const interval2 = getInterval(cf2.pitch, cf2.midiNumber, cp2.pitch, cp2.midiNumber);

  // Parallel: same direction, same interval
  if (interval1.degree === interval2.degree && interval1.quality === interval2.quality) {
    return 'parallel';
  }

  // Similar: same direction, different interval
  return 'similar';
}

/**
 * Analyze motion type between two note pairs.
 */
export function getVoiceMotion(
  cf1: Note,
  cf2: Note,
  cp1: Note,
  cp2: Note
): VoiceMotion {
  const intervalBefore = getInterval(cf1.pitch, cf1.midiNumber, cp1.pitch, cp1.midiNumber);
  const intervalAfter = getInterval(cf2.pitch, cf2.midiNumber, cp2.pitch, cp2.midiNumber);
  const type = determineMotionType(cf1, cf2, cp1, cp2);

  return {
    type,
    intervalBefore,
    intervalAfter,
    voice1From: cf1,
    voice1To: cf2,
    voice2From: cp1,
    voice2To: cp2,
  };
}

/**
 * Get all consecutive motions (returns empty array if CP incomplete).
 */
export function getAllMotions(cf: Note[], cp: Note[]): VoiceMotion[] {
  const motions: VoiceMotion[] = [];

  // Need at least 2 notes in both voices
  if (cf.length < 2 || cp.length < 2) {
    return motions;
  }

  // Analyze consecutive pairs
  for (let i = 0; i < cf.length - 1; i++) {
    const cf1 = cf[i];
    const cf2 = cf[i + 1];

    // Find corresponding counterpoint notes
    const cp1 = cp.find(n => n.measureIndex === cf1.measureIndex);
    const cp2 = cp.find(n => n.measureIndex === cf2.measureIndex);

    // Skip if counterpoint doesn't have both notes yet
    if (!cp1 || !cp2) {
      continue;
    }

    const motion = getVoiceMotion(cf1, cf2, cp1, cp2);
    motions.push(motion);
  }

  return motions;
}

/**
 * Check if any motion has parallel perfect consonances.
 */
export function hasParallelPerfects(
  motions: VoiceMotion[],
  perfectType: 'P5' | 'P8' | 'P1'
): boolean {
  const degree = perfectType === 'P1' ? 1 : perfectType === 'P5' ? 5 : 8;

  return motions.some(motion => {
    const isParallel = motion.type === 'parallel';
    const beforeMatches =
      motion.intervalBefore.degree === degree &&
      motion.intervalBefore.quality === 'perfect';
    const afterMatches =
      motion.intervalAfter.degree === degree &&
      motion.intervalAfter.quality === 'perfect';

    return isParallel && beforeMatches && afterMatches;
  });
}

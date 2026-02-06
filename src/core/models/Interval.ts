// Interval calculation and analysis

import { Interval, IntervalQuality } from '../types/music.types';
import { semitoneDifference, getIntervalDegree } from '../utils/musicMath';

/**
 * Calculate the interval between two pitches
 */
export function getInterval(pitch1: string, midi1: number, pitch2: string, midi2: number): Interval {
  const semitones = semitoneDifference(midi1, midi2);
  const degree = getIntervalDegree(pitch1, pitch2);
  const quality = getIntervalQuality(degree, semitones);
  const isConsonant = isConsonantInterval(degree, quality);

  return {
    degree,
    quality,
    semitones,
    isConsonant,
  };
}

/**
 * Determine interval quality based on degree and semitones
 */
function getIntervalQuality(degree: number, semitones: number): IntervalQuality {
  // Normalize to within an octave
  const normalizedDegree = ((degree - 1) % 7) + 1;
  const normalizedSemitones = semitones % 12;

  const qualityMap: Record<number, Record<number, IntervalQuality>> = {
    1: { 0: 'perfect', 1: 'augmented' },
    2: { 1: 'minor', 2: 'major', 3: 'augmented' },
    3: { 3: 'minor', 4: 'major', 5: 'augmented' },
    4: { 4: 'diminished', 5: 'perfect', 6: 'augmented' },
    5: { 6: 'diminished', 7: 'perfect', 8: 'augmented' },
    6: { 8: 'minor', 9: 'major', 10: 'augmented' },
    7: { 10: 'minor', 11: 'major', 0: 'augmented' },
  };

  return qualityMap[normalizedDegree]?.[normalizedSemitones] || 'major';
}

/**
 * Check if an interval is consonant
 * Consonant intervals: P1, m3, M3, P5, m6, M6, P8
 * Dissonant intervals: all seconds, sevenths, fourths (in some contexts), tritones
 */
function isConsonantInterval(degree: number, quality: IntervalQuality): boolean {
  const normalizedDegree = ((degree - 1) % 7) + 1;

  // Perfect consonances: unison, fifth, octave
  if ((normalizedDegree === 1 || normalizedDegree === 5) && quality === 'perfect') {
    return true;
  }

  // Imperfect consonances: major/minor thirds and sixths
  if ((normalizedDegree === 3 || normalizedDegree === 6) && 
      (quality === 'major' || quality === 'minor')) {
    return true;
  }

  return false;
}

/**
 * Check if an interval is a perfect consonance (P1, P5, P8)
 */
export function isPerfectConsonance(interval: Interval): boolean {
  const normalizedDegree = ((interval.degree - 1) % 7) + 1;
  return (normalizedDegree === 1 || normalizedDegree === 5) && 
         interval.quality === 'perfect';
}

/**
 * Check if an interval is an imperfect consonance (M3, m3, M6, m6)
 */
export function isImperfectConsonance(interval: Interval): boolean {
  const normalizedDegree = ((interval.degree - 1) % 7) + 1;
  return (normalizedDegree === 3 || normalizedDegree === 6) && 
         (interval.quality === 'major' || interval.quality === 'minor');
}

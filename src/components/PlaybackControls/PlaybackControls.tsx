import { useEffect, useRef, useState } from 'react';
import type { Note, NoteDuration } from '../../core/types/music.types';
import { useComposition } from '../../context/CompositionContext';
import { TonePlaybackService } from '../../services/tonejs/TonePlaybackService';
import styles from './PlaybackControls.module.css';

const BPM = 80;

function durationToTicks(duration: NoteDuration): number {
  const map: Record<NoteDuration, number> = {
    '1': 16,
    '2': 8,
    '4': 4,
    '8': 2,
    '16': 1,
  };
  return map[duration];
}

function endTicksForNotes(notes: Note[]): number {
  let maxTicks = 0;
  for (const note of notes) {
    const startTicks = (note.measureIndex * 16) + (note.beatPosition * 4);
    const durationTicks = durationToTicks(note.duration);
    maxTicks = Math.max(maxTicks, startTicks + durationTicks);
  }
  return maxTicks;
}

function estimatePlaybackMs(
  cantusFirmus: Note[] | null,
  counterpoint: Note[],
  bpm: number
): number {
  if (!cantusFirmus || cantusFirmus.length === 0) return 0;
  const endTicks = Math.max(endTicksForNotes(cantusFirmus), endTicksForNotes(counterpoint));
  const secondsPerQuarter = 60 / bpm;
  const secondsPerSixteenth = secondsPerQuarter / 4;
  return endTicks * secondsPerSixteenth * 1000;
}

export function PlaybackControls() {
  const { cantusFirmus, counterpoint } = useComposition();
  const [isPlaying, setIsPlaying] = useState(false);
  const stopTimeoutRef = useRef<number | null>(null);

  const canPlay = Boolean(cantusFirmus && cantusFirmus.length > 0);

  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current !== null) {
        window.clearTimeout(stopTimeoutRef.current);
      }
      TonePlaybackService.stop();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    TonePlaybackService.stop();
    setIsPlaying(false);
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, [cantusFirmus, counterpoint, isPlaying]);

  const handleToggle = async () => {
    if (!canPlay) return;

    if (isPlaying) {
      TonePlaybackService.stop();
      setIsPlaying(false);
      if (stopTimeoutRef.current !== null) {
        window.clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
      return;
    }

    setIsPlaying(true);
    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }

    try {
      await TonePlaybackService.play(cantusFirmus ?? [], counterpoint, { bpm: BPM });
      const durationMs = estimatePlaybackMs(cantusFirmus, counterpoint, BPM);
      if (durationMs > 0) {
        stopTimeoutRef.current = window.setTimeout(() => {
          setIsPlaying(false);
          stopTimeoutRef.current = null;
        }, durationMs + 150);
      }
    } catch (error) {
      console.error('Playback failed to start.', error);
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.playButton}
        onClick={handleToggle}
        disabled={!canPlay}
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>
      <span className={styles.tempoTag}>80 BPM</span>
    </div>
  );
}

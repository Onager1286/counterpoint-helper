import { useEffect, useRef, useState } from 'react';
import type { Note, NoteDuration } from '../../core/types/music.types';
import { useComposition } from '../../context/CompositionContext';
import { TonePlaybackService } from '../../services/tonejs/TonePlaybackService';
import styles from './PlaybackControls.module.css';

const DEFAULT_BPM = 80;
const MIN_BPM = 40;
const MAX_BPM = 200;

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
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
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
    if (isLoadingSamples) return;

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
      setIsLoadingSamples(true);
      await TonePlaybackService.preloadSamples();
      setIsLoadingSamples(false);
      await TonePlaybackService.play(cantusFirmus ?? [], counterpoint, { bpm });
      const durationMs = estimatePlaybackMs(cantusFirmus, counterpoint, bpm);
      if (durationMs > 0) {
        stopTimeoutRef.current = window.setTimeout(() => {
          setIsPlaying(false);
          stopTimeoutRef.current = null;
        }, durationMs + 150);
      }
    } catch (error) {
      console.error('Playback failed to start.', error);
      setIsLoadingSamples(false);
      setIsPlaying(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.playButton}
        onClick={handleToggle}
        disabled={!canPlay || isLoadingSamples}
      >
        {isLoadingSamples ? 'Loading…' : (isPlaying ? 'Stop' : 'Play')}
      </button>
      <label className={styles.tempoSlider}>
        <input
          type="range"
          className={styles.tempoRange}
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
        />
        <span className={styles.tempoTag}>{bpm} BPM</span>
      </label>
    </div>
  );
}

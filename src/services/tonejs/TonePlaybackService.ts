import * as Tone from 'tone';
import type { Note, NoteDuration } from '../../core/types/music.types';

type PlaybackOptions = {
  bpm?: number;
};

type PlaybackHandle = {
  stop: () => void;
};

const DEFAULT_BPM = 80;

// Salamander Grand Piano samples covering the counterpoint range (A1–C6).
// Keys are Tone.js scientific pitch notation; values are filenames under baseUrl.
// 'Ds' = D#, 'Fs' = F# (Salamander filename convention).
const SALAMANDER_URLS: Record<string, string> = {
  A1: 'A1.mp3',
  C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
};

export class TonePlaybackService {
  private static sampler: Tone.Sampler | null = null;
  private static samplesLoaded = false;
  private static samplesLoading: Promise<void> | null = null;

  // ---------------------------------------------------------------------------
  // Sample management
  // ---------------------------------------------------------------------------

  private static createSampler(): Tone.Sampler {
    return new Tone.Sampler({
      urls: SALAMANDER_URLS,
      release: 1.5,
      baseUrl: '/samples/piano/',
    }).toDestination();
  }

  static async preloadSamples(): Promise<void> {
    if (this.samplesLoaded) return;
    if (this.samplesLoading) return this.samplesLoading;

    this.samplesLoading = (async () => {
      try {
        if (!this.sampler) {
          this.sampler = this.createSampler();
          this.sampler.volume.value = -8;
        }
        await Tone.loaded();
        this.samplesLoaded = true;
      } finally {
        this.samplesLoading = null;
      }
    })();

    return this.samplesLoading;
  }

  static isSamplesLoaded(): boolean {
    return this.samplesLoaded;
  }

  // ---------------------------------------------------------------------------
  // Transport helpers
  // ---------------------------------------------------------------------------

  static durationToTicks(duration: NoteDuration): number {
    const map: Record<NoteDuration, number> = {
      '1': 16,
      '2': 8,
      '4': 4,
      '8': 2,
      '16': 1,
    };
    return map[duration];
  }

  static noteToTransportTime(measureIndex: number, beatPosition: number): string {
    const startTicks = (measureIndex * 16) + (beatPosition * 4);
    return TonePlaybackService.ticksToTransportTime(startTicks);
  }

  private static ticksToTransportTime(ticks: number): string {
    const bars = Math.floor(ticks / 16);
    const beats = Math.floor((ticks % 16) / 4);
    const sixteenths = ticks % 4;
    return `${bars}:${beats}:${sixteenths}`;
  }

  private static endTicksForNotes(notes: Note[]): number {
    let maxTicks = 0;
    for (const note of notes) {
      const startTicks = (note.measureIndex * 16) + (note.beatPosition * 4);
      const durationTicks = this.durationToTicks(note.duration);
      maxTicks = Math.max(maxTicks, startTicks + durationTicks);
    }
    return maxTicks;
  }

  // ---------------------------------------------------------------------------
  // Playback
  // ---------------------------------------------------------------------------

  static async play(
    cantusFirmus: Note[],
    counterpoint: Note[],
    options: PlaybackOptions = {}
  ): Promise<PlaybackHandle> {
    if (!cantusFirmus || cantusFirmus.length === 0) {
      return { stop: () => undefined };
    }

    await Tone.start();
    await this.preloadSamples();

    if (!this.sampler) {
      return { stop: () => undefined };
    }

    const bpm = options.bpm ?? DEFAULT_BPM;
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = '0:0:0';
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.timeSignature = [4, 4];

    const sampler = this.sampler;
    const allNotes = [...cantusFirmus, ...counterpoint];

    for (const note of allNotes) {
      const time = this.noteToTransportTime(note.measureIndex, note.beatPosition);
      const duration = Tone.Time('16n').toSeconds() * this.durationToTicks(note.duration);
      Tone.Transport.schedule((transportTime) => {
        sampler.triggerAttackRelease(note.pitch, duration, transportTime);
      }, time);
    }

    const endTicks = Math.max(
      this.endTicksForNotes(cantusFirmus),
      counterpoint.length > 0 ? this.endTicksForNotes(counterpoint) : 0
    );
    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
    }, this.ticksToTransportTime(endTicks));

    Tone.Transport.start();

    return { stop: () => this.stop() };
  }

  static stop(): void {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.sampler?.releaseAll?.();
  }
}

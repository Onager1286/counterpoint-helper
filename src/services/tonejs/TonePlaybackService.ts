import * as Tone from 'tone';
import type { Note, NoteDuration } from '../../core/types/music.types';

type PlaybackOptions = {
  bpm?: number;
};

type PlaybackHandle = {
  stop: () => void;
};

const DEFAULT_BPM = 80;

export class TonePlaybackService {
  private static cfSynth: Tone.PolySynth | null = null;
  private static cpSynth: Tone.PolySynth | null = null;
  private static initialized = false;

  static init(): void {
    if (this.initialized) return;

    this.cfSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, release: 1.2 },
    }).toDestination();

    this.cpSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, release: 0.8 },
    }).toDestination();

    this.cfSynth.volume.value = -8;
    this.cpSynth.volume.value = -6;

    this.initialized = true;
  }

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
    return this.ticksToTransportTime(startTicks);
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

  static async play(
    cantusFirmus: Note[],
    counterpoint: Note[],
    options: PlaybackOptions = {}
  ): Promise<PlaybackHandle> {
    if (!cantusFirmus || cantusFirmus.length === 0) {
      return { stop: () => undefined };
    }

    await Tone.start();
    this.init();

    const bpm = options.bpm ?? DEFAULT_BPM;
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    Tone.Transport.position = '0:0:0';
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.timeSignature = [4, 4];

    const cfSynth = this.cfSynth;
    const cpSynth = this.cpSynth;

    if (!cfSynth || !cpSynth) {
      return { stop: () => undefined };
    }

    for (const note of cantusFirmus) {
      const time = this.noteToTransportTime(note.measureIndex, note.beatPosition);
      const duration = Tone.Time('16n').toSeconds() * this.durationToTicks(note.duration);
      Tone.Transport.schedule((transportTime) => {
        cfSynth.triggerAttackRelease(note.pitch, duration, transportTime);
      }, time);
    }

    for (const note of counterpoint) {
      const time = this.noteToTransportTime(note.measureIndex, note.beatPosition);
      const duration = Tone.Time('16n').toSeconds() * this.durationToTicks(note.duration);
      Tone.Transport.schedule((transportTime) => {
        cpSynth.triggerAttackRelease(note.pitch, duration, transportTime);
      }, time);
    }

    const endTicks = Math.max(
      this.endTicksForNotes(cantusFirmus),
      this.endTicksForNotes(counterpoint)
    );
    const endTime = this.ticksToTransportTime(endTicks);

    Tone.Transport.scheduleOnce(() => {
      Tone.Transport.stop();
    }, endTime);

    Tone.Transport.start();

    return {
      stop: () => this.stop(),
    };
  }

  static stop(): void {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    this.cfSynth?.releaseAll?.();
    this.cpSynth?.releaseAll?.();
  }
}

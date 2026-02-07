/**
 * Musical clef types supported by VexFlow
 */
export type Clef = 'treble' | 'bass' | 'alto' | 'tenor';

/**
 * Options for rendering musical notation with VexFlow
 */
export interface RenderOptions {
  /**
   * Total width of the rendering area in pixels
   * @default 800
   */
  width?: number;

  /**
   * Total height of the rendering area in pixels
   * @default 300
   */
  height?: number;

  /**
   * Musical clef to use for the staff
   * @default 'bass'
   */
  clef?: Clef;

  /**
   * Whether to show the time signature on the first measure
   * @default true
   */
  showTimeSignature?: boolean;

  /**
   * Number of measures to display per system (staff line)
   * @default 4
   */
  measuresPerSystem?: number;

  /**
   * Array of note indices to highlight (for future error display)
   * @default []
   */
  highlightNotes?: number[];
}

/**
 * A single note highlight with voice, index, and color
 */
export interface NoteHighlight {
  voice: 'cf' | 'cp';
  index: number;
  color: string;
}

/**
 * Options for rendering a grand staff (treble + bass)
 */
export interface GrandStaffRenderOptions extends RenderOptions {
  /**
   * Array of counterpoint note indices to highlight
   * @default []
   */
  highlightedNotes?: number[];

  /**
   * Per-note highlights with voice, index, and color.
   * Takes precedence over highlightedNotes when provided.
   */
  noteHighlights?: NoteHighlight[];
}

/**
 * Metadata returned from renderGrandStaff for click detection
 */
export interface RenderMetadata {
  /**
   * Width of a single measure/stave in pixels
   */
  staveWidth: number;

  /**
   * Height of a complete system (treble + bass + internal spacing)
   */
  systemHeight: number;

  /**
   * Vertical spacing between systems
   */
  systemSpacing: number;

  /**
   * Y-coordinate of the treble staff top line
   */
  trebleStaveY: number;

  /**
   * Y-coordinate of the bass staff top line
   */
  bassStaveY: number;

  /**
   * Number of measures displayed per system
   */
  measuresPerSystem: number;

  /**
   * Top padding before first system
   */
  topPadding: number;
}

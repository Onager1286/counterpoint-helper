import { Renderer, Stave, Voice, Formatter, StaveConnector } from 'vexflow';
import type { Note } from '../../core/types/music.types';
import type { Key } from '../../core/types/key.types';
import type { RenderOptions, GrandStaffRenderOptions, RenderMetadata } from './types';
import { formatNotes, groupNotesIntoMeasures, groupMeasuresIntoSystems } from './noteFormatter';
import { keyToVexFlowSignature } from '../../core/utils/vexflowFormatters';

/**
 * Service for rendering musical notation using VexFlow.
 * Provides a stateless interface for displaying notes on a musical staff.
 */
export class VexFlowService {
  /**
   * Renders musical notes on a staff using VexFlow.
   *
   * @param container - DOM element to render into
   * @param notes - Array of notes to render
   * @param key - Musical key for the staff
   * @param options - Rendering options (width, height, clef, etc.)
   */
  static render(
    container: HTMLDivElement,
    notes: Note[],
    key: Key,
    options: RenderOptions = {}
  ): void {
    // Apply defaults
    const {
      width = 800,
      clef = 'bass',
      showTimeSignature = true,
      measuresPerSystem = 4,
    } = options;

    // Validate inputs
    if (!container) {
      throw new Error('Container element is required');
    }

    if (!notes || notes.length === 0) {
      throw new Error('Notes array cannot be empty');
    }

    // Clear container
    container.innerHTML = '';

    // Group notes into measures and systems
    const measures = groupNotesIntoMeasures(notes);
    const systems = groupMeasuresIntoSystems(measures, measuresPerSystem);

    // Calculate dynamic height based on number of systems
    const systemHeight = 120;
    const systemSpacing = 20;
    const topPadding = 10;
    const height = topPadding + (systems.length * (systemHeight + systemSpacing));

    // Create SVG renderer
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    // Layout configuration
    const staveWidth = width / measuresPerSystem;
    const keySignature = keyToVexFlowSignature(key);

    // Render each system
    systems.forEach((system, systemIndex) => {
      const systemY = topPadding + (systemIndex * (systemHeight + systemSpacing));

      // Render each measure in the system
      system.forEach((measure, measureIndex) => {
        const measureX = measureIndex * staveWidth;
        const isFirstMeasure = systemIndex === 0 && measureIndex === 0;

        // Create stave for this measure
        const stave = new Stave(measureX, systemY, staveWidth);

        // Add clef to first measure only
        if (isFirstMeasure) {
          stave.addClef(clef);
        }

        // Add key signature to first measure only
        if (isFirstMeasure) {
          stave.addKeySignature(keySignature);
        }

        // Add time signature to first measure only
        if (isFirstMeasure && showTimeSignature) {
          stave.addTimeSignature('4/4');
        }

        // Draw the stave
        stave.setContext(context).draw();

        // Convert notes to StaveNotes
        const staveNotes = formatNotes(measure, clef);

        // Create a voice and add notes to it
        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables(staveNotes);

        // Format and draw the voice
        new Formatter().joinVoices([voice]).format([voice], staveWidth - 100);
        voice.draw(context, stave);
      });
    });
  }

  /**
   * Renders a grand staff (treble + bass) with counterpoint and cantus firmus.
   *
   * @param container - DOM element to render into
   * @param cantusFirmus - Array of cantus firmus notes (displayed on bass staff)
   * @param counterpoint - Array of counterpoint notes (displayed on treble staff)
   * @param key - Musical key for both staves
   * @param options - Rendering options
   * @returns Metadata for click detection
   */
  static renderGrandStaff(
    container: HTMLDivElement,
    cantusFirmus: Note[],
    counterpoint: Note[],
    key: Key,
    options: GrandStaffRenderOptions = {}
  ): RenderMetadata {
    // Apply defaults
    const {
      width = 800,
      measuresPerSystem = 4,
      highlightedNotes = [],
    } = options;

    // Validate inputs
    if (!container) {
      throw new Error('Container element is required');
    }

    if (!cantusFirmus || cantusFirmus.length === 0) {
      throw new Error('Cantus firmus cannot be empty');
    }

    // Clear container
    container.innerHTML = '';

    // Group cantus firmus notes into measures and systems
    const cfMeasures = groupNotesIntoMeasures(cantusFirmus);
    const systems = groupMeasuresIntoSystems(cfMeasures, measuresPerSystem);

    // Group counterpoint notes (may be sparse)
    const cpMeasures = groupNotesIntoMeasures(counterpoint);

    // Layout constants
    const topPadding = 10;
    const trebleStaveYOffset = 10; // Position of treble staff within system
    const bassStaveYOffset = 120; // Position of bass staff within system
    const systemHeight = 200; // Total height of one system
    const systemSpacing = 20;
    const height = topPadding + (systems.length * (systemHeight + systemSpacing));

    // Create SVG renderer
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    // Layout configuration
    const staveWidth = width / measuresPerSystem;
    const keySignature = keyToVexFlowSignature(key);

    // Render each system
    systems.forEach((system, systemIndex) => {
      const systemY = topPadding + (systemIndex * (systemHeight + systemSpacing));

      // Render each measure in the system
      system.forEach((cfMeasure, measureIndexInSystem) => {
        const measureX = measureIndexInSystem * staveWidth;
        const absoluteMeasureIndex = (systemIndex * measuresPerSystem) + measureIndexInSystem;
        const isFirstMeasure = systemIndex === 0 && measureIndexInSystem === 0;

        // Create treble stave for counterpoint
        const trebleStave = new Stave(measureX, systemY + trebleStaveYOffset, staveWidth);

        // Create bass stave for cantus firmus
        const bassStave = new Stave(measureX, systemY + bassStaveYOffset, staveWidth);

        // Add clef, key signature, and time signature to first measure only
        if (isFirstMeasure) {
          trebleStave.addClef('treble');
          trebleStave.addKeySignature(keySignature);
          trebleStave.addTimeSignature('4/4');

          bassStave.addClef('bass');
          bassStave.addKeySignature(keySignature);
          bassStave.addTimeSignature('4/4');
        }

        // Draw both staves
        trebleStave.setContext(context).draw();
        bassStave.setContext(context).draw();

        // Add brace connector on first measure of each system
        if (measureIndexInSystem === 0) {
          const connector = new StaveConnector(trebleStave, bassStave);
          connector.setType(StaveConnector.type.BRACE);
          connector.setContext(context).draw();
        }

        // Render cantus firmus notes on bass staff
        const cfStaveNotes = formatNotes(cfMeasure, 'bass');
        if (cfStaveNotes.length > 0) {
          const cfVoice = new Voice({ num_beats: 4, beat_value: 4 });
          cfVoice.addTickables(cfStaveNotes);
          new Formatter().joinVoices([cfVoice]).format([cfVoice], staveWidth - 100);
          cfVoice.draw(context, bassStave);
        }

        // Render counterpoint notes on treble staff (if any exist for this measure)
        const cpMeasure = cpMeasures[absoluteMeasureIndex];
        if (cpMeasure && cpMeasure.length > 0) {
          const cpStaveNotes = formatNotes(cpMeasure, 'treble');

          // Apply highlighting if requested
          cpStaveNotes.forEach((staveNote, noteIndex) => {
            const globalNoteIndex = counterpoint.findIndex(
              n => n.measureIndex === absoluteMeasureIndex &&
                   cpMeasure[noteIndex] &&
                   n.pitch === cpMeasure[noteIndex].pitch
            );
            if (highlightedNotes.includes(globalNoteIndex)) {
              staveNote.setStyle({ fillStyle: '#2196F3', strokeStyle: '#2196F3' });
            }
          });

          const cpVoice = new Voice({ num_beats: 4, beat_value: 4 });
          cpVoice.setStrict(false);
          cpVoice.addTickables(cpStaveNotes);
          new Formatter().joinVoices([cpVoice]).format([cpVoice], staveWidth - 100);
          cpVoice.draw(context, trebleStave);
        }
      });
    });

    // Return metadata for click detection
    return {
      staveWidth,
      systemHeight,
      systemSpacing,
      trebleStaveY: trebleStaveYOffset,
      bassStaveY: bassStaveYOffset,
      measuresPerSystem,
      topPadding,
    };
  }
}

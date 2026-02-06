import { useEffect, useRef } from 'react';
import { useComposition } from '../../context/CompositionContext';
import { VexFlowService } from '../../services/vexflow/VexFlowService';
import type { RenderOptions } from '../../services/vexflow/types';

interface StaffDisplayProps {
  /**
   * Width of the staff display in pixels
   * @default 800
   */
  width?: number;

  /**
   * Height of the staff display in pixels
   * @default 300
   */
  height?: number;

  /**
   * Whether to show the time signature
   * @default true
   */
  showTimeSignature?: boolean;

  /**
   * Number of measures per system (staff line)
   * @default 4
   */
  measuresPerSystem?: number;
}

/**
 * React component that displays musical notation using VexFlow.
 * Reads the current Cantus Firmus from CompositionContext and renders it on a staff.
 */
export function StaffDisplay({
  width = 800,
  height = 300,
  showTimeSignature = true,
  measuresPerSystem = 4,
}: StaffDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { cantusFirmus, key } = useComposition();

  useEffect(() => {
    // Don't render if no container or no notes
    if (!containerRef.current || !cantusFirmus) {
      return;
    }

    try {
      // Render the staff using VexFlow
      const options: RenderOptions = {
        width,
        height,
        clef: 'bass',
        showTimeSignature,
        measuresPerSystem,
      };

      VexFlowService.render(containerRef.current, cantusFirmus, key, options);
    } catch (error) {
      console.error('VexFlow rendering error:', error);
    }

    // Cleanup function to clear the container
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [cantusFirmus, key, width, height, showTimeSignature, measuresPerSystem]);

  // Show message if no Cantus Firmus has been generated
  if (!cantusFirmus) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        Generate a Cantus Firmus to see notation
      </div>
    );
  }

  return <div ref={containerRef} aria-label="Musical staff notation" />;
}

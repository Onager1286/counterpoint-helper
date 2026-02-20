# Counterpoint Helper

A web application for learning counterpoint composition with real-time analysis and MIDI playback.

## Overview

Counterpoint Helper is an educational tool that helps students learn the art of counterpoint composition following the strict rules from Johann Joseph Fux's "Gradus ad Parnassum". The application provides:

- Automatic Cantus Firmus generation
- Interactive staff notation for composing counterpoint
- Real-time rule checking and analysis
- Support for all five species of counterpoint
- MIDI playback of compositions

## Technology Stack

- **React 18** with **TypeScript** for type-safe UI development
- **Vite** for fast development and optimized builds
- **VexFlow 4.2** for professional music notation rendering
- **Tone.js 14.7** for MIDI playback with web audio synthesis
- Pure client-side application (no backend required)

## Current Implementation Status

### ✓ Completed

- **Phase 1: Foundation & Core Types**
  - TypeScript type definitions for music theory concepts
  - Core utility functions for MIDI conversion, interval calculation
  - Key signature and scale degree handling
  
- **Phase 2: Cantus Firmus Generation**
  - Backtracking algorithm for CF generation
  - Strict Fux rule constraints
  - Validation of generated melodies
  - Support for all major and minor keys
  - Configurable length (4-16 measures)

### 🚧 In Progress

- **Phase 3: VexFlow Integration**
  - Music notation rendering on staff
  - Display of cantus firmus and counterpoint

### 📋 Planned

- **Phase 4: Interactive Note Input** - Click-to-compose interface
- **Phase 5: Rule Engine Core** - Real-time analysis with ~50+ rules
- **Phase 6: All Five Species Rules** - Complete rule coverage
- **Phase 7: MIDI Playback** - Audio playback of compositions
- **Phase 8: Polish & Educational Content** - Educational messages and UI refinement

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
├── core/                       # Pure business logic
│   ├── types/                  # TypeScript definitions
│   ├── models/                 # Data models (Note, Interval)
│   ├── generators/             # Cantus Firmus generation
│   ├── rules/                  # Rule engine (50+ counterpoint rules)
│   ├── analysis/               # Analysis helpers
│   └── utils/                  # Pure utility functions
├── services/                   # External library integrations
│   ├── vexflow/               # VexFlow wrapper
│   └── tonejs/                # Tone.js wrapper
├── hooks/                      # React hooks
├── context/                    # React Context for state management
├── components/                 # React components
└── constants/                  # Application constants
```

## Features

### Cantus Firmus Generator

- Generates valid Cantus Firmus following strict Fux rules
- Configurable key signatures (all major and minor keys)
- Adjustable length (4-16 measures)
- Ensures single climax, proper cadence, and stepwise motion preferences

## Learning Resources

This application implements counterpoint rules from:
- Johann Joseph Fux - "Gradus ad Parnassum" (1725)
- Traditional species counterpoint pedagogy

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

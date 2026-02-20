import { CompositionProvider } from './context/CompositionContext';
import { CantusFirmusGeneratorComponent } from './components/CantusFirmusGenerator/CantusFirmusGenerator';
import { InteractiveStaffDisplay } from './components/InteractiveStaffDisplay';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { SpeciesSelector } from './components/SpeciesSelector';
import { RuleReference } from './components/RuleReference';
import './App.css';

function AppContent() {
  return (
    <div className="app-container">
      {/* Header with decorative flourish */}
      <header className="app-header">
        <div className="header-flourish" aria-hidden="true" />
        <div className="header-content">
          <h1 className="app-title">Counterpoint Helper</h1>
          <p className="app-subtitle">
            Master the art of counterpoint composition
            <span className="subtitle-divider">|</span>
            <em>Following Fux&apos;s &ldquo;Gradus ad Parnassum&rdquo;</em>
          </p>
        </div>
        <div className="header-flourish" aria-hidden="true" />
      </header>

      <main className="app-main">
        <div className="layout-grid">
          <div className="layout-main">
            {/* Score Display Section - The Centerpiece */}
            <section className="section section-score">
              <div className="score-frame">
                <div className="score-frame-corner score-frame-corner-tl" aria-hidden="true" />
                <div className="score-frame-corner score-frame-corner-tr" aria-hidden="true" />
                <div className="score-frame-corner score-frame-corner-bl" aria-hidden="true" />
                <div className="score-frame-corner score-frame-corner-br" aria-hidden="true" />

                <div className="score-header">
                  <h2 className="score-title">Compose Your Counterpoint</h2>
                  <PlaybackControls />
                </div>

                <InteractiveStaffDisplay />
              </div>
            </section>

            {/* Analysis Feedback Section */}
            <section className="section section-analysis">
              <AnalysisPanel />
            </section>
          </div>

          <aside className="layout-side">
            {/* Species Selection */}
            <section className="section section-species">
              <SpeciesSelector />
            </section>

            {/* Cantus Firmus Generator Section */}
            <section className="section section-generator">
              <CantusFirmusGeneratorComponent />
            </section>

            {/* Rule Reference */}
            <section className="section section-rules">
              <RuleReference />
            </section>

          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>
          Studying counterpoint in the tradition of
          <strong> Johann Joseph Fux</strong>
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <CompositionProvider>
      <AppContent />
    </CompositionProvider>
  );
}

export default App;

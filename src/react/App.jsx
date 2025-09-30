import React from 'react';
import { TopScaleBar } from './components/TopScaleBar.jsx';
import { ButtonsFileOps } from './components/ButtonsFileOps.jsx';
import { ButtonsMSA } from './components/ButtonsMSA.jsx';
import { Appearance } from './components/Appearance.jsx';
import { MoviePlayerBar } from './components/movie-player/MoviePlayerBar.jsx';

export function App() {
  return (
    <>
      <div id="top-scale-bar-container">
        <TopScaleBar />
      </div>

      <nav className="nav-drawer" id="navigation-drawer" role="navigation" aria-label="Main navigation">
        <header className="nav-header">
          <div className="nav-title-row">
            <md-icon style={{ fontSize: '24px', color: 'var(--md-sys-color-primary)' }}>movie</md-icon>
            <div style={{ flex: 1 }}>
              <h1 className="nav-title">Phylo-Movies</h1>
              <p className="nav-subtitle">
                File: <span id="compactFileName">Loading...</span>
              </p>
            </div>
            <md-icon-button id="theme-toggle" aria-label="Toggle theme" title="Toggle theme">
              <md-icon id="theme-toggle-icon">computer</md-icon>
            </md-icon-button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <md-list>
            <div style={{ padding: '0 16px 16px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ButtonsFileOps />
              <ButtonsMSA />
            </div>

            <md-divider></md-divider>

            <md-list-item>
              <div slot="overline">SETTINGS</div>
              <div slot="headline" className="md-typescale-headline-small" style={{ color: 'var(--md-sys-color-on-surface)' }}>Appearance</div>
              <md-icon slot="start" style={{ color: 'var(--md-sys-color-primary)' }}>tune</md-icon>
            </md-list-item>
            <div style={{ padding: '0 16px 16px 16px', flex: 1, overflowY: 'auto' }}>
              <Appearance />
            </div>
            <md-divider></md-divider>
          </md-list>
        </div>
      </nav>

      <div className="container">
        <div className="full-size-container">
          <div id="webgl-container" style={{ width: '100%', height: '100%' }}></div>
        </div>
      </div>

      <MoviePlayerBar />
    </>
  );
}

export default App;


import React, { useState, useEffect } from 'react';
import { Progress } from '../../components/ui/progress';
// Imported as a module asset rather than composed from BASE_URL: the Electron
// build uses base './', and this page is served from pages/Splash/, so a
// BASE_URL-relative path resolved against the document pointed two directories
// deep and 404ed in the packaged app. A bundled asset resolves against the
// emitted chunk instead, which is correct at any page depth. The import is the
// canonical brand source that generate-brand-icons.mjs copies to
// public/icons/phylo-tree-icon.svg.
import phyloTreeIcon from '../../../assets/brand/phylo-movies-mark.svg';

const SplashApp = () => {
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const appVersion = import.meta.env.VITE_APP_VERSION || '0.64.0';

  useEffect(() => {
    // Listen for status updates from main process
    if (window.splashAPI) {
      window.splashAPI.onStatusUpdate((_event, { message, progress: progressValue }) => {
        setStatus(message);
        if (progressValue !== undefined) setProgress(progressValue);
      });

      window.splashAPI.onFadeOut(() => {
        setIsFading(true);
      });
    }
  }, []);

  return (
    <div
      className={`h-screen w-screen flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="relative mb-12">
        <img src={phyloTreeIcon} alt="Phylo-Movies" className="w-40 h-40" />
      </div>

      <div className="w-64 flex flex-col items-center">
        <Progress
          value={progress}
          className="h-0.5 bg-slate-200 mb-3 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-400"
        />
        <p className="text-[10px] text-slate-400 tracking-wider h-4">{status}</p>
      </div>

      <div className="absolute bottom-6 text-[9px] text-slate-300 tracking-tight">
        v{appVersion}
      </div>
    </div>
  );
};

export default SplashApp;

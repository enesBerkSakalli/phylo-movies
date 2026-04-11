import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import phyloTreeIcon from '/icons/phylo-tree-icon.svg';

const SplashApp = () => {
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Listen for status updates from main process
    if (window.splashAPI) {
      window.splashAPI.onStatusUpdate((_event, { message, progress }) => {
        setStatus(message);
        if (progress !== undefined) setProgress(progress);
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
        <img
          src={phyloTreeIcon}
          alt="Phylo-Movies"
          className="w-40 h-40"
        />
      </div>

      <div className="w-64 flex flex-col items-center">
        <Progress
          value={progress}
          className="h-0.5 bg-slate-200 mb-3 [&>div]:bg-gradient-to-r [&>div]:from-blue-500 [&>div]:to-cyan-400"
        />
        <p className="text-[10px] text-slate-400 tracking-wider h-4">
          {status}
        </p>
      </div>

      <div className="absolute bottom-6 text-[9px] text-slate-300 tracking-tight">
        v0.64.0
      </div>
    </div>
  );
};

export default SplashApp;

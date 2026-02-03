import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

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
      className={`h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-splash-bg-from via-splash-bg-via to-splash-bg-to text-white transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="relative mb-8">
        <div className="w-32 h-32 relative">
          <svg className="w-full h-full drop-shadow-[0_0_20px_rgba(79,172,254,0.4)]" viewBox="0 0 100 100">
            <path
              d="M50 85 L50 65 M50 65 L30 45 M50 65 L70 45 M30 45 L15 30 M30 45 L45 30 M70 45 L55 30 M70 45 L85 30"
              fill="none"
              stroke="var(--color-splash-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-[draw_2s_ease-out_forwards]"
              style={{ strokeDasharray: 200, strokeDashoffset: 200 }}
            />
            {/* Taxa dots */}
            <circle cx="15" cy="30" r="3" fill="var(--color-splash-accent-bright)" className="animate-in fade-in duration-300 delay-[800ms] fill-mode-forwards opacity-0" />
            <circle cx="45" cy="30" r="3" fill="var(--color-splash-accent-bright)" className="animate-in fade-in duration-300 delay-[1000ms] fill-mode-forwards opacity-0" />
            <circle cx="55" cy="30" r="3" fill="var(--color-splash-accent-bright)" className="animate-in fade-in duration-300 delay-[1200ms] fill-mode-forwards opacity-0" />
            <circle cx="85" cy="30" r="3" fill="var(--color-splash-accent-bright)" className="animate-in fade-in duration-300 delay-[1400ms] fill-mode-forwards opacity-0" />
            <circle cx="50" cy="85" r="3" fill="var(--color-splash-accent-bright)" className="animate-in fade-in duration-300 delay-[1600ms] fill-mode-forwards opacity-0" />
          </svg>
        </div>
      </div>

      <h1 className="text-3xl font-semibold tracking-[2px] bg-gradient-to-r from-splash-accent to-splash-accent-bright bg-clip-text text-transparent mb-2">
        Phylo-Movies
      </h1>

      <p className="text-2xs text-white/60 tracking-widest uppercase mb-12">
        Genetic Evolution Visualizer
      </p>

      <div className="w-72 flex flex-col items-center">
        <Progress
          value={progress}
          className="h-1 bg-white/10 mb-4 [&>div]:bg-gradient-to-r [&>div]:from-splash-accent [&>div]:to-splash-accent-bright"
        />
        <p className="text-2xs text-white/50 tracking-wider h-4 uppercase">
          {status}
        </p>
      </div>

      <div className="absolute bottom-8 text-[10px] text-white/20 tracking-tighter uppercase">
        v0.64.0 • Powered by BranchArchitect
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}} />
    </div>
  );
};

export default SplashApp;

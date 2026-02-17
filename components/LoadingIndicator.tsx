
import React, { useState, useEffect } from 'react';
import { STATUS_MESSAGES } from '../constants';
import { Zap, AlertTriangle } from 'lucide-react';

const LoadingIndicator: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    // Smoother progress increment
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev < 95) {
          const inc = Math.random() * 2 + 0.5;
          return prev + inc;
        }
        return prev;
      });
    }, 400);

    // Rotate status messages (behind the scenes headlines) every 2.5 seconds
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(messageTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-[#05070A] flex flex-col items-center justify-center p-6 font-light" style={{ fontFamily: '"Poppins", sans-serif' }}>
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="relative w-28 h-28 mx-auto">
          <div className="absolute inset-0 border-[3px] border-blue-500/10 rounded-3xl rotate-12"></div>
          <div className="absolute inset-0 border-[3px] border-blue-500/30 rounded-3xl -rotate-6"></div>
          <div
            className="absolute inset-0 border-[3px] border-blue-500 rounded-3xl border-t-transparent animate-spin"
            style={{ animationDuration: '2s' }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={32} className="text-blue-500 fill-blue-500 animate-pulse" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 min-h-[100px] flex flex-col justify-center">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight transition-all duration-500">
              {STATUS_MESSAGES[messageIndex]}
            </h3>
            <p className="text-gray-500 text-sm font-medium h-6 mt-2">
              Priming Your Site...
            </p>
          </div>

          <div className="relative pt-4">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div
              className="absolute top-0 right-0 -mt-1 text-[10px] font-bold text-blue-400 bg-[#05070A] px-2"
              style={{ left: `calc(${progress}% - 20px)` }}
            >
              {Math.floor(progress)}%
            </div>
          </div>

          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-left animate-pulse">
            <div className="shrink-0 w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-amber-500" size={24} />
            </div>
            <div>
              <p className="text-amber-500 font-black text-xs uppercase tracking-widest mb-1">Important Warning</p>
              <p className="text-white text-sm font-bold leading-snug">
                DO NOT MOVE AWAY FROM THE CURRENT PAGE OR THE CUSTOM WEBSITE WILL NOT GENERATE PROPERLY
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;

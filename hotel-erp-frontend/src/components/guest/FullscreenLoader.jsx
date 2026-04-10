import React, { useEffect, useState } from 'react';

const MESSAGES = [
    "Arriving at your sanctuary...",
    "Preparing your bespoke experience...",
    "Setting the scene for your stay...",
    "Aligning your personal preferences...",
    "Curating your digital concierge..."
];

export default function FullscreenLoader() {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % MESSAGES.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div 
            className="bg-white text-on-surface font-body selection:bg-primary-container"
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        >
            <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 bg-white">
                {/* Bright Abstract Background Elements */}
                <div className="absolute top-[-5%] right-[-5%] w-[45rem] h-[45rem] rounded-full bg-primary-container/30 blur-[120px]">
                </div>
                <div className="absolute bottom-[-5%] left-[-5%] w-[40rem] h-[40rem] rounded-full bg-sage-green/5 blur-[120px]">
                </div>

                {/* Central Bright Loading Hub */}
                <div className="relative z-10 flex flex-col items-center glass-panel px-16 py-20 rounded-[3.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.05)] border-white/60">
                    {/* Enhanced Logo Animation Area */}
                    <div className="relative mb-14">
                        {/* Rotating Outer Ring */}
                        <div className="absolute -inset-10 border border-sage-green/20 rounded-full animate-rotate-slow">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-sage-green/60">
                            </div>
                        </div>
                        {/* Middle Static Rings */}
                        <div className="absolute -inset-6 border border-sage-green/10 rounded-full"></div>
                        
                        {/* Main Logo Container */}
                        <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center shadow-xl shadow-sage-green/10 animate-pulse-gentle relative z-20 border border-surface-container-high">
                            <div className="w-28 h-28 rounded-full border border-sage-green/15 flex items-center justify-center bg-white">
                                <span className="material-symbols-outlined text-5xl text-sage-green font-light" style={{ fontVariationSettings: "'wght' 300" }}>spa</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Text Area */}
                    <div className="text-center space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-headline font-semibold tracking-[0.4em] text-on-surface uppercase">
                                Ethereal Sands
                            </h1>
                            <p className="text-[10px] font-label font-bold uppercase tracking-[0.3em] text-sage-green/80">
                                Guest Portal — Welcome Home
                            </p>
                        </div>
                        {/* Dynamic Status Messenger */}
                        <div className="h-6 relative">
                            <p key={messageIndex} className="text-sage-green font-medium italic tracking-wide text-lg animate-status-cycle">
                                {MESSAGES[messageIndex]}
                            </p>
                        </div>
                    </div>

                    {/* Refined Loading Bar */}
                    <div className="mt-14 w-72 h-[2px] bg-sage-green/10 rounded-full overflow-hidden relative">
                        <div className="shimmer h-full w-full bg-sage-green/60"></div>
                    </div>

                    {/* Elegant Guest Indicators */}
                    <div className="mt-12 flex items-center gap-4 opacity-50">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-sage-green"></div>
                            <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface">Curating Ambience</span>
                        </div>
                        <div className="w-4 h-[1px] bg-outline-variant"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-sage-green animate-pulse"></div>
                            <span className="text-[9px] font-label font-bold uppercase tracking-widest text-on-surface">Bespoke Setup</span>
                        </div>
                    </div>
                </div>

                {/* Subtle Footer Text */}
                <div className="absolute bottom-10 z-10">
                    <p className="text-[11px] font-label uppercase tracking-[0.2em] text-on-surface/40">
                        The Digital Concierge at your service
                    </p>
                </div>
            </main>

            {/* Subtle Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')]">
            </div>
        </div>
    );
}

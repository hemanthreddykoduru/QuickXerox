import { Link, useNavigate } from 'react-router-dom';
import {
    Printer,
    Upload,
    MapPin,
    CreditCard,
    CheckCircle,
    ShieldCheck,
    Clock,
    Zap,
    ChevronRight,
    Menu,
    X
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const PAYMENT_STEPS = [
    { step: '01', label: 'Upload', desc: 'Files uploaded to Supabase with a cover page prepended automatically', emoji: '📄', colors: { ring: '#3b82f6', bg: 'from-blue-500 to-blue-600', badge: '#3b82f6', glow: 'rgba(59,130,246,0.35)' } },
    { step: '02', label: 'Order Created', desc: 'Server calculates price from shop settings — client amount ignored', emoji: '🧾', colors: { ring: '#8b5cf6', bg: 'from-violet-500 to-violet-600', badge: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' } },
    { step: '03', label: 'Payment', desc: 'Razorpay processes UPI / card in a secure encrypted checkout', emoji: '💳', colors: { ring: '#10b981', bg: 'from-emerald-500 to-emerald-600', badge: '#10b981', glow: 'rgba(16,185,129,0.35)' } },
    { step: '04', label: 'Webhook', desc: 'Razorpay pings our server; HMAC-SHA256 signature verified', emoji: '🔐', colors: { ring: '#f97316', bg: 'from-orange-500 to-orange-600', badge: '#f97316', glow: 'rgba(249,115,22,0.35)' } },
    { step: '05', label: 'OTP Generated', desc: '4-digit OTP written to Firestore — customer sees it instantly', emoji: '🔑', colors: { ring: '#f43f5e', bg: 'from-rose-500 to-rose-600', badge: '#f43f5e', glow: 'rgba(244,63,94,0.35)' } },
    { step: '06', label: 'Collect', desc: 'Customer shows OTP at the shop — seller verifies and prints released', emoji: '✅', colors: { ring: '#14b8a6', bg: 'from-teal-500 to-teal-600', badge: '#14b8a6', glow: 'rgba(20,184,166,0.35)' } },
];

const CONFETTI_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

/* ─── Celebration Confetti keyframes ─────────────────────────── */
const SUCCESS_ANIMATION_KEYFRAMES = `
@keyframes checkmark-draw {
    0% { stroke-dashoffset: 48; }
    100% { stroke-dashoffset: 0; }
}
@keyframes ring-expand {
    0% { transform: scale(0.5); opacity: 0.8; border-width: 4px; }
    100% { transform: scale(2.5); opacity: 0; border-width: 1px; }
}
@keyframes checkmark-pop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
@keyframes confetti-fall {
    0%   { transform: translate(0,0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(var(--tx), var(--ty)) rotate(var(--r)) scale(0.4); opacity: 0; }
}
@keyframes star-burst {
    0%   { transform: scale(0) rotate(0deg); opacity:1; }
    80%  { opacity: 1; }
    100% { transform: scale(1.6) rotate(360deg); opacity: 0; }
}
`;

const SuccessAnimation = () => {
    const confettiPieces = Array.from({ length: 32 }, (_, i) => {
        const angle = (i / 32) * 360;
        const dist = 70 + Math.random() * 100;
        const tx = Math.round(Math.cos((angle * Math.PI) / 180) * dist);
        const ty = Math.round(Math.sin((angle * Math.PI) / 180) * dist - 20);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = 6 + Math.round(Math.random() * 6);
        const delay = (0.4 + Math.random() * 0.3).toFixed(2); // Delay until checkmark starts
        const dur = (0.8 + Math.random() * 0.5).toFixed(2);
        return { tx, ty, color, size, delay, dur, rot: Math.round(Math.random() * 720 - 360) };
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 30 }}>
            {/* Animated Rings */}
            <div className="absolute w-20 h-20 border-2 border-emerald-400 rounded-full" style={{ animation: 'ring-expand 0.8s ease-out 0.2s both' }} />
            <div className="absolute w-20 h-20 border-4 border-emerald-200 rounded-full" style={{ animation: 'ring-expand 1s ease-out 0.1s both' }} />
            
            {/* Success Checkmark Circle */}
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'checkmark-pop 0.5s cubic-bezier(0.65, 0, 0.45, 1) both' }}>
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17L4 12" style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: 'checkmark-draw 0.4s ease-in-out 0.3s forwards' }} />
                </svg>
            </div>

            {/* Confetti */}
            {confettiPieces.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        width: p.size,
                        height: p.size * 1.4,
                        background: p.color,
                        borderRadius: i % 3 === 0 ? '50%' : '2px',
                        '--tx': `${p.tx}px`,
                        '--ty': `${p.ty}px`,
                        '--r': `${p.rot}deg`,
                        animation: `confetti-fall ${p.dur}s ease-out ${p.delay}s both`,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

const PaymentFlowAnimation = () => {
    const [active, setActive] = useState(0);
    const [dotPct, setDotPct] = useState(0);
    const [celebKey, setCelebKey] = useState(0);   // bump to re-trigger confetti
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const STEP_DURATION = 2200;
    const IS_COLLECT = active === PAYMENT_STEPS.length - 1;

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setActive(prev => {
                const next = (prev + 1) % PAYMENT_STEPS.length;
                if (next === PAYMENT_STEPS.length - 1) setCelebKey(k => k + 1);
                return next;
            });
        }, STEP_DURATION);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    useEffect(() => {
        setDotPct(0);
        const start = Date.now();
        const raf = () => {
            const elapsed = Date.now() - start;
            const pct = Math.min(elapsed / STEP_DURATION, 1);
            setDotPct(pct);
            if (pct < 1) requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
    }, [active]);

    const step = PAYMENT_STEPS[active];
    const progressPct = ((active + 1) / PAYMENT_STEPS.length) * 100;

    return (
        <div className="mb-20">
            {/* Inject keyframes once */}
            <style>{SUCCESS_ANIMATION_KEYFRAMES}</style>

            <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-3">How a Payment Works — Step by Step</p>
            <p className="text-center text-sm text-gray-400 mb-10">Watch the flow animate automatically ↓</p>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-gray-100 rounded-full mb-10 overflow-hidden max-w-2xl mx-auto">
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${step.colors.badge}, ${step.colors.badge}cc)` }}
                />
            </div>

            {/* Step circles row */}
            <div className="relative">
                {/* Animated connector line (desktop only) */}
                <div className="hidden md:block absolute top-10 left-[8.33%] right-[8.33%] h-0.5 bg-gray-100 z-0">
                    <div
                        className="absolute top-1/2 w-3 h-3 rounded-full shadow-lg z-10 transition-opacity duration-300"
                        style={{
                            left: `${Math.min((active / (PAYMENT_STEPS.length - 1) + (active === PAYMENT_STEPS.length - 1 ? 0 : dotPct / (PAYMENT_STEPS.length - 1))) * 100, 100)}%`,
                            background: step.colors.badge,
                            boxShadow: `0 0 8px 3px ${step.colors.glow}`,
                            transform: 'translate(-50%, -50%)',
                            opacity: active === PAYMENT_STEPS.length - 1 && dotPct > 0.5 ? 0 : 1
                        }}
                    />
                    <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${(active / (PAYMENT_STEPS.length - 1)) * 100}%`, background: step.colors.badge }}
                    />
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 relative z-10">
                    {PAYMENT_STEPS.map((s, i) => {
                        const isActive = i === active;
                        const isDone   = i < active;
                        const isCollect = i === PAYMENT_STEPS.length - 1;

                        return (
                            <button
                                key={s.step}
                                onClick={() => {
                                    if (isCollect && !isActive) setCelebKey(k => k + 1);
                                    setActive(i);
                                    if (intervalRef.current) clearInterval(intervalRef.current);
                                    intervalRef.current = setInterval(() => setActive(prev => {
                                        const next = (prev + 1) % PAYMENT_STEPS.length;
                                        if (next === PAYMENT_STEPS.length - 1) setCelebKey(k => k + 1);
                                        return next;
                                    }), STEP_DURATION);
                                }}
                                className="flex flex-col items-center text-center focus:outline-none cursor-pointer"
                            >
                                {/* Icon circle */}
                                <div
                                    className="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 md:mb-3 transition-all duration-500 relative"
                                    style={{
                                        background: isActive
                                            ? `linear-gradient(135deg, ${s.colors.badge}, ${s.colors.badge}cc)`
                                            : isDone ? `${s.colors.badge}22` : '#f3f4f6',
                                        boxShadow: isActive ? `0 0 0 4px ${s.colors.glow}, 0 6px 20px ${s.colors.glow}` : 'none',
                                        transform: isActive ? 'scale(1.15)' : 'scale(1)',
                                    }}
                                >
                                    <span className="text-xl md:text-2xl" style={{ filter: isActive ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' : 'none' }}>
                                        {s.emoji}
                                    </span>
                                    {/* Pulsing ring */}
                                    {isActive && (
                                        <span
                                            className="absolute inset-0 rounded-full animate-ping opacity-30"
                                            style={{ background: s.colors.badge }}
                                        />
                                    )}
                                    {/* Success Animation burst on Collect */}
                                    {isCollect && isActive && <SuccessAnimation key={celebKey} />}
                                </div>

                                <span
                                    className="text-[8px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full mb-1 transition-all duration-300"
                                    style={{
                                        background: isActive ? s.colors.badge : isDone ? `${s.colors.badge}22` : '#e5e7eb',
                                        color: isActive ? '#fff' : isDone ? s.colors.badge : '#9ca3af',
                                    }}
                                >
                                    {s.step}
                                </span>
                                <span
                                    className="text-[10px] md:text-xs font-bold transition-colors duration-300 leading-tight"
                                    style={{ color: isActive ? s.colors.badge : isDone ? '#6b7280' : '#9ca3af' }}
                                >
                                    {s.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active step detail card — special celebration card for Collect */}
            <div
                className="mt-6 md:mt-10 rounded-2xl md:rounded-3xl p-5 md:p-8 transition-all duration-500 border relative overflow-hidden"
                style={{
                    background: IS_COLLECT
                        ? 'linear-gradient(135deg, #0d9488, #14b8a6, #0ea5e9)'
                        : `linear-gradient(135deg, ${step.colors.badge}11, ${step.colors.badge}05)`,
                    borderColor: `${step.colors.badge}33`,
                    boxShadow: IS_COLLECT
                        ? '0 8px 48px rgba(20,184,166,0.45), 0 0 0 2px rgba(20,184,166,0.3)'
                        : `0 4px 32px ${step.colors.glow}`,
                }}
            >
                {/* Celebration sparkle overlay on Collect */}
                {IS_COLLECT && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {['✨','🎉','⭐','🌟','💫','🎊'].map((em, i) => (
                            <span
                                key={i}
                                className="absolute text-xl select-none"
                                style={{
                                    left: `${10 + i * 15}%`,
                                    top: `${15 + (i % 2) * 50}%`,
                                    animation: `star-burst 1.2s ease-out ${i * 0.15}s both`,
                                }}
                            >
                                {em}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-4 relative z-10">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg"
                        style={{
                            background: IS_COLLECT
                                ? 'rgba(255,255,255,0.25)'
                                : `linear-gradient(135deg, ${step.colors.badge}, ${step.colors.badge}cc)`,
                            animation: IS_COLLECT ? 'celebrate-pop 0.5s ease-out both' : 'none',
                        }}
                    >
                        {step.emoji}
                    </div>
                    <div>
                        <div
                            className="text-xs font-black uppercase tracking-widest mb-1"
                            style={{ color: IS_COLLECT ? 'rgba(255,255,255,0.8)' : step.colors.badge }}
                        >
                            {IS_COLLECT ? '🎉 Order Complete!' : `Step ${step.step}`}
                        </div>
                        <h4 className={`text-lg md:text-xl font-black ${IS_COLLECT ? 'text-white' : 'text-gray-900'}`}>
                            {step.label}
                        </h4>
                        <p className={`text-sm mt-0.5 leading-relaxed ${IS_COLLECT ? 'text-teal-100' : 'text-gray-500'}`}>
                            {step.desc}
                        </p>
                    </div>
                    <div className="ml-auto hidden md:flex items-center gap-1">
                        {PAYMENT_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className="rounded-full transition-all duration-300"
                                style={{
                                    width: i === active ? 20 : 6,
                                    height: 6,
                                    background: IS_COLLECT
                                        ? i === active ? '#fff' : 'rgba(255,255,255,0.3)'
                                        : i === active ? step.colors.badge : i < active ? `${step.colors.badge}55` : '#e5e7eb',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LandingPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        // Function to initialize player
        const initPlayer = () => {
            if (!(window as any).YT || !(window as any).YT.Player) return;
            
            new (window as any).YT.Player('youtube-hero-bg', {
                playerVars: {
                    autoplay: 1,
                    mute: 1,
                    controls: 0,
                    showinfo: 0,
                    rel: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    disablekb: 1,
                    enablejsapi: 1,
                    loop: 1,
                    playlist: 'zx5gPgmTUoQ'
                },
                events: {
                    onReady: (event: any) => {
                        event.target.mute();
                        event.target.playVideo();
                    },
                    onStateChange: (event: any) => {
                        // State 1 = Playing
                        if (event.data === (window as any).YT.PlayerState.PLAYING) {
                            setIsVideoReady(true);
                        }
                        // State 0 = ended → seek to 0 and play again instantly
                        if (event.data === (window as any).YT.PlayerState.ENDED) {
                            event.target.seekTo(0);
                            event.target.playVideo();
                        }
                    },
                },
            });
        };

        if (!(window as any).YT) {
            // Load YouTube IFrame API if not present
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            (window as any).onYouTubeIframeAPIReady = initPlayer;
        } else {
            // API already loaded, init directly
            initPlayer();
        }
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">

            {/* Navigation */}
            <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <img src="/favicon.svg" alt="QuickXerox" className="h-8 w-8 sm:h-9 sm:w-9" />
                            <span className="text-xl font-black text-slate-900 tracking-tight">QuickXerox</span>
                        </div>

                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">How it Works</a>
                            <a href="#architecture" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Architecture</a>
                            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Features</a>
                            <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About</a>
                            <div className="flex items-center gap-4 ml-4">
                                <Link to="/login" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">
                                    Log in
                                </Link>
                                <Link
                                    to="/login?mode=signup"
                                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="text-gray-600 hover:text-gray-900 p-2"
                            >
                                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4 shadow-lg absolute w-full">
                        <div className="flex flex-col space-y-4">
                            <a href="#how-it-works" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>How it Works</a>
                            <a href="#architecture" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Architecture</a>
                            <a href="#features" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Features</a>
                            <a href="#about" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>About</a>
                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                                <Link
                                    to="/login"
                                    className="w-full text-center py-3 border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 bg-white"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Log in
                                </Link>
                                <Link
                                    to="/login?mode=signup"
                                    className="w-full text-center py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 shadow-md"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-24 pb-16 lg:pt-40 lg:pb-32 overflow-hidden relative bg-black">
                {/* YouTube Video Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <iframe
                        id="youtube-hero-bg"
                        src="https://www.youtube.com/embed/zx5gPgmTUoQ?autoplay=1&mute=1&controls=0&loop=1&playlist=zx5gPgmTUoQ&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&disablekb=1&enablejsapi=1"
                        allow="autoplay; encrypted-media"
                        title="Hero Background"
                        className={`transition-opacity duration-1000 ${isVideoReady ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            width: 'max(100%, 177.78vh)',
                            height: 'max(56.25vw, 100%)',
                            transform: 'translate(-50%, -50%)',
                            border: 'none',
                        }}
                    />
                    {/* Dark overlay for premium feel */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-300 font-medium text-sm mb-8 animate-fade-in-up backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                        </span>
                        Live Gitam University,Bengaluru
                    </div>

                    <h1 className="text-3xl md:text-7xl font-extrabold text-white tracking-tight mb-6 md:mb-8 leading-tight">
                        Print from <span className="text-blue-400 relative inline-block">
                            Anywhere
                            <svg className="absolute w-full h-3 bottom-1 left-0 text-blue-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5 L 100 10 L 0 10 Z" fill="currentColor" />
                            </svg>
                        </span>,<br className="hidden md:block" /> Pick up Anytime.
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-200 mb-8 md:mb-10 leading-relaxed font-medium">
                        Skip the long lines and USB drive hassles. Upload your documents securely, pay online, and collect your prints from the nearest shop in minutes.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-full hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            Get your prints <ChevronRight className="h-5 w-5" />
                        </button>
                        <a
                            href="#how-it-works"
                            className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white text-lg font-bold rounded-full border border-white/30 hover:bg-white/20 transition-all backdrop-blur-sm"
                        >
                            How it works
                        </a>
                    </div>

                    <div className="mt-10 md:mt-16 grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-3 md:gap-8 text-white text-sm font-semibold max-w-md mx-auto md:max-w-none">
                        <div className="col-span-2 md:col-span-1 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg border border-white/20 shadow-sm justify-center backdrop-blur-sm">
                            <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                            <span className="text-sm font-semibold text-white whitespace-nowrap">No Subscription required <span className="text-blue-400 font-bold ml-1">FREE</span></span>
                        </div>
                        <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 bg-white/15 rounded-lg border border-white/30 shadow-sm justify-center text-center sm:text-left backdrop-blur-sm">
                            <span className="text-gray-300 text-[10px] sm:text-xs font-semibold">Authentication by</span>
                            <img
                                src="https://www.vectorlogo.zone/logos/firebase/firebase-ar21.svg"
                                alt="Firebase"
                                className="h-5 sm:h-6 brightness-0 invert"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 bg-white/15 rounded-lg border border-white/30 shadow-sm justify-center text-center sm:text-left backdrop-blur-sm">
                            <span className="text-gray-300 text-[10px] sm:text-xs font-semibold">Secured by</span>
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg"
                                alt="Razorpay"
                                className="h-5 sm:h-6 brightness-0 invert"
                            />
                        </div>
                    </div>
                </div>

            </section>

            {/* How it Works */}
            <section id="how-it-works" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How QuickXerox Works</h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-16">Get your documents printed in 4 simple steps. No more waiting, no more pendrives.</p>

                    <div className="grid md:grid-cols-4 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200 -z-0"></div>

                        {/* Step 1 */}
                        <div className="relative bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 z-10 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-blue-600 border-4 border-white shadow-sm">
                                <Upload className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">1. Upload</h3>
                            <p className="text-gray-600">Upload your PDF or Docx files securely to our platform from any device.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="relative bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 z-10 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-purple-600 border-4 border-white shadow-sm">
                                <MapPin className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">2. Select Shop</h3>
                            <p className="text-gray-600">Choose a nearby print shop based on price, rating, and distance.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="relative bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 z-10 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-green-600 border-4 border-white shadow-sm">
                                <CreditCard className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">3. Pay Online</h3>
                            <p className="text-gray-600">Securely pay via Razorpay (UPI, Cards). Get an instant OTP for order verification.</p>
                        </div>

                        {/* Step 4 */}
                        <div className="relative bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 z-10 hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-orange-600 border-4 border-white shadow-sm">
                                <Printer className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">4. Collect</h3>
                            <p className="text-gray-600">Show the OTP at the shop and collect your prints instantly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Platform Architecture Section ──────────────────────────── */}
            <section id="architecture" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Header */}
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest rounded-full mb-4 border border-blue-100">Platform Architecture</span>
                        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                            Built for Speed,<br className="hidden md:block" /> Security & Scale
                        </h2>
                        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                            Every request is encrypted, every payment verified server-side, and every file stored privately — here's how it all connects.
                        </p>
                    </div>

                    {/* ── 3 User Roles ── */}
                    <div className="mb-20">
                        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Three Roles. One Platform.</p>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Customer */}
                            <div className="group relative bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl hover:shadow-blue-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
                                <div className="relative">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                        <Upload className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-3">Customer</h3>
                                    <p className="text-blue-100 text-sm leading-relaxed mb-5">Upload documents, pick a shop, pay online, and collect prints with a secure OTP.</p>
                                    <ul className="space-y-2">
                                        {['Upload PDF / DOCX / Images', 'Browse nearby print shops', 'Pay via UPI or Card', 'Get OTP & collect prints'].map(item => (
                                            <li key={item} className="flex items-center gap-2 text-sm text-blue-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Seller */}
                            <div className="group relative bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl hover:shadow-purple-200 transition-all duration-300 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
                                <div className="relative">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                        <Printer className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-3">Shop Owner</h3>
                                    <p className="text-purple-100 text-sm leading-relaxed mb-5">Receive pre-paid orders, verify customer OTP, and manage your shop settings in real time.</p>
                                    <ul className="space-y-2">
                                        {['View incoming orders live', 'Download customer files', 'Verify OTP to release prints', 'Set pricing & business hours'].map(item => (
                                            <li key={item} className="flex items-center gap-2 text-sm text-purple-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-300 flex-shrink-0"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Admin */}
                            <div className="group relative bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-8 text-white overflow-hidden hover:shadow-2xl hover:shadow-slate-300 transition-all duration-300 hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
                                <div className="relative">
                                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                                        <ShieldCheck className="h-7 w-7 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-3">Admin</h3>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-5">Full platform control — manage sellers, audit all activity, create coupons, and configure system settings.</p>
                                    <ul className="space-y-2">
                                        {['Invite & manage sellers', 'View all orders & revenue', 'Create discount coupons', 'Audit logs & system config'].map(item => (
                                            <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"></span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Payment & Data Flow Pipeline — Animated ── */}
                    <PaymentFlowAnimation />

                    <div className="mb-16">
                        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-6 md:mb-8">Powered By</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                            {[
                                { name: 'React + Vite', desc: 'Frontend', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg', bg: 'bg-cyan-50 border-cyan-100 hover:border-cyan-300' },
                                { name: 'Firebase', desc: 'Auth + Database', logo: 'https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg', bg: 'bg-orange-50 border-orange-100 hover:border-orange-300' },
                                { name: 'Supabase', desc: 'File Storage', logo: 'https://www.vectorlogo.zone/logos/supabase/supabase-icon.svg', bg: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
                                { name: 'Razorpay', desc: 'Payments', logo: 'https://cdn.simpleicons.org/razorpay/3395FF', bg: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                                { name: 'Vercel', desc: 'Backend API', logo: 'https://cdn.simpleicons.org/vercel/000000', bg: 'bg-gray-50 border-gray-200 hover:border-gray-400' },
                                { name: 'Mailtrap', desc: 'Email Delivery', logo: 'https://cdn.simpleicons.org/mailtrap/22AD5C', bg: 'bg-yellow-50 border-yellow-100 hover:border-yellow-300' },
                            ].map(tech => (
                                <div key={tech.name} className={`${tech.bg} rounded-2xl p-4 md:p-5 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm text-center flex flex-col items-center justify-center`}>
                                    <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center mb-2 md:mb-3">
                                        <img src={tech.logo} alt={tech.name} className="max-h-full max-w-full object-contain" />
                                    </div>
                                    <div className="font-bold text-gray-900 text-[9px] md:text-[10px] leading-tight">{tech.name}</div>
                                    <div className="text-gray-400 text-[8px] md:text-[9px] mt-0.5">{tech.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Security Highlights ── */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 md:p-12 text-white">
                        <div className="text-center mb-10">
                            <ShieldCheck className="h-10 w-10 text-blue-400 mx-auto mb-4" />
                            <h3 className="text-2xl md:text-3xl font-black mb-2">Security First, Always</h3>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">Every layer of QuickXerox is designed to protect your data and your money.</p>
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            {[
                                { icon: '🔐', title: 'HMAC Webhook Verification', desc: 'Every Razorpay event is cryptographically signed before any order update.' },
                                { icon: '🧮', title: 'Server-Side Pricing', desc: 'Prices are calculated on our server from shop settings — never from client input.' },
                                { icon: '🔒', title: 'Private File Storage', desc: 'Your files are stored privately on Supabase. Only accessible via time-limited signed URLs.' },
                                { icon: '🛡️', title: 'Role-Based Access', desc: 'Firestore rules ensure customers, sellers, and admins can only access their own data.' },
                            ].map(item => (
                                <div key={item.title} className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="text-2xl mb-3">{item.icon}</div>
                                    <h4 className="font-bold text-white text-sm mb-2">{item.title}</h4>
                                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose QuickXerox?</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">We're not just another file uploader. We're a complete printing solution designed for speed and privacy.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="bg-gray-50 p-6 md:p-8 rounded-2xl hover:bg-blue-50 transition-colors group">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Zap className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Upload in seconds. We optimize your files for printing instantly. By the time you reach the shop, your prints are ready.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-gray-50 p-6 md:p-8 rounded-2xl hover:bg-purple-50 transition-colors group">
                            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Bank-Grade Security</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Your files are encrypted during upload and automatically deleted from our servers 24 hours after printing.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-gray-50 p-6 md:p-8 rounded-2xl hover:bg-green-50 transition-colors group">
                            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                <Clock className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">24/7 Availability</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Upload your files anytime, day or night. Schedule your pickup for when the shop opens or whenever you're free.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About / The Big Idea */}
            <section id="about" className="py-24 bg-gray-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                        <div className="mb-12 lg:mb-0 relative">
                            <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-100 rounded-full z-0 opacity-50"></div>
                            <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-purple-100 rounded-full z-0 opacity-50"></div>
                            <img
                                src="https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
                                alt="Student Printing"
                                className="rounded-2xl shadow-2xl relative z-10"
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Built for Students, by Student.</h2>
                            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                We noticed a problem: Getting prints before a deadline is stressful. Long queues, broken printers, "send via WhatsApp/Email" confusion, and finding change for payments.
                            </p>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                <span className="font-semibold text-gray-900">QuickXerox changes that.</span> We connect you directly to local print shops. You upload your files, we handle the payment and file transfer securely. The shop keeps your prints ready. You just walk in, show a code, and walk out.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start">
                                    <Zap className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Save Time</h4>
                                        <p className="text-gray-600">No more standing in queues waiting for your turn.</p>
                                    </div>
                                </li>
                                <li className="flex items-start">
                                    <ShieldCheck className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-gray-900">Privacy First</h4>
                                        <p className="text-gray-600">Files are deleted automatically 24 hours after printing.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to print smarter?</h2>
                    <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                        Join thousands of students and professionals who trust QuickXerox for their daily printing needs.
                    </p>
                    <button
                        onClick={() => navigate('/login?mode=signup')}
                        className="px-10 py-5 bg-white text-blue-600 text-lg font-bold rounded-full hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                        Create Free Account
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <img src="/favicon.svg" alt="QuickXerox" className="h-6 w-6" />
                                <span className="text-xl font-black tracking-tight">QuickXerox</span>
                            </div>
                            <p className="text-gray-400 max-w-md">
                                Simplifying the printing experience for everyone. Fast, reliable, and secure document printing services at your fingertips.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-4">Company</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#about" className="hover:text-blue-400 transition-colors">About Us</a></li>
                                <li><Link to="/contact" className="hover:text-blue-400 transition-colors">Contact</Link></li>
                                <li><Link to="/terms" className="hover:text-blue-400 transition-colors">Terms of Service</Link></li>
                                <li><Link to="/privacy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-lg mb-4">Connect</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="mailto:help-contact@quickxerox.app" className="hover:text-blue-400 transition-colors">help-contact@quickxerox.app</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">Twitter</a></li>
                                <li><a href="#" className="hover:text-blue-400 transition-colors">LinkedIn</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                        <p>&copy; {new Date().getFullYear()} QuickXerox. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;

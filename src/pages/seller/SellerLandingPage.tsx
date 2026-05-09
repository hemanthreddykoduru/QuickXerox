import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    TrendingUp,
    Smartphone,
    DollarSign,
    Menu,
    X,
    CheckCircle,
    ArrowRight,
    Zap,
    ShieldCheck,
    Cpu,
    Globe,
    Layers,
    Lock
} from 'lucide-react';

const PAYMENT_STEPS = [
    { step: '01', label: 'Upload', desc: 'Files uploaded to Supabase with a cover page prepended automatically', emoji: '📄', colors: { ring: '#3b82f6', bg: 'from-blue-500 to-blue-600', badge: '#3b82f6', glow: 'rgba(59,130,246,0.35)' } },
    { step: '02', label: 'Order Created', desc: 'Server calculates price from shop settings — client amount ignored', emoji: '🧾', colors: { ring: '#8b5cf6', bg: 'from-violet-500 to-violet-600', badge: '#8b5cf6', glow: 'rgba(139,92,246,0.35)' } },
    { step: '03', label: 'Payment', desc: 'Razorpay processes UPI / card in a secure encrypted checkout', emoji: '💳', colors: { ring: '#10b981', bg: 'from-emerald-500 to-emerald-600', badge: '#10b981', glow: 'rgba(16,185,129,0.35)' } },
    { step: '04', label: 'Webhook', desc: 'Razorpay pings our server; HMAC-SHA256 signature verified', emoji: '🔐', colors: { ring: '#f97316', bg: 'from-orange-500 to-orange-600', badge: '#f97316', glow: 'rgba(249,115,22,0.35)' } },
    { step: '05', label: 'OTP Generated', desc: '4-digit OTP written to Firestore — customer sees it instantly', emoji: '🔑', colors: { ring: '#f43f5e', bg: 'from-rose-500 to-rose-600', badge: '#f43f5e', glow: 'rgba(244,63,94,0.35)' } },
    { step: '06', label: 'Collect', desc: 'Customer shows OTP at the shop — seller verifies and prints released', emoji: '✅', colors: { ring: '#14b8a6', bg: 'from-teal-500 to-teal-600', badge: '#14b8a6', glow: 'rgba(20,184,166,0.35)' } },
];

const CONFETTI_COLORS = ['#f43f5e', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

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
`;

const SuccessAnimation = () => {
    const confettiPieces = Array.from({ length: 32 }, (_, i) => {
        const angle = (i / 32) * 360;
        const dist = 70 + Math.random() * 100;
        const tx = Math.round(Math.cos((angle * Math.PI) / 180) * dist);
        const ty = Math.round(Math.sin((angle * Math.PI) / 180) * dist - 20);
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const size = 6 + Math.round(Math.random() * 6);
        const delay = (0.4 + Math.random() * 0.3).toFixed(2);
        const dur = (0.8 + Math.random() * 0.5).toFixed(2);
        return { tx, ty, color, size, delay, dur, rot: Math.round(Math.random() * 720 - 360) };
    });

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 30 }}>
            <div className="absolute w-20 h-20 border-2 border-emerald-400 rounded-full" style={{ animation: 'ring-expand 0.8s ease-out 0.2s both' }} />
            <div className="absolute w-20 h-20 border-4 border-emerald-200 rounded-full" style={{ animation: 'ring-expand 1s ease-out 0.1s both' }} />
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg" style={{ animation: 'checkmark-pop 0.5s cubic-bezier(0.65, 0, 0.45, 1) both' }}>
                <svg className="w-10 h-10 md:w-12 md:h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17L4 12" style={{ strokeDasharray: 48, strokeDashoffset: 48, animation: 'checkmark-draw 0.4s ease-in-out 0.3s forwards' }} />
                </svg>
            </div>
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
    const [celebKey, setCelebKey] = useState(0);
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
            <style>{SUCCESS_ANIMATION_KEYFRAMES}</style>
            <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-3">How the System Works — Step by Step</p>
            <p className="text-center text-sm text-gray-400 mb-10">Watch the flow animate automatically ↓</p>

            <div className="relative h-1.5 bg-gray-100 rounded-full mb-10 overflow-hidden max-w-2xl mx-auto">
                <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${step.colors.badge}, ${step.colors.badge}cc)` }}
                />
            </div>

            <div className="relative">
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
                                    {isActive && (
                                        <span
                                            className="absolute inset-0 rounded-full animate-ping opacity-30"
                                            style={{ background: s.colors.badge }}
                                        />
                                    )}
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
                {IS_COLLECT && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-4 left-4 animate-bounce text-yellow-300 text-2xl">✨</div>
                        <div className="absolute bottom-4 right-4 animate-bounce text-yellow-300 text-2xl" style={{ animationDelay: '0.5s' }}>✨</div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
                    </div>
                )}

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${IS_COLLECT ? 'bg-white/20 text-white' : 'bg-gray-900 text-white'}`}>
                                    Step {step.step}
                                </span>
                                {IS_COLLECT && (
                                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest bg-yellow-400 text-teal-900 animate-pulse">
                                        🚀 Order Complete!
                                    </span>
                                )}
                            </div>
                            <h3 className={`text-2xl md:text-4xl font-black mb-3 ${IS_COLLECT ? 'text-white' : 'text-gray-900'}`}>{step.label}</h3>
                            <p className={`text-base md:text-lg max-w-xl ${IS_COLLECT ? 'text-teal-50' : 'text-gray-600'}`}>{step.desc}</p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`w-1 h-12 rounded-full ${IS_COLLECT ? 'bg-white/20' : 'bg-gray-100'}`} />
                            <div className="text-right flex flex-col items-end">
                                <div className="flex -space-x-2 mb-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div
                                            key={i}
                                            className="w-4 h-1.5 rounded-full transition-all duration-300"
                                            style={{
                                                background: i <= (active + 1) ? step.colors.badge : '#e5e7eb',
                                                opacity: i <= (active + 1) ? 1 : 0.3
                                            }}
                                        />
                                    ))}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-tighter ${IS_COLLECT ? 'text-teal-100' : 'text-gray-400'}`}>System Integrity: Verified</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SellerLandingPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">
            {/* Navigation */}
            <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                            <img src="/favicon.svg" alt="QuickXerox" className="h-8 w-8 sm:h-9 sm:w-9" />
                            <span className="text-xl font-black text-slate-900 tracking-tight">QuickXerox <span className="text-indigo-600">Partner</span></span>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#benefits" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Benefits</a>
                            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Architecture</a>
                            <a href="#faq" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">FAQ</a>
                            <div className="flex items-center gap-4 ml-4">
                                <Link to="/seller/login" className="text-gray-900 font-semibold hover:text-blue-600 transition-colors">
                                    Login
                                </Link>
                                <a
                                    href="mailto:partner@quickxerox.app"
                                    className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                >
                                    Register Shop
                                </a>
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
                            <a href="#benefits" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Benefits</a>
                            <a href="#how-it-works" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>Architecture</a>
                            <a href="#faq" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>FAQ</a>
                            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                                <Link
                                    to="/seller/login"
                                    className="w-full text-center py-3 border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <a
                                    href="mailto:partner@quickxerox.app"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="w-full text-center py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 block"
                                >
                                    Register Shop
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium text-sm mb-8 animate-fade-in-up">
                        <TrendingUp className="h-4 w-4" /> Grow your printing business
                    </div>
                    <h1 className="text-3xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
                        Partner with QuickXerox,<br /> <span className="text-blue-600">Grow Your Business.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-10 leading-relaxed font-medium">
                        Join the fastest growing network of print shops. Get more orders, automated payments, and a seamless workflow—all with zero setup cost.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="mailto:partner@quickxerox.app"
                            className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-full hover:bg-blue-700 shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                        >
                            Register Your Shop <ArrowRight className="h-5 w-5" />
                        </a>
                        <a
                            href="#how-it-works"
                            className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 text-lg font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-all hover:border-gray-300"
                        >
                            View Architecture
                        </a>
                    </div>

                    <div className="mt-16 flex flex-wrap justify-center gap-4 md:gap-8 text-sm font-semibold text-gray-700">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>Zero Joining Fee</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>Weekly Settlements</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>24/7 Support</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                            <span className="text-gray-500 text-xs font-semibold">Verified by</span>
                            <img
                                src="https://cdn.simpleicons.org/razorpay/3395FF"
                                alt="Razorpay"
                                className="h-4"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform Trust / Architecture Section */}
            <section id="how-it-works" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Platform Architecture</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">A robust, secure pipeline designed for high-volume fulfillment.</p>
                    </div>

                    <PaymentFlowAnimation />

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-4 gap-6 mb-20">
                        {[
                            { icon: <ShieldCheck className="text-emerald-500" />, title: 'HMAC Security', desc: 'Every payment is cryptographically verified on our server' },
                            { icon: <Zap className="text-amber-500" />, title: 'Real-time Sync', desc: 'Orders appear on your dashboard the second they are paid' },
                            { icon: <Lock className="text-blue-500" />, title: 'Private Storage', desc: 'Documents stored in encrypted buckets with signed access' },
                            { icon: <Cpu className="text-indigo-500" />, title: 'Serverless Scale', desc: 'Built on Vercel Edge for zero downtime and instant loading' }
                        ].map((feat, i) => (
                            <div key={i} className="p-6 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4">
                                    {feat.icon}
                                </div>
                                <h3 className="font-bold text-gray-900 mb-2">{feat.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Powered By Section */}
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
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-24 bg-gray-50/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Why Partner with Us?</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">We provide the technology you need to modernize your shop and increase revenue.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 bg-white rounded-3xl hover:bg-blue-50/50 transition-all duration-300 border border-gray-100 hover:border-blue-200 hover:shadow-xl group">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 transition-transform"><TrendingUp size={32} /></div>
                            <h3 className="text-2xl font-black mb-4 text-gray-900">Increased Income</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">Get orders directly from students and professionals nearby. No marketing needed from your side.</p>
                        </div>
                        <div className="p-8 bg-white rounded-3xl hover:bg-emerald-50/50 transition-all duration-300 border border-gray-100 hover:border-emerald-200 hover:shadow-xl group">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform"><DollarSign size={32} /></div>
                            <h3 className="text-2xl font-black mb-4 text-gray-900">Guaranteed Payments</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">All orders are prepaid. Receive payments directly to your bank account securely and on time.</p>
                        </div>
                        <div className="p-8 bg-white rounded-3xl hover:bg-indigo-50/50 transition-all duration-300 border border-gray-100 hover:border-indigo-200 hover:shadow-xl group">
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 transition-transform"><Smartphone size={32} /></div>
                            <h3 className="text-2xl font-black mb-4 text-gray-900">Digital Workflow</h3>
                            <p className="text-gray-600 leading-relaxed font-medium">Manage orders via our easy-to-use seller dashboard. Say goodbye to WhatsApp confusion.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">FAQ</h2>
                        <p className="text-lg text-gray-600 font-medium">Common questions from our partners.</p>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-blue-100 transition-all">
                            <h3 className="font-black text-xl mb-3 text-gray-900">Is there a joining fee?</h3>
                            <p className="text-gray-600 font-medium">No, joining QuickXerox is completely free for shop owners. We only charge a small commission on successful orders.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-blue-100 transition-all">
                            <h3 className="font-black text-xl mb-3 text-gray-900">When do I get paid?</h3>
                            <p className="text-gray-600 font-medium">Payments are settled to your registered bank account on a weekly basis, or you can request an on-demand payout.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 hover:border-blue-100 transition-all">
                            <h3 className="font-black text-xl mb-3 text-gray-900">Do I need special software?</h3>
                            <p className="text-gray-600 font-medium">No, you just need a computer or a smartphone with internet access to view the partner dashboard and manage orders.</p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <p className="text-gray-500 font-bold mb-6">Still have questions?</p>
                        <a href="mailto:help-contact@quickxerox.app" className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-blue-50 text-blue-600 font-black hover:bg-blue-100 transition-all">
                            Contact Partner Support <ArrowRight size={20} />
                        </a>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-blue-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-900/50"></div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to grow your business?</h2>
                    <p className="text-xl text-blue-100 mb-10">Join hundreds of print shops already benefiting from QuickXerox.</p>
                    <a
                        href="mailto:partner@quickxerox.app"
                        className="w-full md:w-auto px-10 py-5 bg-white text-blue-900 text-lg font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 inline-block"
                    >
                        Create Partner Account
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-950 text-white py-12 border-t border-gray-900 text-center">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-gray-500 mb-4">&copy; {new Date().getFullYear()} QuickXerox Partner. All rights reserved.</p>
                    <div className="flex justify-center gap-8 text-gray-400 text-sm">
                        <Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link>
                        <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SellerLandingPage;

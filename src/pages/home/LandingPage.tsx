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
import { useState } from 'react';

const LandingPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900">

            {/* Navigation */}
            <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="bg-blue-600 p-2 rounded-lg">
                                <Printer className="h-6 w-6 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xl font-bold tracking-tight">QuickXerox</span>
                        </div>

                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">How it Works</a>
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
            <section className="pt-24 pb-16 lg:pt-40 lg:pb-32 overflow-hidden relative">
                {/* Video Background - Moved to top of section for better stacking control */}
                <div className="absolute inset-0 overflow-hidden">
                    <video
                        autoPlay
                        loop
                        muted={true}
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src="/hero.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 border border-blue-100 text-blue-700 font-medium text-sm mb-8 animate-fade-in-up backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        Live Gitam University,Bengaluru
                    </div>

                    <h1 className="text-3xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6 md:mb-8 leading-tight">
                        Print from <span className="text-blue-600 relative inline-block">
                            Anywhere
                            <svg className="absolute w-full h-3 bottom-1 left-0 text-blue-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5 L 100 10 L 0 10 Z" fill="currentColor" />
                            </svg>
                        </span>,<br className="hidden md:block" /> Pick up Anytime.
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-900 mb-8 md:mb-10 leading-relaxed font-medium">
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
                            className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 text-lg font-bold rounded-full border border-gray-200 hover:bg-gray-50 transition-all hover:border-gray-300"
                        >
                            How it works
                        </a>
                    </div>

                    <div className="mt-10 md:mt-16 grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-3 md:gap-8 text-gray-800 text-sm font-semibold max-w-md mx-auto md:max-w-none">
                        <div className="col-span-2 md:col-span-1 flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">No Subscription required <span className="text-blue-600 font-bold ml-1">FREE</span></span>
                        </div>
                        <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm justify-center text-center sm:text-left">
                            <span className="text-gray-500 text-[10px] sm:text-xs font-semibold">Authentication by</span>
                            <img
                                src="https://www.vectorlogo.zone/logos/firebase/firebase-ar21.svg"
                                alt="Firebase"
                                className="h-5 sm:h-6"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-2 sm:px-4 py-2 bg-white rounded-lg border border-blue-100 shadow-sm justify-center text-center sm:text-left">
                            <span className="text-gray-500 text-[10px] sm:text-xs font-semibold">Secured by</span>
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg"
                                alt="Razorpay"
                                className="h-5 sm:h-6"
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
                            <div className="flex items-center gap-2 mb-4">
                                <Printer className="h-6 w-6 text-blue-500" />
                                <span className="text-xl font-bold">QuickXerox</span>
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

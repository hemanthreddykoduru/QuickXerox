import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    TrendingUp,
    Smartphone,
    DollarSign,
    Menu,
    X,
    CheckCircle,
    ArrowRight
} from 'lucide-react';

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
                            <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">How it Works</a>
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
                            <a href="#how-it-works" className="text-gray-600 font-medium py-2" onClick={() => setIsMenuOpen(false)}>How it Works</a>
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
                            How it Works
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
                            <span className="text-gray-500 text-xs font-semibold">Secured by</span>
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg"
                                alt="Razorpay"
                                className="h-5"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Partner with Us?</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">We provide the technology you need to modernize your shop and increase revenue.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 md:p-8 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors border border-gray-100">
                            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-6"><TrendingUp size={28} /></div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">Increased Income</h3>
                            <p className="text-gray-600 leading-relaxed">Get orders directly from students and professionals nearby. No marketing needed from your side.</p>
                        </div>
                        <div className="p-6 md:p-8 bg-gray-50 rounded-2xl hover:bg-green-50 transition-colors border border-gray-100">
                            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-6"><DollarSign size={28} /></div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">Guaranteed Payments</h3>
                            <p className="text-gray-600 leading-relaxed">All orders are prepaid. Receive payments directly to your bank account securely and on time.</p>
                        </div>
                        <div className="p-6 md:p-8 bg-gray-50 rounded-2xl hover:bg-purple-50 transition-colors border border-gray-100">
                            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6"><Smartphone size={28} /></div>
                            <h3 className="text-xl font-bold mb-3 text-gray-900">Digital Workflow</h3>
                            <p className="text-gray-600 leading-relaxed">Manage orders via our easy-to-use seller dashboard. Say goodbye to WhatsApp confusion.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="how-it-works" className="py-24 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">How it Works for Sellers</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Start accepting orders in 4 simple steps.</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: 1, title: 'Register', desc: 'Sign up and list your shop details and printing prices.' },
                            { step: 2, title: 'Receive Orders', desc: 'Get notified instantly when a user places a print order near you.' },
                            { step: 3, title: 'Print & Pack', desc: 'Download files securely, print them, and keep the order ready.' },
                            { step: 4, title: 'Handover', desc: 'Verify the customer\'s OTP and handover the prints.' }
                        ].map((item) => (
                            <div key={item.step} className="text-center relative">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 shadow-sm mx-auto mb-6 border-4 border-blue-50">
                                    {item.step}
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-gray-900">{item.title}</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-24 bg-white">
                <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Is there a joining fee?</h3>
                            <p className="text-gray-600">No, joining QuickXerox is completely free for shop owners. We only charge a small commission on successful orders.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">When do I get paid?</h3>
                            <p className="text-gray-600">Payments are settled to your registered bank account on a weekly basis, or you can request an on-demand payout.</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Do I need special software?</h3>
                            <p className="text-gray-600">No, you just need a computer or a smartphone with internet access to view the partner dashboard and manage orders.</p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <p className="text-gray-600 mb-6">Still have questions?</p>
                        <a href="mailto:help-contact@quickxerox.app" className="font-semibold text-blue-600 hover:text-blue-700">Contact Partner Support</a>
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

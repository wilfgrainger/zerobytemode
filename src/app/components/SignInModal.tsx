import { FormEvent, useEffect } from "react";
import Image from "next/image";

interface SignInModalProps {
    showSignIn: boolean;
    setShowSignIn: (show: boolean) => void;
    email: string;
    setEmail: (email: string) => void;
    isLoginLoading: boolean;
    loginSent: boolean;
    setLoginSent: (sent: boolean) => void;
    handleSignIn: (e: FormEvent) => void;
    rememberMe: boolean;
    setRememberMe: (v: boolean) => void;
}

export function SignInModal({
    showSignIn,
    setShowSignIn,
    email,
    setEmail,
    isLoginLoading,
    loginSent,
    setLoginSent,
    handleSignIn,
    rememberMe,
    setRememberMe,
}: SignInModalProps) {
    useEffect(() => {
        if (!showSignIn) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowSignIn(false);
                setLoginSent(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showSignIn, setShowSignIn, setLoginSent]);

    if (!showSignIn) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="signin-modal-title" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-white border border-slate-900/10 relative shadow-2xl rounded-2xl overflow-hidden">

                {/* Brand gradient top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />

                <div className="p-8">
                    {/* Header with logo */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 p-1 bg-slate-900/5 rounded-xl border border-slate-900/10">
                                <Image src="/logo.svg" alt="Logo" width={30} height={30} className="w-full h-full" />
                            </div>
                            <span className="font-bold text-sm tracking-tight text-slate-900">ZeroByteMode</span>
                        </div>
                        <button
                            onClick={() => {
                                setShowSignIn(false);
                                setLoginSent(false);
                            }}
                            aria-label="Close"
                            className="w-8 h-8 flex items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {!loginSent ? (
                        <>
                            <h2 id="signin-modal-title" className="text-xl font-bold mb-1 tracking-tight text-slate-900">Sign in to your account</h2>
                            <p className="text-slate-500 text-sm mb-6">Enter your email to receive a secure magic link.</p>

                            <form onSubmit={handleSignIn} className="space-y-3">
                                <label htmlFor="email" className="sr-only">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
                                />

                                {/* Remember me */}
                                <label
                                    htmlFor="remember-me"
                                    className="flex items-center gap-3 cursor-pointer group select-none"
                                >
                                    <div className="relative shrink-0">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center
                                            ${rememberMe
                                                ? 'bg-violet-600 border-violet-600'
                                                : 'bg-slate-50 border-slate-300 group-hover:border-violet-400'
                                            }`}
                                        >
                                            {rememberMe && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                                        Remember me for 30 days
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoginLoading}
                                    className="w-full h-12 bg-gradient-to-r from-violet-600 via-pink-600 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoginLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : "Send Magic Link →"}
                                </button>
                            </form>
                            <p className="text-[11px] text-slate-400 text-center mt-4">No password needed. Link expires in 15 minutes.</p>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-xl font-bold mb-2 tracking-tight text-slate-900">Check your email</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Sent to <span className="text-slate-900 font-semibold">{email}</span>.<br />Click the link to access your account.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

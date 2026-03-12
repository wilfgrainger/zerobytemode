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
        <div role="dialog" aria-modal="true" aria-labelledby="signin-modal-title" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#161616] border border-[#2A2A2A] relative shadow-2xl rounded-xl overflow-hidden">

                {/* Brand accent top bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

                <div className="p-8">
                    {/* Header with logo */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 p-1 bg-white/5 rounded-lg border border-[#2A2A2A]">
                                <Image src="/logo.svg" alt="Logo" width={30} height={30} className="w-full h-full" />
                            </div>
                            <span className="font-bold text-sm tracking-tight text-zinc-200 font-[family-name:var(--font-syne)]">ZeroByteMode</span>
                        </div>
                        <button
                            onClick={() => {
                                setShowSignIn(false);
                                setLoginSent(false);
                            }}
                            aria-label="Close"
                            className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-zinc-200 transition-all border border-white/5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {!loginSent ? (
                        <>
                            <h2 id="signin-modal-title" className="text-xl font-bold mb-1 tracking-tight text-zinc-100 font-[family-name:var(--font-syne)]">Sign in to your account</h2>
                            <p className="text-zinc-500 text-sm mb-6">Enter your email to receive a secure magic link.</p>

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
                                    className="w-full h-12 bg-black/40 border border-[#2A2A2A] rounded-lg px-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono"
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
                                        <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center
                                            ${rememberMe
                                                ? 'bg-amber-500 border-amber-500'
                                                : 'bg-transparent border-zinc-600 group-hover:border-amber-500/50'
                                            }`}
                                        >
                                            {rememberMe && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                        Remember me for 30 days
                                    </span>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isLoginLoading}
                                    className="w-full h-12 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-[family-name:var(--font-syne)]"
                                >
                                    {isLoginLoading ? (
                                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : "Send Magic Link →"}
                                </button>
                            </form>
                            <p className="text-[11px] text-zinc-600 text-center mt-4 font-mono">No password needed. Link expires in 15 minutes.</p>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-xl font-bold mb-2 tracking-tight text-zinc-100 font-[family-name:var(--font-syne)]">Check your email</h2>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Sent to <span className="text-amber-400 font-semibold">{email}</span>.<br />Click the link to access your account.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

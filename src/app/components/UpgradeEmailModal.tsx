import { useEffect } from "react";

interface UpgradeEmailModalProps {
    showUpgradeEmailModal: boolean;
    setShowUpgradeEmailModal: (show: boolean) => void;
    setEmail: (email: string) => void;
    handleGetPro: (email?: string) => void;
}

export function UpgradeEmailModal({
    showUpgradeEmailModal,
    setShowUpgradeEmailModal,
    setEmail,
    handleGetPro
}: UpgradeEmailModalProps) {
    useEffect(() => {
        if (!showUpgradeEmailModal) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowUpgradeEmailModal(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showUpgradeEmailModal, setShowUpgradeEmailModal]);

    if (!showUpgradeEmailModal) return null;

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-white/60 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-sm glass-panel bg-white p-8 border border-slate-900/10 relative shadow-2xl rounded-3xl">
                <ModalCloseButton
                    onClick={() => setShowUpgradeEmailModal(false)}
                    className="absolute top-6 right-6 text-slate-500 hover:text-slate-900 transition-colors"
                    size={20}
                />

                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                </div>
                <h2 id="upgrade-modal-title" className="text-2xl font-bold mb-2 tracking-tight text-slate-900">Activate Pro Compression</h2>
                <p className="text-slate-600 text-sm mb-8">Enter your email to continue to secure checkout. This will be your account ID.</p>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const emailInput = formData.get("upgrade-email") as string;
                        if (emailInput) {
                            setEmail(emailInput);
                            handleGetPro(emailInput);
                        }
                    }}
                    className="space-y-4"
                >
                    <label htmlFor="upgrade-email" className="sr-only">Email address</label>
                    <input
                        id="upgrade-email"
                        name="upgrade-email"
                        type="email"
                        placeholder="you@email.com"
                        required
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        className="w-full h-12 bg-slate-50 border border-slate-900/10 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900/20 transition-colors"
                    />
                    <button
                        type="submit"
                        className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                        Continue to Checkout
                    </button>
                </form>
            </div>
        </div>
    );
}

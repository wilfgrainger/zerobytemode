import { useEffect } from "react";
import { ModalCloseButton } from "./ui";

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
        <div role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title" className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-[#161616] p-8 border border-[#2A2A2A] relative shadow-2xl rounded-xl">
                <ModalCloseButton
                    onClick={() => setShowUpgradeEmailModal(false)}
                    className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-200 transition-colors"
                    size={20}
                />

                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8A55D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                </div>
                <h2 id="upgrade-modal-title" className="text-2xl font-bold mb-2 tracking-tight text-zinc-100 font-[family-name:var(--font-syne)]">Activate Pro Compression</h2>
                <p className="text-zinc-500 text-sm mb-8">Enter your email to continue to secure checkout. This will be your account ID.</p>

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
                        className="w-full h-12 bg-black/40 border border-[#2A2A2A] rounded-lg px-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
                    />
                    <button
                        type="submit"
                        className="w-full h-12 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 font-[family-name:var(--font-syne)]"
                    >
                        Continue to Checkout
                    </button>
                </form>
            </div>
        </div>
    );
}
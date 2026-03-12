import { FormEvent, useState, useEffect } from "react";
import Image from "next/image";
import { WORKER_URL } from "@/src/lib/constants";
import { GradientBar, LoadingSpinner, ModalCloseButton, SuccessIcon } from "./ui";

interface SupportModalProps {
    showSupportModal: boolean;
    setShowSupportModal: (show: boolean) => void;
    userEmail: string;
}

export function SupportModal({
    showSupportModal,
    setShowSupportModal,
    userEmail,
}: SupportModalProps) {
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState(userEmail || "");
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!showSupportModal) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowSupportModal(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showSupportModal, setShowSupportModal]);

    if (!showSupportModal) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !email.trim()) return;

        setIsSending(true);
        setError(null);

        try {
            const response = await fetch(`${WORKER_URL}/support`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, message }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSent(true);
                setTimeout(() => {
                    setShowSupportModal(false);
                    setSent(false);
                    setMessage("");
                }, 3000);
            } else {
                setError(data.error || "Failed to send message. Please try again.");
            }
        } catch (err) {
            console.error("Support Mail Error:", err);
            setError("Connection error. Please check your network and try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="support-modal-title" className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full max-w-lg rounded-xl border border-[#2A2A2A] relative shadow-2xl flex flex-col overflow-hidden bg-[#161616]">
                {/* Brand accent top bar */}
                <GradientBar />

                <div className="px-6 py-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#1E1E1E]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 p-1 bg-white/5 rounded-lg border border-[#2A2A2A]">
                            <Image src="/logo.svg" alt="Logo" width={30} height={30} className="w-full h-full" />
                        </div>
                        <div>
                            <h3 id="support-modal-title" className="font-bold text-base tracking-tight text-zinc-100 leading-none font-[family-name:var(--font-syne)]">Contact Support</h3>
                            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest mt-0.5 font-mono">ZeroByteMode Team</p>
                        </div>
                    </div>
                    <ModalCloseButton onClick={() => setShowSupportModal(false)} size={18} />
                </div>

                <div className="p-6">
                    {sent ? (
                        <div className="text-center py-8 animate-in zoom-in duration-300">
                            <SuccessIcon />
                            <h2 className="text-xl font-bold mb-2 tracking-tight text-zinc-100 font-[family-name:var(--font-syne)]">Message Sent!</h2>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                We&apos;ve received your request and will get back to you shortly.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 font-mono">Your Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="w-full bg-black/40 border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 font-mono"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1 font-mono">How can we help?</label>
                                <textarea
                                    id="message"
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your issue or ask a question..."
                                    rows={5}
                                    // eslint-disable-next-line jsx-a11y/no-autofocus
                                    autoFocus
                                    className="w-full bg-black/40 border border-[#2A2A2A] rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 resize-none font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full py-3.5 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-all flex items-center justify-center gap-2 overflow-hidden relative group font-[family-name:var(--font-syne)]"
                            >
                                {isSending ? (
                                    <LoadingSpinner />
                                ) : (
                                    <>
                                        <span>Send Message</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

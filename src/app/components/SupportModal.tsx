import { FormEvent, useState } from "react";
import Image from "next/image";
import { WORKER_URL } from "@/src/lib/constants";

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
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-white/80 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl border border-slate-900/10 relative shadow-2xl flex flex-col overflow-hidden bg-white">
                {/* Brand gradient top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />

                <div className="px-6 py-4 border-b border-slate-900/5 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 p-1 bg-slate-900/5 rounded-xl border border-slate-900/10">
                            <Image src="/logo.svg" alt="Logo" width={30} height={30} className="w-full h-full" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base tracking-tight text-slate-900 leading-none">Contact Support</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">ZeroByteMode Team</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSupportModal(false)}
                        aria-label="Close"
                        className="w-8 h-8 flex items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 rounded-full text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div className="p-6">
                    {sent ? (
                        <div className="text-center py-8 animate-in zoom-in duration-300">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h2 className="text-xl font-bold mb-2 tracking-tight text-slate-900">Message Sent!</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                We&apos;ve received your request and will get back to you shortly.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Your Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="w-full bg-slate-50 border border-slate-900/10 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">How can we help?</label>
                                <textarea
                                    id="message"
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your issue or ask a question..."
                                    rows={5}
                                    className="w-full bg-slate-50 border border-slate-900/10 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 overflow-hidden relative group"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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

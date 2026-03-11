// Shared modal UI primitives used across modal components

export function GradientBar({ className }: { className?: string }) {
  return (
    <div className={`h-1 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400${className ? ` ${className}` : ""}`} />
  );
}

export function ModalCloseButton({ onClick, className, size = 16 }: { onClick: () => void; className?: string; size?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      className={className ?? "w-8 h-8 flex items-center justify-center bg-slate-900/5 hover:bg-slate-900/10 rounded-full text-slate-400 hover:text-slate-900 transition-all"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  );
}

export function LoadingSpinner() {
  return (
    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
  );
}

export function SuccessIcon() {
  return (
    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );
}

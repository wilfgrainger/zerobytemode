"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { WORKER_URL } from "@/src/lib/constants";
import { setCookie } from "@/src/lib/cookies";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setError] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setError("No login token found in URL.");
        return;
      }
      try {
        const response = await fetch(`${WORKER_URL}/auth/verify?token=${token}`);

        if (response.ok) {
          const data = await response.json();
          const cookieOptions = "path=/; max-age=2592000; SameSite=Lax";

          if (data.email) {
            setCookie("zbm_user_email", data.email, cookieOptions);
          }
          if (data.sessionToken) {
            setCookie("zbm_session_token", data.sessionToken, cookieOptions);
          }
          if (data.tier === "pro") {
            setCookie("zbm_pro_tier", "true", cookieOptions);
          }
          setStatus("success");
          setTimeout(() => router.push("/"), 2000);
        } else {
          setStatus("error");
          setError("Invalid or expired login link.");
        }
      } catch (err) {
        console.error("Verification Error:", err);
        setStatus("error");
        setError("Connection failed. Please try again.");
      }
    };

    verifyToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Brand glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-pink-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-violet-600/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 z-10">
        <div className="w-12 h-12 p-1 bg-slate-900/5 border border-slate-900/10 rounded-xl">
          <Image src="/logo.svg" alt="ZeroByteMode Logo" width={44} height={44} className="w-full h-full" />
        </div>
        <div className="flex flex-col items-start">
          <span className="font-bold text-lg tracking-tight text-slate-900 leading-none">ZeroByteMode</span>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Compression Tool</span>
        </div>
      </div>

      {/* Top gradient bar */}
      <div className="w-full max-w-sm relative z-10">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400" />

        <div className="glass-panel p-10 border border-slate-900/10 rounded-2xl shadow-2xl">

          {status === "verifying" && (
            <>
              <div className="w-16 h-16 border-4 border-slate-900/5 border-t-violet-500 rounded-full animate-spin mx-auto mb-8" />
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifying Session</h1>
              <p className="text-slate-500 text-sm tracking-wide">Please wait while we secure your connection...</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20 bg-emerald-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Granted</h1>
              <p className="text-slate-500 text-sm">Welcome back to ZeroByteMode Studio. Redirecting you now...</p>
              {/* Animated gradient progress bar */}
              <div className="mt-6 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400 animate-gradient-x rounded-full" />
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Login Failed</h1>
              <p className="text-red-500/80 text-sm mb-8">{errorMessage}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
              >
                Return Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-slate-900/10 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

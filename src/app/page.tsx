"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Image from "next/image";

import { SignInModal } from "./components/SignInModal";
import { UpgradeEmailModal } from "./components/UpgradeEmailModal";
import { SupportModal } from "./components/SupportModal";
import { WORKER_URL } from "@/src/lib/constants";

interface ImageFile {
  id: string;
  file: File;
  originalSize: number;
  compressedSize?: number;
  compressedUrl?: string;
  isCompressing: boolean;
  savings?: number;
  status: 'staged' | 'pending' | 'processing' | 'done' | 'error';
  logs?: string[];
}

// Encryption helper
async function encryptBlob(blob: Blob, password: string): Promise<Blob> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const buffer = await blob.arrayBuffer();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer
  );

  // Combine salt + iv + encrypted data
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);

  return new Blob([result], { type: "application/octet-stream" });
}

// Comparison table data
interface BenefitRow {
  f: string;
  s: string;
  p: string;
  icon: string;
  note?: string;
}

const BENEFITS: BenefitRow[] = [
  { f: 'Optimization Engine', s: 'Standard Native', p: 'Professional WASM', icon: '⚡' },
  { f: 'Privacy Stack', s: '100% Client-Side', p: '100% Client-Side', icon: '🏛️' },
  { f: 'Workflow Engine', s: 'Single Image', p: 'Unlimited Batch Queue', icon: '📦' },
  { f: 'Security Layer', s: 'Standard ZIP', p: 'Military-Grade AES-256', icon: '🔒' },
];

// Cookie helpers (avoids direct document.cookie access per lint rules)
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
};

const setCookie = (name: string, value: string, options: string) => {
  // Ensure cookies are shared across apex and www subdomains
  const isProd = window.location.hostname.includes('zerobytemode.com');
  const domain = isProd ? "; domain=.zerobytemode.com" : "";
  const secure = isProd ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; ${options}${domain}${secure}`;
};

const deleteCookie = (name: string) => {
  const isProd = window.location.hostname.includes('zerobytemode.com');
  const baseOptions = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

  // 1. Try deleting without a domain
  document.cookie = `${name}=; ${baseOptions}`;
  document.cookie = `${name}=; ${baseOptions}; Secure`;

  // 2. Try deleting with the apex domain explicitly if on production
  if (isProd) {
    document.cookie = `${name}=; ${baseOptions}; domain=.zerobytemode.com`;
    document.cookie = `${name}=; ${baseOptions}; domain=.zerobytemode.com; Secure`;
    document.cookie = `${name}=; ${baseOptions}; domain=zerobytemode.com`;
    document.cookie = `${name}=; ${baseOptions}; domain=zerobytemode.com; Secure`;
  }
};

// Helper to detect iOS
const checkIsIOS = () => {
  return typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

// Pure utility moved outside component to prevent recreation on re-renders
const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [proQuality, setProQuality] = useState(0.85);
  const [proFormat, setProFormat] = useState<'image/jpeg' | 'image/webp'>('image/jpeg');
  const [proEngine, setProEngine] = useState<'browser' | 'mozjpeg' | 'oxipng' | 'avif' | 'autopilot'>('autopilot');
  const [showSignIn, setShowSignIn] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showIOSInstallInstructions, setShowIOSInstallInstructions] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [compareSliderPos, setCompareSliderPos] = useState(50);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  useEffect(() => {
    const file = selectedFile?.file;
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile?.file]); // Only recreate preview URL when the actual file changes, not on every files array update (e.g. log progress)

  // Cleanup object URLs when a file is removed or component unmounts
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
      });
    };
  }, []); // Only on unmount for full cleanup, handled individually on removal if implemented


  useEffect(() => {
    // 0. Hydrate auth state from cookies and validate session securely
    const cookieEmail = getCookie('zbm_user_email');
    const cookieToken = getCookie('zbm_session_token');

    if (cookieEmail) setEmail(cookieEmail);

    const validateSession = async () => {
      if (!cookieToken) {
        // STRICT: If no token, they are NOT Pro, regardless of other cookies
        setIsPro(false);
        return;
      }

      try {
        const response = await fetch(`${WORKER_URL}/auth/validate-session`, {
          headers: { "Authorization": `Bearer ${cookieToken}` }
        });
        const data = await response.json();
        if (response.ok && data.valid) {
          setIsPro(data.isActive);
          if (data.email) setEmail(data.email);
          // Sync the pro cookie for UI hints, but the truth is from the token
          setCookie("zbm_pro_tier", data.isActive ? "true" : "false", "path=/; max-age=2592000; SameSite=Lax");
        } else {
          // Token invalid or expired
          setIsPro(false);
          deleteCookie("zbm_session_token");
          deleteCookie("zbm_pro_tier");
        }
      } catch (err) {
        console.error("Session validation failed:", err);
        // On network error, we don't grant Pro unless we already knew they were
        // but strictly we should probably fail safe.
        setIsPro(false);
      }
    };

    validateSession();

    // 1. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error("SW Register Error:", err));
    }

    // 2. Handle Native Install Prompt (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    // 3. Detect if already installed / standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    // Show install button for iOS users if not standalone
    const isIOS = checkIsIOS();
    if (isIOS && !isStandalone) {
      setShowInstallBtn(true);
    }

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    const isIOS = checkIsIOS();

    if (isIOS) {
      // iPhone doesn't support native prompt, show instructions
      hapticsImpact(ImpactStyle.Medium);
      setShowIOSInstallInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const hapticsImpact = async (style = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (e) {
      // Ignore if not on mobile/capacitor
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoginLoading(true);
    hapticsImpact(ImpactStyle.Medium);

    // Cookie max-age: 30 days if remembering, else session (no max-age = browser session)
    const emailMaxAge = rememberMe ? "max-age=2592000" : "";

    try {
      const response = await fetch(`${WORKER_URL}/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, siteUrl: window.location.origin, rememberMe }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Persist the email so the user doesn't have to retype it
        setCookie("zbm_user_email", email, `path=/; SameSite=Lax${emailMaxAge ? `; ${emailMaxAge}` : ""}`);
        setLoginSent(true);
      } else {
        const detail = data.detail ? `\n\nDetail: ${data.detail}` : "";
        const debugLink = data.debugLink ? `\n\nDEBUG LINK (Copy this): ${data.debugLink}` : "";
        alert(`Error: ${data.error || 'Failed to send magic link.'}${detail}${debugLink}`);
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("An error occurred. Please check your connection.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Web Worker and Parse URL params
  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(new URL("./compressor.worker.ts", import.meta.url));

    workerRef.current.onmessage = (e) => {
      const { type, success, blob, size, error, id, message } = e.data;

      if (type === "log") {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, logs: [...(f.logs || []), message] } : f
        ));
        return;
      }

      setFiles(prev => prev.map(f => {
        if (f.id === id) {
          if (success && blob) {
            // Revoke old URL if it exists
            if (f.compressedUrl) URL.revokeObjectURL(f.compressedUrl);
            const url = URL.createObjectURL(blob);
            const savings = Math.round((1 - size / f.originalSize) * 100);
            return { ...f, compressedUrl: url, compressedSize: size, savings, isCompressing: false, status: 'done' as const };
          } else {
            console.error("Worker Error:", error);
            return { ...f, isCompressing: false, status: 'error' as const };
          }
        }
        return f;
      }));
    };

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("session_id");
      if (urlParams.get("success") === "true" || sessionId) {
        setIsPro(true);
        // Set a temporary cookie to persist the state while the webhook processes
        setCookie("zbm_pro_tier", "true", "path=/; max-age=3600; SameSite=Lax");

        // If we have a session ID, try to get a secure session token automatically
        if (sessionId) {
          const autoLogin = async () => {
            try {
              const response = await fetch(`${WORKER_URL}/stripe/verify-session?session_id=${sessionId}`);
              if (response.ok) {
                const data = await response.json();
                if (data.sessionToken) {
                  setCookie("zbm_session_token", data.sessionToken, "path=/; max-age=2592000; SameSite=Lax");
                  if (data.email) setCookie("zbm_user_email", data.email, "path=/; max-age=2592000; SameSite=Lax");
                }
              }
            } catch (e) { console.error("Auto-login failed:", e); }
          };
          autoLogin();
        }
      }

      const savedEmail = getCookie("zbm_user_email");
      if (savedEmail) setEmail(savedEmail);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Effect to process the next file in the queue (only 'pending' files)
  useEffect(() => {
    const nextFile = files.find(f => f.status === 'pending');
    if (nextFile && !isProcessingQueue) {
      processFile(nextFile);
    }
  }, [files, isProcessingQueue]);

  const handleStartCompression = () => {
    hapticsImpact(ImpactStyle.Heavy);
    setFiles(prev => prev.map(f => f.status === 'staged' ? { ...f, status: 'pending' } : f));
  };

  const processFile = (imageFile: ImageFile) => {
    if (!workerRef.current) return;

    setIsProcessingQueue(true);
    setFiles(prev => prev.map(f => f.id === imageFile.id ? { ...f, status: 'processing', isCompressing: true } : f));

    const quality = isPro ? proQuality : 0.65;
    // Free tier: intelligently use WebP for PNGs to preserve transparency and maximize savings, JPEG for others
    const type = isPro ? proFormat : (imageFile.file.type === 'image/png' ? 'image/webp' : 'image/jpeg');

    // Auto and oxipng are available on Free tier; mozjpeg and avif require Pro.
    const engineToUse = (!isPro && (proEngine === 'mozjpeg' || proEngine === 'avif'))
      ? 'autopilot'
      : proEngine;

    workerRef.current.postMessage({
      file: imageFile.file,
      quality,
      type,
      engine: engineToUse === 'autopilot' ? 'browser' : engineToUse,
      autoPilot: engineToUse === 'autopilot',
      id: imageFile.id
    });
  };

  // Reset processing flag when a file finishes
  useEffect(() => {
    const currentlyProcessing = files.some(f => f.status === 'processing');
    if (!currentlyProcessing && isProcessingQueue) {
      setIsProcessingQueue(false);
    }
  }, [files, isProcessingQueue]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
      // Reset the value so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleFiles = (newFiles: File[]) => {
    hapticsImpact(ImpactStyle.Light);
    const validImages = newFiles.filter(f => f.type.startsWith("image/"));
    if (validImages.length === 0) return;

    const newImageFiles: ImageFile[] = validImages.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      originalSize: file.size,
      isCompressing: false,
      status: 'staged', // Starts as staged, waits for explicit Start
      logs: []
    }));

    if (!isPro) {
      // Free tier: allow up to 3 at a time
      setFiles(prev => {
        const combined = [...prev, ...newImageFiles];
        return combined.slice(0, 3);
      });
    } else {
      // Pro tier: append to queue
      setFiles(prev => [...prev, ...newImageFiles]);
    }
  };

  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showUpgradeEmailModal, setShowUpgradeEmailModal] = useState(false);

  const handleGetPro = async (providedEmail?: string) => {
    const targetEmail = providedEmail || email;

    // Step 1: Check if we have an email. If not, show the identification modal first.
    if (!targetEmail) {
      hapticsImpact(ImpactStyle.Light);
      setShowUpgradeEmailModal(true);
      return;
    }

    hapticsImpact(ImpactStyle.Heavy);
    setIsStripeLoading(true);
    setShowUpgradeEmailModal(false); // Close the email collector if it was open

    try {
      const response = await fetch(`${WORKER_URL}/stripe/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        const fallbackUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL || "https://buy.stripe.com/aFaaEXceX2AG5Ut1176AM00";
        window.location.href = `${fallbackUrl}?prefilled_email=${encodeURIComponent(targetEmail)}`;
      }
    } catch (err) {
      console.error("Stripe Error:", err);
      const fallbackUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL || "https://buy.stripe.com/aFaaEXceX2AG5Ut1176AM00";
      window.location.href = fallbackUrl;
    } finally {
      setIsStripeLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!isPro) return;
    hapticsImpact(ImpactStyle.Heavy);

    // Dynamically import JSZip when needed
    const JSZipModule = await import("jszip");
    const zip = new JSZipModule.default();

    for (const f of files) {
      if (f.compressedUrl && f.status === 'done') {
        const response = await fetch(f.compressedUrl);
        const blob = await response.blob();
        zip.file(`ZBM-${f.file.name}`, blob);
      }
    }

    let content = await zip.generateAsync({ type: "blob" });
    let filename = "ZBM-Compressed-Images.zip";

    if (encryptionEnabled) {
      const password = prompt("Enter a password to encrypt your secure ZIP archive:");
      if (!password) return;

      content = await encryptBlob(content, password);
      filename = "ZBM-Compressed-Images.zip.enc";
    }

    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  };

  const handleLogout = async () => {
    await hapticsImpact(ImpactStyle.Medium);
    deleteCookie("zbm_pro_tier");
    deleteCookie("zbm_user_email");
    deleteCookie("zbm_session_token");
    setIsPro(false);
    setEmail("");
    window.location.reload(); // Refresh to clear all sensitive state
  };

  const handleManageSubscription = async () => {
    hapticsImpact(ImpactStyle.Medium);

    // Require secure session token for billing portal access
    const sessionToken = getCookie("zbm_session_token") ?? undefined;

    if (!sessionToken) {
      alert("Please sign in again to access the billing portal securely.");
      return;
    }

    try {
      const response = await fetch(`${WORKER_URL}/stripe/create-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        const w = 820, h = 700;
        const left = Math.round((window.screen.width - w) / 2);
        const top = Math.round((window.screen.height - h) / 2);
        window.open(data.url, 'StripePortal', `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,status=no,scrollbars=yes,resizable=yes`);
      } else {
        console.error("Stripe Portal Error:", data);
        alert(data.error || 'Unable to open subscription portal. Please contact help@zerobytemode.com.');
      }
    } catch (err) {
      console.error("Manage Subscription Error:", err);
      alert("An error occurred while trying to manage your subscription.");
    }
  };


  return (
    <div className="min-h-screen flex flex-col items-center selection:bg-white/20 relative overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Background glow effects - Squoosh Vibrant Light Theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-pink-500/30 blur-[120px] rounded-full pointer-events-none animate-float opacity-80" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-orange-400/20 blur-[140px] rounded-full pointer-events-none animate-float-delayed opacity-80" />
      <div className="absolute bottom-[-10%] left-[10%] w-[70%] h-[60%] bg-violet-600/15 blur-[160px] rounded-full pointer-events-none animate-float opacity-70" />

      {/* Header - App Style Top Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-10 py-6 md:py-14 flex items-center justify-between relative z-[100]">
        <div className="flex items-center gap-3 md:gap-6 group cursor-pointer">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 md:w-24 md:h-24 p-2 bg-slate-900/5 border border-slate-900/10 rounded-[28px] transition-all duration-500 group-hover:bg-slate-900/10 group-hover:scale-105 group-hover:rotate-2 flex-shrink-0 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image src="/logo.svg" alt="ZeroByteMode Logo" width={80} height={80} className="w-full h-full relative z-10" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">ZeroByteMode</span>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Studio Pro</span>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-4 md:gap-8">
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-2.5 px-5 py-2.5 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
              INSTALL
            </button>
          )}

          <div className="flex items-center gap-4">
            {isPro && (
              <div id="pro-status-badge" className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full shadow-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse" />
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">STUDIO PRO</span>
              </div>
            )}

            {email ? (
              <>
                {isPro ? (
                  <button
                    onClick={handleManageSubscription}
                    className="text-xs font-black text-slate-900 hover:text-blue-600 transition-colors uppercase tracking-widest px-4 py-2 bg-slate-100 rounded-xl"
                  >
                    Billing
                  </button>
                ) : (
                  <button
                    onClick={() => handleGetPro()}
                    className="text-[10px] font-black bg-slate-900 text-white px-6 py-3.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest"
                  >
                    Go Pro
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    hapticsImpact(ImpactStyle.Light);
                    setShowSignIn(true);
                  }}
                  className="text-xs font-black text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-widest px-4"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleGetPro()}
                  className="text-[10px] font-black bg-slate-900 text-white px-6 py-3.5 rounded-full hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 uppercase tracking-widest"
                >
                  Go Pro
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-32 flex flex-col items-center text-center relative z-10">

        {/* Hero Section */}
        <div className="text-center mb-32 md:mb-48 relative z-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-slate-900/5 text-slate-900 mb-12 shadow-xl shadow-slate-900/5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[11px] font-black tracking-[0.2em] uppercase">Sovereign WASM Engine</span>
          </div>
          <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter text-slate-900 mb-10 md:mb-12 relative leading-[0.8]">
            Make it<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-orange-500 to-violet-500 animate-gradient-x relative inline-block">Smaller.</span>
          </h1>
          <p className="text-xl md:text-3xl text-slate-500 font-bold max-w-3xl mx-auto tracking-tight leading-relaxed px-4 opacity-90">
            Professional image optimization directly in your browser. 100% private. 0% server uploads.
          </p>
        </div>

        {/* Primary Action Zone */}
        <div className="w-full max-w-5xl mb-40 md:mb-64 relative px-2 md:px-0">
          <div className="absolute -inset-10 bg-gradient-to-r from-violet-500/10 via-pink-500/10 to-orange-500/10 rounded-[60px] blur-[100px] opacity-50 pointer-events-none" />
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();
                }
              }
            }}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset input so same file can be selected again
                fileInputRef.current.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full p-12 md:p-40 rounded-[48px] border-2 border-dashed relative overflow-hidden group cursor-pointer transition-all duration-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/50
              ${isDragging ? 'border-violet-500 bg-violet-500/5 scale-[1.02] shadow-2xl' : 'border-slate-900/10 bg-white/90 backdrop-blur-xl hover:border-slate-900/20 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:bg-white'}
              z-20`}
          >
            <input
              id="image-upload"
              name="image-upload"
              type="file"
                aria-label="Upload images"
              ref={fileInputRef}
              onChange={handleFileInput}
              className="hidden"
              accept="image/*"
              multiple={isPro}
            />

            {/* Idle State */}
            <div className={`transition-all duration-500 transform ${isDragging ? 'scale-95 opacity-0 blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
              <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-50 rounded-[40px] flex items-center justify-center mx-auto mb-14 border border-slate-900/5 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-700 shadow-sm relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[40px]" />
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 relative z-10"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <h3 className="text-3xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-none">Deploy Assets.</h3>
              <p className="text-lg md:text-2xl text-slate-500 font-bold tracking-tight opacity-80">Drop files here or tap to browse</p>

              <div className="mt-20 flex flex-wrap items-center justify-center gap-4 md:gap-12">
                {['JPG', 'PNG', 'WEBP', 'AVIF'].map((fmt) => (
                  <div key={fmt} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                    <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">{fmt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="inline-flex items-center gap-4 px-8 py-3.5 rounded-full bg-white border border-slate-900/5 shadow-lg shadow-slate-900/5 mb-48 md:mb-64">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
          <span className="text-[12px] font-black tracking-[0.25em] text-slate-500 uppercase">
            Military-Grade AES-256 Protected • Local First
          </span>
        </div>

        {/* Options Toolbar (Visible to everyone before uploading) */}
        <div className="w-full max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 mb-12 z-20 relative px-4 md:px-0">
          <div className="relative">
            <div className="w-full grid grid-cols-1 min-[600px]:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 p-10 md:p-12 rounded-[32px] bg-white border border-slate-900/10 shadow-2xl transition-all duration-700">
              <div className="text-left relative">
                {!isPro && <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGetPro(); } }} className="absolute inset-0 z-10 bg-transparent cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-2xl" onClick={() => handleGetPro()}><div className="hidden group-hover:flex group-focus-visible:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest whitespace-nowrap z-20 shadow-2xl">STUDIO PRO ONLY</div></div>}
                <div className="flex justify-between items-center mb-2 transition-all duration-300">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Quality</span>
                  <span className="text-[11px] font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-900/5">{Math.round(proQuality * 100)}%</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 mb-5 uppercase tracking-wider">{proQuality >= 0.8 ? 'Ultra Quality' : proQuality >= 0.5 ? 'Balanced' : 'Max Saving'}</p>
                <input
                  id="quality-range"
                  name="quality-range"
                  type="range"
                  aria-label="Compression quality"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={proQuality}
                  onChange={(e) => setProQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900 transition-all duration-300"
                  disabled={!isPro}
                />
              </div>

              <div className="text-left">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-6">Optimization</span>
                <div className="grid grid-cols-2 p-1.5 gap-1.5 bg-slate-100 rounded-2xl border border-slate-900/5">
                  {[
                    { id: 'autopilot', label: 'AUTO', isProOnly: false },
                    { id: 'mozjpeg', label: 'MOZ', isProOnly: true },
                    { id: 'oxipng', label: 'OXI', isProOnly: false },
                    { id: 'avif', label: 'AVIF', isProOnly: true }
                  ].map((eng) => (
                    <button
                      key={eng.id}
                      aria-pressed={proEngine === eng.id}
                      onClick={() => {
                        if (!isPro && eng.isProOnly) {
                          handleGetPro();
                          return;
                        }
                        hapticsImpact(ImpactStyle.Light);
                        setProEngine(eng.id as any);
                      }}
                      className={`py-3 px-1 rounded-xl text-[10px] uppercase font-black tracking-widest border transition-all duration-300 relative group
                        ${proEngine === eng.id ? 'bg-white text-slate-900 border-slate-200 shadow-sm z-10' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-900 hover:bg-white/50'}`}
                    >
                      {eng.label}
                      {!isPro && eng.isProOnly && (
                        <div className="absolute top-0 right-0 -mt-1.5 -mr-1.5 bg-orange-500 text-white rounded-full p-1 shadow-lg flex items-center justify-center">
                          <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-left relative">
                {!isPro && <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGetPro(); } }} className="absolute inset-0 z-10 bg-transparent cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-2xl" onClick={() => handleGetPro()}><div className="hidden group-hover:flex group-focus-visible:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest whitespace-nowrap z-20 shadow-2xl">STUDIO PRO ONLY</div></div>}
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-6">Format</span>
                <div className="flex p-1.5 gap-1.5 bg-slate-100 rounded-2xl border border-slate-900/5">
                  {['JPG', 'WEBP'].map((fmt) => (
                    <button
                      key={fmt}
                      aria-pressed={proFormat === (fmt === 'JPG' ? 'image/jpeg' : 'image/webp')}
                      onClick={() => {
                        hapticsImpact(ImpactStyle.Light);
                        setProFormat(fmt === 'JPG' ? 'image/jpeg' : 'image/webp');
                      }}
                      className={`flex-1 py-3 rounded-xl text-[11px] uppercase font-black tracking-widest border transition-all duration-300
                        ${proFormat === (fmt === 'JPG' ? 'image/jpeg' : 'image/webp') ? 'bg-white text-slate-900 border-slate-200 shadow-sm z-10' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-900 hover:bg-slate-200/50'}`}
                      disabled={!isPro}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-left relative">
                {!isPro && <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGetPro(); } }} className="absolute inset-0 z-10 bg-transparent cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 rounded-2xl" onClick={() => handleGetPro()}><div className="hidden group-hover:flex group-focus-visible:flex absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest whitespace-nowrap z-20 shadow-2xl">STUDIO PRO ONLY</div></div>}
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-6">Archive</span>
                <div className="flex p-1.5 gap-1.5 bg-slate-100 rounded-2xl border border-slate-900/5">
                  <button
                    aria-pressed={encryptionEnabled}
                    onClick={() => {
                      hapticsImpact(ImpactStyle.Medium);
                      setEncryptionEnabled(!encryptionEnabled);
                    }}
                    className={`w-full py-3 rounded-xl text-[10px] uppercase font-black tracking-widest border transition-all duration-300 flex items-center justify-center gap-3
                      ${encryptionEnabled ? 'bg-slate-900 text-white border-slate-900 shadow-xl z-10' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-900 hover:bg-slate-200/50'}`}
                    disabled={!isPro}
                  >
                    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={encryptionEnabled ? "text-emerald-400" : ""}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    {encryptionEnabled ? "SECURE ZIP" : "STANDARD ZIP"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue & Tool Dashboard */}
        {files.length > 0 && (
          <div className="w-full max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 mb-20 px-4 md:px-0">

            {/* Inbound Buffer / Queue */}
            <div className="p-10 md:p-12 rounded-[32px] border border-slate-900/10 text-left bg-white shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-5">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter">Active Queue</h4>
                  <div className="px-4 py-1.5 rounded-full bg-slate-100 border border-slate-900/5">
                    <span className="text-[11px] font-black text-slate-500 tracking-[0.2em] uppercase">
                      {files.length} {files.length === 1 ? 'OBJECT' : 'OBJECTS'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  {files.some(f => f.status === 'staged') && (
                    <button
                      onClick={handleStartCompression}
                      className="flex-1 md:flex-none text-[11px] font-black px-5 py-3 md:px-8 md:py-4 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] bg-slate-900 text-white shadow-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95"
                    >
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      Process Queue
                    </button>
                  )}
                  {isPro && files.some(f => f.status === 'done') && (
                    <button
                      onClick={handleDownloadAll}
                      className={`flex-1 md:flex-none text-[11px] font-black px-5 py-3 md:px-8 md:py-4 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] border ${encryptionEnabled ? "bg-emerald-500 text-slate-900 border-emerald-400 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400" : "bg-white text-slate-900 border-slate-200 shadow-lg hover:bg-slate-50"}`}
                    >
                      {encryptionEnabled ? "Secure Export" : "Download Archive"}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {files.map((file) => (
                  <div key={file.id} className="flex flex-col gap-3">
                    <div
                      role={file.status === 'done' ? 'button' : undefined}
                      tabIndex={file.status === 'done' ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (file.status === 'done' && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          setSelectedFileId(file.id);
                        }
                      }}
                      onClick={() => file.status === 'done' && setSelectedFileId(file.id)}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-900/5 group transition-all duration-500 ${file.status === 'done' ? 'cursor-pointer hover:border-slate-900/10 hover:bg-white hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50' : ''}`}
                    >
                      <div className="flex items-center gap-6 flex-1 min-w-0 w-full">
                        <div className="w-16 h-16 rounded-[18px] bg-white border border-slate-900/5 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-sm group/thumb">
                          {file.compressedUrl && file.status === 'done' ? (
                            <>
                              <img src={file.compressedUrl} alt="preview" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-700" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Compare</span>
                              </div>
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full border-2 border-white shadow-sm animate-pulse group-hover:opacity-0 transition-opacity" />
                            </>
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-base font-black truncate text-slate-900 mb-1 tracking-tight group-hover:text-violet-600 transition-colors">{file.file.name}</p>
                          {file.status === 'done' ? (
                            <p className="text-[10px] text-violet-500 font-black uppercase tracking-[0.2em] animate-pulse">✨ Click to Compare</p>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{formatSize(file.originalSize)} SOURCE</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-10 w-full sm:w-auto mt-4 sm:mt-0 pl-0 sm:pl-8">
                        {file.status === 'processing' && (
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] animate-pulse">Processing</span>
                          </div>
                        )}

                        {file.status === 'staged' && (
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Staged</span>
                          </div>
                        )}

                        {file.status === 'done' && (
                          <>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-500 mb-0.5 tracking-tight">-{file.savings}%</p>
                              <p className="text-[10px] font-black text-slate-400 tracking-[0.1em] uppercase">{formatSize(file.compressedSize || 0)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <a
                                href={file.compressedUrl}
                                download={`ZBM-${file.file.name}`}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Download compressed ${file.file.name}`}
                                title={`Download compressed ${file.file.name}`}
                                className="p-3.5 bg-white border border-slate-900/5 hover:border-slate-900/10 text-slate-400 hover:text-slate-900 rounded-xl transition-all shadow-sm hover:shadow-md"
                              >
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                              </a>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Processing Console */}
                    {(file.status === 'processing' || (file.logs && file.logs.length > 0 && file.status !== 'staged')) && (
                      <div className="w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-black rounded-2xl p-4 md:p-6 overflow-hidden flex flex-col shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] border border-slate-900/10">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" x2="19" y2="19" /></svg>
                            <span className="text-[11px] font-mono font-black text-zinc-500 tracking-[0.2em] uppercase">Engine Telemetry</span>
                          </div>
                          {file.status === 'processing' && (
                            <div className="flex gap-1.5 items-center">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse [animation-delay:-0.3s]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 overflow-y-auto font-mono text-xs text-emerald-400">
                          {file.logs?.map((log, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                              <span className="text-zinc-600 select-none flex-shrink-0 mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                              <span className="break-all opacity-90 leading-relaxed text-emerald-400/90">{log}</span>
                            </div>
                          ))}
                          {file.status === 'processing' && (
                            <div className="flex gap-4 items-center">
                              <span className="text-zinc-600 select-none flex-shrink-0">{(file.logs?.length || 0) + 1}</span>
                              <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Marketing / Info Sections (Only show if queue is small/empty or scroll down) */}
        <div className="w-full mt-24 space-y-40">

          {/* Pro Comparison Table */}
          {!isPro && (
            <section className="max-w-5xl mx-auto px-4 md:px-0">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">Elevate Compression.</h2>
                <p className="text-lg md:text-xl text-slate-500 font-bold max-w-2xl mx-auto tracking-tight">Unlock professional WASM engines and secure batch processing for high-volume workflows.</p>
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-slate-900/10 bg-white shadow-2xl">
                <div className="flex border-b border-slate-900/5 bg-slate-50/50">
                  <div className="flex-1 p-4 md:p-8 text-left text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Capability</div>
                  <div className="w-20 md:w-32 p-4 md:p-8 text-center text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Standard</div>
                  <div className="w-20 md:w-32 p-4 md:p-8 text-center text-[10px] md:text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] bg-orange-500/5">Studio Pro</div>
                </div>
                {BENEFITS.map((row, i) => (
                  <div key={i} className="flex border-b border-slate-900/5 last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex-1 p-4 md:p-8 text-left text-xs md:text-base font-bold text-slate-900 flex items-center gap-4">
                      <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{row.icon}</span>
                      {row.f}
                    </div>
                    <div className="w-20 md:w-32 p-4 md:p-8 text-center text-[10px] md:text-sm font-bold text-slate-500">{row.s}</div>
                    <div className="w-20 md:w-32 p-4 md:p-8 text-center text-[10px] md:text-sm font-black text-slate-900 bg-orange-500/[0.02]">{row.p}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Engine Technical Specs */}
          <section className="max-w-6xl mx-auto px-4 md:px-0">
            <div className="flex items-center gap-6 mb-20 justify-center">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-900/10" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Technical Architecture</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-900/10" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'OxiPNG (WASM)',
                  algo: 'LOSSLESS RUST CORE',
                  desc: 'Professional PNG optimization using custom Rust logic. Re-encodes IDAT chunks entirely within your browser for maximum efficiency.',
                  tier: 'Standard',
                  color: 'zinc'
                },
                {
                  name: 'MozJPEG (WASM)',
                  algo: 'INDUSTRY STANDARD',
                  desc: 'The gold standard for lossy optimization. Uses advanced Trellis quantization to maintain sharpness at ultra-low file sizes.',
                  tier: 'Studio Pro',
                  color: 'yellow'
                },
                {
                  name: 'AVIF (WASM)',
                  algo: 'NEXT-GENERATION',
                  desc: 'The world\'s most efficient image codec. Achieve up to 50% smaller files than JPG with zero data ever leaving your machine.',
                  tier: 'Studio Pro',
                  color: 'yellow'
                }
              ].map((spec, i) => (
                <div key={i} className="p-10 rounded-[32px] border border-slate-900/5 bg-white text-left hover:border-slate-900/10 hover:shadow-2xl transition-all duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full ${spec.tier === 'Studio Pro' ? 'bg-orange-500/10 text-orange-600' : 'bg-slate-100 text-slate-500'} uppercase tracking-widest`}>
                      {spec.tier}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${spec.tier === 'Studio Pro' ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]' : 'bg-slate-300'}`} />
                  </div>
                  <h5 className="text-xl font-black text-slate-900 mb-2 tracking-tight">{spec.name}</h5>
                  <p className="text-[10px] font-black text-slate-400 mb-6 tracking-[0.2em] uppercase">{spec.algo}</p>
                  <p className="text-base text-slate-500 font-bold leading-relaxed opacity-80">
                    {spec.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-20 border-t border-slate-900/5 mt-auto flex flex-col md:flex-row items-center justify-between text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
        <p>© 2026 ZeroByteMode. Private by design.</p>
        <div className="flex gap-10 mt-8 md:mt-0">
          <a href="#" className="hover:text-slate-900 transition-colors">Documentation</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
        </div>
      </footer>

      {/* Comparison Workspace Modal */}
      {selectedFileId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10 bg-white/95 backdrop-blur-3xl animate-in zoom-in-95 duration-500">
          <div className="w-full h-full max-w-6xl flex flex-col relative">
            <header className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setSelectedFileId(null)}
                  aria-label="Close inspector"
                  className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-900/5 rounded-2xl text-slate-900 transition-all shadow-sm"
                >
                  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Studio Inspector</h2>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{selectedFile?.file.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
                  <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                    -{selectedFile?.savings}% REDUCTION
                  </span>
                </div>
                <a
                  href={selectedFile?.compressedUrl}
                  download={`ZBM-${selectedFile?.file.name}`}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                >
                  Download
                </a>
              </div>
            </header>

            <div className="flex-1 min-h-0 bg-slate-100 rounded-[40px] border border-slate-900/10 overflow-hidden relative shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12">
                <div className="relative w-full h-full rounded-[24px] overflow-hidden bg-[url('/grid.svg')] bg-repeat border border-slate-900/5 shadow-inner">

                  {/* Original (Left) */}
                  <div className="absolute inset-0">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="original"
                        className="w-full h-full object-contain"
                      />
                    )}
                    <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-900/10 shadow-sm">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">SOURCE</span>
                    </div>
                  </div>

                  {/* Compressed (Right) */}
                  <div
                    className="absolute inset-0 overflow-hidden border-l border-slate-900/20"
                    style={{ clipPath: `inset(0 0 0 ${compareSliderPos}%)` }}
                  >
                    <img
                      src={selectedFile?.compressedUrl}
                      alt="compressed"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-8 right-8 bg-emerald-500/10 backdrop-blur-md px-4 py-2 rounded-xl border border-emerald-500/30 shadow-sm">
                      <span className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">{isPro ? proEngine.toUpperCase() : 'WASM'} OUTPUT</span>
                    </div>
                  </div>

                  {/* Slider Control */}
                  <input
                    id="compare-slider"
                    name="compare-slider"
                    type="range"
                    aria-label="Compare original and compressed"
                    min="0"
                    max="100"
                    value={compareSliderPos}
                    onChange={(e) => setCompareSliderPos(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                  />
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,1)] z-20 pointer-events-none"
                    style={{ left: `calc(${compareSliderPos}% - 0.5px)` }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-slate-100">
                      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 8-4 4-4 4M6 8l-4 4 4 4" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <footer className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex gap-16">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Input Payload</span>
                  <span className="text-lg font-black text-slate-900">{formatSize(selectedFile?.originalSize || 0)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Studio Output</span>
                  <span className="text-lg font-black text-emerald-500">{formatSize(selectedFile?.compressedSize || 0)}</span>
                </div>
              </div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">100% Sovereign Architecture • Zero Data Leaks</p>
            </footer>
          </div>
        </div>
      )}

      {/* Support Modal */}
      <SupportModal
        showSupportModal={showSupportModal}
        setShowSupportModal={setShowSupportModal}
        userEmail={email}
      />

      {/* Sign In Modal */}
      <SignInModal
        showSignIn={showSignIn}
        setShowSignIn={setShowSignIn}
        email={email}
        setEmail={setEmail}
        isLoginLoading={isLoginLoading}
        loginSent={loginSent}
        setLoginSent={setLoginSent}
        handleSignIn={handleSignIn}
        rememberMe={rememberMe}
        setRememberMe={setRememberMe}
      />

      {/* Pro Email Collector Modal */}
      <UpgradeEmailModal
        showUpgradeEmailModal={showUpgradeEmailModal}
        setShowUpgradeEmailModal={setShowUpgradeEmailModal}
        setEmail={setEmail}
        handleGetPro={handleGetPro}
      />

      {/* Stripe Loading Overlay */}
      {isStripeLoading && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-white/60 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 p-4 bg-white rounded-3xl shadow-2xl border border-slate-900/5 mb-8 relative">
              <div className="absolute inset-0 border-4 border-violet-500/20 border-t-violet-500 rounded-3xl animate-spin" />
              <Image src="/logo.svg" alt="Logo" width={64} height={64} className="w-full h-full relative z-10" />
            </div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">Initializing Secure Gateway</p>
          </div>
        </div>
      )}

      {/* iOS Install Instructions */}
      {showIOSInstallInstructions && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-panel p-10 border border-white/10 relative shadow-2xl rounded-3xl bg-zinc-950 text-center">
            <button
              onClick={() => setShowIOSInstallInstructions(false)}
              aria-label="Close instructions"
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
            </div>

            <h2 className="text-2xl font-bold mb-4 tracking-tight text-white">Install on iPhone</h2>
            <div className="space-y-6 text-left mb-10">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 mt-0.5">1</div>
                <p className="text-zinc-300 text-sm leading-relaxed">Tap the <span className="text-white font-bold">Share icon</span> in the bottom toolbar of Safari.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 mt-0.5">2</div>
                <p className="text-zinc-300 text-sm leading-relaxed">Scroll down and select <span className="text-white font-bold">&quot;Add to Home Screen&quot;</span>.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 mt-0.5">3</div>
                <p className="text-zinc-300 text-sm leading-relaxed">Tap <span className="text-white font-bold">Add</span> in the top right corner.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstallInstructions(false)}
              className="w-full h-12 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

# ZeroByteMode | System Requirements

## 1. Functional Requirements

### 1.1 UI / UX Features
- **File Upload:** Application must accept drag-and-drop or explicit file selection for common image formats (JPEG, PNG, WEBP, AVIF).
- **Haptic Feedback:** The app must trigger native capacitor haptics (Light, Medium, Heavy) when interacting with core elements if run in a portable/native setting.
- **PWA Installation:** Offer a native installation prompt for supporting browsers and iOS specific installation instructions for Safari users.

### 1.2 Compression Tiers

**Free Tier Restrictions:**
- Max concurrent files: 3 per iteration.
- Optimization engines: Standard Browser Native / Auto (WebP conversion for PNGs). 
- Quality setting: Locked at 0.65 (`65%`).
- Advanced ZIP encryption disabled.

**Pro Tier ("Studio Pro") Specifications:**
- Limitless batch processing queue mapping.
- Adjustable compression range input (10% to 100%).
- Engine Selectivity: Choice between Auto, MozJPEG, OxiPNG, and AVIF.
- "ZIP All" feature wrapping all compressed files safely.
- AES-256 local client side encryption standard for ZIP exports.

### 1.3 Billing & Subscription Requirements
- System must redirect customers correctly to a Stripe Checkout URL injected with their verified email prefix.
- "Manage Subscription" capability via Stripe Customer Portal.
- Pro features must conditionally activate purely upon detecting valid session authorization or `zbm_pro_tier` cookie state without server rendering logic.

### 1.4 Worker Core Logic
- A Dedicated Web Worker MUST separate the UI thread from the encoding loops to avoid freezing the browser.
- Fail-safes: If an optimized blob size is larger than the `originalSize`, the system must revert to providing the original uncompressed blob.

## 2. Non-Functional Requirements
- **Performance:** App must load near instantaneously (<1.5s LCP) relying entirely on edge network CDNs (Netlify / Pages). 
- **Privacy Compliance:** Given no data leaves the browser, system maintains innate GDPR/CCPA compliance for image data handling.
- **Responsiveness:** Support viewports from 320px (Mobile) up to large Desktop Ultra-Wide displays, with a modular floating dock or side-panel component adjustments.

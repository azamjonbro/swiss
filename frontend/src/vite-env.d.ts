/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /**
   * Cloudflare Turnstile SITE key. Public by design — it identifies the widget
   * in the browser. Its secret partner lives only in the backend env as
   * TURNSTILE_SECRET_KEY. Empty renders no widget and disables the check.
   */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /**
   * Set to '1' only once `backend/scripts/remove-product-bg.py` has actually
   * been run over the upload library on the server. See SmartImage's
   * `preferTrimmed` — until the derivatives exist, asking for them is pure
   * latency, so the guess is off by default.
   */
  readonly VITE_TRIMMED_UPLOADS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

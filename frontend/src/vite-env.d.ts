/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Canonical origin. Required for a production build — see vite.config.ts. */
  readonly VITE_SITE_URL?: string;
  /** Brand name in titles and structured data. Defaults to SITE_NAME. */
  readonly VITE_SITE_NAME?: string;
  /** Published contact address. Empty is valid: the UI then renders nothing. */
  readonly VITE_CONTACT_EMAIL?: string;
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

import { useEffect, useId, useRef } from "react";
import { Box, Typography } from "@mui/material";

const SCRIPT_ID = "google-recaptcha-v2";
const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

function loadRecaptchaScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha?.render) return Promise.resolve();
  const existing = document.getElementById(SCRIPT_ID);
  if (existing) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (window.grecaptcha?.render) resolve();
        else if (Date.now() - start > 10_000) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load reCAPTCHA."));
    document.head.appendChild(script);
  });
}

/**
 * Google reCAPTCHA v2 checkbox. Calls onChange(token|null).
 * `theme`: "light" | "dark" — matches MUI color mode.
 */
export default function RecaptchaV2({ siteKey, onChange, onReadyError, theme = "light" }) {
  const hostId = useId().replace(/:/g, "");
  const widgetIdRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onReadyErrorRef = useRef(onReadyError);
  onChangeRef.current = onChange;
  onReadyErrorRef.current = onReadyError;

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    const captchaTheme = theme === "dark" ? "dark" : "light";

    loadRecaptchaScript()
      .then(() => {
        if (cancelled || !window.grecaptcha?.render) return;
        window.grecaptcha.ready(() => {
          if (cancelled) return;
          const el = document.getElementById(hostId);
          if (!el) return;
          // Clear any previous widget markup before re-render (theme / remount).
          el.innerHTML = "";
          widgetIdRef.current = window.grecaptcha.render(el, {
            sitekey: siteKey,
            theme: captchaTheme,
            callback: (token) => onChangeRef.current?.(token || null),
            "expired-callback": () => onChangeRef.current?.(null),
            "error-callback": () => onChangeRef.current?.(null),
          });
        });
      })
      .catch((error) => {
        onReadyErrorRef.current?.(error);
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      widgetIdRef.current = null;
      if (id != null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(id);
        } catch {
          // Widget may already be gone.
        }
      }
      const el = document.getElementById(hostId);
      if (el) el.innerHTML = "";
      // Only clear token when this widget instance is torn down (unmount / theme change),
      // not when parent re-renders with a new callback identity.
      onChangeRef.current?.(null);
    };
  }, [hostId, siteKey, theme]);

  if (!siteKey) {
    return (
      <Typography variant="caption" color="text.secondary">
        Guest checkout security isn’t configured in this environment.
      </Typography>
    );
  }

  return <Box id={hostId} key={`${siteKey}-${theme}`} sx={{ minHeight: 78 }} />;
}

export function getRecaptchaSiteKey() {
  return String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();
}

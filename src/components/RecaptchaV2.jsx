import { useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";

const SCRIPT_ID = "google-recaptcha-v2";
const SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

function waitForGrecaptcha(timeoutMs = 12_000) {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.grecaptcha?.render) {
        resolve(window.grecaptcha);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("reCAPTCHA took too long to load."));
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function loadRecaptchaScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  if (window.grecaptcha?.render) {
    return Promise.resolve(window.grecaptcha);
  }

  const existing = document.getElementById(SCRIPT_ID);
  if (!existing) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  return waitForGrecaptcha();
}

/**
 * Google reCAPTCHA v2 checkbox. Calls onChange(token|null).
 * `theme`: "light" | "dark" — matches MUI color mode.
 */
export default function RecaptchaV2({ siteKey, onChange, onReadyError, theme = "light" }) {
  const hostRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onReadyErrorRef = useRef(onReadyError);
  const [loadError, setLoadError] = useState("");
  onChangeRef.current = onChange;
  onReadyErrorRef.current = onReadyError;

  useEffect(() => {
    if (!siteKey) return undefined;

    let cancelled = false;
    const captchaTheme = theme === "dark" ? "dark" : "light";
    setLoadError("");

    loadRecaptchaScript()
      .then((grecaptcha) => new Promise((resolve, reject) => {
        grecaptcha.ready(() => {
          try {
            resolve(grecaptcha);
          } catch (error) {
            reject(error);
          }
        });
      }))
      .then((grecaptcha) => {
        if (cancelled) return;
        const el = hostRef.current;
        if (!el) {
          setLoadError("Could not show the security check. Refresh and try again.");
          return;
        }

        // Fresh host node — avoid “already been rendered” from remounts.
        el.innerHTML = "";
        widgetIdRef.current = grecaptcha.render(el, {
          sitekey: siteKey,
          theme: captchaTheme,
          callback: (token) => onChangeRef.current?.(token || null),
          "expired-callback": () => onChangeRef.current?.(null),
          "error-callback": () => {
            onChangeRef.current?.(null);
            setLoadError("Security check failed to load. Check domain allowlist or refresh.");
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error?.message || "Could not load the security check.";
        setLoadError(message);
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
      if (hostRef.current) hostRef.current.innerHTML = "";
      onChangeRef.current?.(null);
    };
  }, [siteKey, theme]);

  if (!siteKey) {
    return (
      <Typography variant="caption" color="text.secondary">
        Guest checkout security isn’t configured in this environment.
      </Typography>
    );
  }

  return (
    <Box>
      <Box
        ref={hostRef}
        sx={{
          minHeight: 78,
          // Keep the widget readable on dark pages even before Google paints.
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          borderRadius: 1,
        }}
      />
      {loadError ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 1, lineHeight: 1.45 }}>
          {loadError}
        </Typography>
      ) : null}
    </Box>
  );
}

export function getRecaptchaSiteKey() {
  return String(import.meta.env.VITE_RECAPTCHA_SITE_KEY || "").trim();
}

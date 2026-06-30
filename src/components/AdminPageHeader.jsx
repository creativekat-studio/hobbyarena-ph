import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, cloneElement, isValidElement } from "react";
import { createPortal } from "react-dom";
import { Box, Stack, Typography } from "@mui/material";

/** Vertical rhythm for admin page body — header lives in the top bar. */
export const ADMIN_PAGE_SPACING = 2;

export const ADMIN_HEADER_ACTION_SLOT_ID = "admin-header-action-slot";
export const ADMIN_HEADER_ACTION_MOBILE_SLOT_ID = "admin-header-action-mobile-slot";

const AdminPageHeaderContext = createContext(null);

export function AdminPageHeaderProvider({ children }) {
  const [header, setHeaderState] = useState(null);
  const toolbarSlotRef = useRef(null);
  const mobileSlotRef = useRef(null);
  const setHeader = useCallback((next) => {
    setHeaderState((prev) => {
      if (
        prev?.eyebrow === next.eyebrow
        && prev?.title === next.title
        && prev?.subtitle === next.subtitle
      ) {
        return prev;
      }
      return next;
    });
  }, []);
  const clearHeader = useCallback(() => setHeaderState(null), []);

  const value = useMemo(
    () => ({ header, setHeader, clearHeader, toolbarSlotRef, mobileSlotRef }),
    [header, setHeader, clearHeader],
  );

  return (
    <AdminPageHeaderContext.Provider value={value}>
      {children}
    </AdminPageHeaderContext.Provider>
  );
}

function useAdminPageHeaderContext() {
  const ctx = useContext(AdminPageHeaderContext);
  if (!ctx) {
    throw new Error("AdminPageHeader must be used within AdminPageHeaderProvider");
  }
  return ctx;
}

/** Renders the active page title inside the admin top bar. */
export function AdminPageHeaderToolbar({
  surfaceBorderColor,
  notificationBell,
  storefrontButton,
  themeToggle,
}) {
  const { header, toolbarSlotRef } = useAdminPageHeaderContext();

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={{ xs: 1.5, md: 2 }}
      sx={{ width: "100%", minHeight: { xs: 64, md: 76 }, py: { xs: 0.75, md: 1 } }}
    >
      <Box sx={{ flex: 1, minWidth: 0, pr: { md: 2 } }}>
        {header ? (
          <Box>
            {header.eyebrow ? (
              <Typography
                variant="overline"
                sx={{
                  color: "primary.main",
                  fontWeight: 800,
                  letterSpacing: 1.6,
                  fontSize: { xs: "0.62rem", md: "0.68rem" },
                  lineHeight: 1.2,
                  display: "block",
                }}
              >
                {header.eyebrow}
              </Typography>
            ) : null}
            <Box
              component="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "1.28rem", md: "1.55rem" },
                lineHeight: 1.15,
                m: 0,
                mt: header.eyebrow ? 0.15 : 0,
              }}
            >
              {header.title}
            </Box>
            {header.subtitle ? (
              <Typography
                color="text.secondary"
                sx={{
                  mt: 0.35,
                  fontSize: { xs: "0.8rem", md: "0.88rem" },
                  lineHeight: 1.45,
                  maxWidth: 760,
                  display: { xs: "none", sm: "block" },
                }}
              >
                {header.subtitle}
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.secondary" }}>Admin</Typography>
        )}
      </Box>

      <Box
        ref={toolbarSlotRef}
        id={ADMIN_HEADER_ACTION_SLOT_ID}
        sx={{ flexShrink: 0, display: { xs: "none", sm: "block" } }}
      />

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ flexShrink: 0, pl: { xs: 0, sm: 1 }, borderLeft: { sm: "1px solid" }, borderColor: { sm: surfaceBorderColor } }}
      >
        {storefrontButton}
        {notificationBell}
        {themeToggle}
      </Stack>
    </Stack>
  );
}

function syncSlotRef(ref, node) {
  if (ref.current !== node) {
    ref.current = node;
  }
}

/** Registers page title in the admin top bar; optional action portals into toolbar + mobile slots. */
export default function AdminPageHeader({ eyebrow, title, subtitle, action }) {
  const { setHeader, clearHeader, toolbarSlotRef, mobileSlotRef } = useAdminPageHeaderContext();

  useLayoutEffect(() => {
    setHeader({ eyebrow, title, subtitle });
  }, [eyebrow, title, subtitle, setHeader]);

  useEffect(() => () => clearHeader(), [clearHeader]);

  const mobileAction = action && isValidElement(action)
    ? cloneElement(action, { key: "admin-header-action-mobile" })
    : action;

  return (
    <>
      {action && toolbarSlotRef.current ? createPortal(action, toolbarSlotRef.current) : null}
      {mobileAction && mobileSlotRef.current ? createPortal(mobileAction, mobileSlotRef.current) : null}
    </>
  );
}

/** Optional: show page action + subtitle on mobile below the top bar. */
export function AdminPageHeaderMobileMeta({ subtitle }) {
  const { header, mobileSlotRef } = useAdminPageHeaderContext();
  const showSubtitle = subtitle ?? header?.subtitle;

  if (!showSubtitle) {
    return (
      <Box
        ref={(node) => syncSlotRef(mobileSlotRef, node)}
        id={ADMIN_HEADER_ACTION_MOBILE_SLOT_ID}
        sx={{ display: { xs: "block", sm: "none" } }}
      />
    );
  }

  return (
    <Stack spacing={1.25} sx={{ display: { xs: "flex", sm: "none" }, mb: 0.5 }}>
      <Typography color="text.secondary" sx={{ fontSize: "0.84rem", lineHeight: 1.45 }}>
        {showSubtitle}
      </Typography>
      <Box ref={(node) => syncSlotRef(mobileSlotRef, node)} id={ADMIN_HEADER_ACTION_MOBILE_SLOT_ID} />
    </Stack>
  );
}

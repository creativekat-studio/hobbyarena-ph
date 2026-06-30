import { useState } from "react";
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from "@mui/material";
import { MONO_FONT } from "../theme.js";
import { useCatalog } from "../lib/catalogStore.jsx";

const TERMS_SCROLL_SX = {
  minHeight: { xs: 200, md: 240 },
  maxHeight: { xs: 260, md: 300 },
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  pr: 0.75,
  mr: -0.25,
  "&::-webkit-scrollbar": { width: 6 },
  "&::-webkit-scrollbar-thumb": {
    borderRadius: 999,
    bgcolor: "action.disabled",
  },
};

export default function ProductTermsSection({
  isPreorder,
  panelSx,
  surfaceBorderColor,
  onAcceptChange,
  accepted,
  showAcceptance = false,
  showHeading = true,
  compact = false,
}) {
  const { terms } = useCatalog();
  const termList = isPreorder ? terms.preorder : terms.generic;
  const title = isPreorder ? "Pre-order terms & conditions" : "Terms & conditions";

  return (
    <Box
      sx={{
        ...(panelSx ?? {}),
        p: { xs: 2, md: 2.5 },
        mt: showAcceptance ? 0 : 2,
        display: "flex",
        flexDirection: "column",
        minHeight: isPreorder && !compact ? { md: 320 } : undefined,
      }}
    >
      {showHeading && isPreorder ? (
        <Typography
          variant="overline"
          sx={{ display: "block", fontWeight: 800, letterSpacing: 1.4, color: "primary.main", mb: 1, flexShrink: 0 }}
        >
          Pre-order terms & conditions
        </Typography>
      ) : null}
      {showHeading ? (
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, flexShrink: 0 }}>{title}</Typography>
      ) : null}
      <Box sx={isPreorder ? TERMS_SCROLL_SX : undefined}>
        <Stack spacing={1.75} sx={{ color: "text.secondary", fontSize: "0.88rem", lineHeight: 1.6 }}>
          {termList.map((line) => (
            <Typography component="p" key={line} sx={{ m: 0 }}>
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>
      {showAcceptance ? (
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: surfaceBorderColor, flexShrink: 0 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={accepted}
                onChange={(e) => onAcceptChange?.(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                I have read and understand the pre-order terms & conditions above.
              </Typography>
            }
          />
          {!accepted ? (
            <Alert severity="info" sx={{ mt: 1, fontSize: "0.82rem" }}>
              Please check the box above before placing your pre-order.
            </Alert>
          ) : null}
        </Box>
      ) : null}
      <Typography sx={{ mt: 2, fontFamily: MONO_FONT, fontSize: "0.62rem", color: "text.secondary", letterSpacing: 0.5, flexShrink: 0 }}>
        Hobby Arena Marketing Corporation · Policies subject to update
      </Typography>
    </Box>
  );
}

export function usePreorderTermsAcceptance(isPreorder) {
  const [accepted, setAccepted] = useState(false);
  return { accepted, setAccepted, required: isPreorder };
}

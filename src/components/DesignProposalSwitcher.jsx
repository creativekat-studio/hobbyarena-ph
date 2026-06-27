import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { useDesignProposal } from "../lib/designProposal.jsx";
import { useShopNavLayout } from "../lib/shopNavLayout.jsx";
import { usePreorderDisplay } from "../lib/preorderDisplayLayout.jsx";
import { SHOP_NAV_LAYOUTS } from "../data/shopNav.js";
import {
  PREORDER_COUNTDOWN_VARIANTS,
  PREORDER_PRICING_VARIANTS,
} from "../data/preorderDisplay.js";

function SectionLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: MONO_FONT,
        fontSize: "0.62rem",
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: "text.secondary",
        fontWeight: 700,
        pt: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

function OptionButton({ active, onClick, children, color = "primary", surfaceBorderColor }) {
  return (
    <Button
      size="small"
      variant={active ? "contained" : "outlined"}
      color={active ? color : "inherit"}
      onClick={onClick}
      sx={{
        justifyContent: "flex-start",
        fontFamily: MONO_FONT,
        fontSize: "0.68rem",
        letterSpacing: 0.3,
        textTransform: "none",
        ...(!active && { borderColor: surfaceBorderColor, color: "text.secondary" }),
      }}
    >
      {children}
    </Button>
  );
}

export default function DesignProposalSwitcher({ surfaces }) {
  const theme = useTheme();
  const { proposalId, setProposalId, proposal } = useDesignProposal();
  const { layoutId, setLayoutId } = useShopNavLayout();
  const { countdownVariant, pricingVariant, setCountdownVariant, setPricingVariant } = usePreorderDisplay();
  const { surfaceBorderColor } = surfaces;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: 16, md: 24 },
        left: { xs: 16, md: 24 },
        zIndex: 1300,
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: surfaceBorderColor,
        bgcolor: alpha(theme.palette.background.paper, 0.92),
        backdropFilter: "blur(16px)",
        boxShadow: theme.ha?.proposalId === 2
          ? `0 12px 40px rgba(0,0,0,0.45), 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`
          : "0 12px 40px rgba(0,0,0,0.18)",
        maxWidth: 240,
        maxHeight: { xs: "calc(100dvh - 96px)", md: "calc(100dvh - 120px)" },
        overflowY: "auto",
      }}
    >
      <Stack spacing={1.25}>
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: "0.62rem",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "text.secondary",
            fontWeight: 700,
          }}
        >
          Design preview
        </Typography>
        <Stack direction="row" spacing={0.75}>
          {[1, 2].map((id) => (
            <Button
              key={id}
              size="small"
              variant={proposalId === id ? "contained" : "outlined"}
              color={proposalId === id ? "primary" : "inherit"}
              onClick={() => setProposalId(id)}
              sx={{
                minWidth: 0,
                px: 1.5,
                py: 0.5,
                fontFamily: MONO_FONT,
                fontSize: "0.72rem",
                letterSpacing: 0.5,
                ...(proposalId !== id && { borderColor: surfaceBorderColor, color: "text.secondary" }),
              }}
            >
              {id === 1 ? "Neon" : "Brand"}
            </Button>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", lineHeight: 1.35 }}>
          Theme: <strong>{proposal.name}</strong>
        </Typography>

        <SectionLabel>Shop nav layout</SectionLabel>
        <Stack spacing={0.5}>
          {Object.values(SHOP_NAV_LAYOUTS).map((layout) => (
            <OptionButton
              key={layout.id}
              active={layoutId === layout.id}
              onClick={() => setLayoutId(layout.id)}
              color="secondary"
              surfaceBorderColor={surfaceBorderColor}
            >
              {layout.label}
            </OptionButton>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.35 }}>
          {SHOP_NAV_LAYOUTS[layoutId]?.description}
        </Typography>

        <SectionLabel>Pre-order timer</SectionLabel>
        <Stack spacing={0.5}>
          {Object.values(PREORDER_COUNTDOWN_VARIANTS).map((option) => (
            <OptionButton
              key={option.id}
              active={countdownVariant === option.id}
              onClick={() => setCountdownVariant(option.id)}
              surfaceBorderColor={surfaceBorderColor}
            >
              {option.label}
            </OptionButton>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.35 }}>
          {PREORDER_COUNTDOWN_VARIANTS[countdownVariant]?.description}
        </Typography>

        <SectionLabel>Pre-order pricing</SectionLabel>
        <Stack spacing={0.5}>
          {Object.values(PREORDER_PRICING_VARIANTS).map((option) => (
            <OptionButton
              key={option.id}
              active={pricingVariant === option.id}
              onClick={() => setPricingVariant(option.id)}
              surfaceBorderColor={surfaceBorderColor}
            >
              {option.label}
            </OptionButton>
          ))}
        </Stack>
        <Typography sx={{ fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.35 }}>
          {PREORDER_PRICING_VARIANTS[pricingVariant]?.description}
        </Typography>

        <Typography sx={{ fontSize: "0.62rem", color: "text.secondary", lineHeight: 1.4, pt: 0.5, borderTop: "1px solid", borderColor: surfaceBorderColor }}>
          Browse pre-orders on the homepage or <strong>/shop?category=preorder</strong> to preview live.
        </Typography>
      </Stack>
    </Box>
  );
}

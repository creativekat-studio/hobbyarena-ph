import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MONO_FONT } from "../theme.js";
import { useDesignProposal } from "../lib/designProposal.jsx";

export default function DesignProposalSwitcher({ surfaces }) {
  const theme = useTheme();
  const { proposalId, setProposalId, proposal } = useDesignProposal();
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
      }}
    >
      <Stack spacing={1}>
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
        <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", maxWidth: 180, lineHeight: 1.35 }}>
          Active: <strong>{proposal.name}</strong>
        </Typography>
      </Stack>
    </Box>
  );
}

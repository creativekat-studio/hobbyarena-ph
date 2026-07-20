import { Box, Grid, Stack } from "@mui/material";
import { useOutletContext } from "react-router-dom";
import AdminPageHeader, { ADMIN_PAGE_SPACING } from "../components/AdminPageHeader.jsx";
import DesignPreviewSettings from "../components/DesignPreviewSettings.jsx";
import DesignPreviewMockup from "../components/DesignPreviewMockup.jsx";
import DemoDataResetPanel from "./DemoDataResetPanel.jsx";
import { isLocalHost, isPreviewHost } from "../lib/siteAccess.js";

const PREVIEW_STICKY_SX = {
  position: { lg: "sticky" },
  top: { lg: 16 },
  alignSelf: "flex-start",
  width: "100%",
  maxHeight: { lg: "calc(100dvh - 80px)" },
  display: "flex",
  flexDirection: "column",
};

export default function DesignPreviewPage() {
  const { surfaces } = useOutletContext();
  const { panelSx, surfaceBorderColor } = surfaces;
  const showDangerZone = isLocalHost() || isPreviewHost();

  return (
    <Stack spacing={ADMIN_PAGE_SPACING}>
      <AdminPageHeader
        eyebrow="Appearance"
        title="Design preview"
        subtitle="Theme, color mode, navigation, listing filters, and pre-order UI. Edit on the left — preview updates on the right. Save at the bottom of the settings to publish."
      />

      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, lg: 6 }} order={{ xs: 1, lg: 1 }}>
          <DesignPreviewSettings panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }} order={{ xs: 2, lg: 2 }} sx={{ display: "flex", minHeight: 0 }}>
          <Box sx={{ ...PREVIEW_STICKY_SX, flex: 1 }}>
            <DesignPreviewMockup panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
          </Box>
        </Grid>
      </Grid>

      {showDangerZone ? (
        <DemoDataResetPanel panelSx={panelSx} surfaceBorderColor={surfaceBorderColor} />
      ) : null}
    </Stack>
  );
}

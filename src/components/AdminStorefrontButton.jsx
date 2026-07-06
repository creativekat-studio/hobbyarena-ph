import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";
import { useCms } from "../lib/cmsContent.jsx";
import {
  PREVIEW_STOREFRONT_URL,
  isLocalHost,
  isPreviewHost,
  shouldShowLandingPage,
} from "../lib/siteAccess.js";

export default function AdminStorefrontButton({
  label = "Open storefront ↗",
  sx,
  ...props
}) {
  const navigate = useNavigate();
  const { content } = useCms();
  const landingActive = shouldShowLandingPage(content.storefront?.landingMode);

  const handleClick = () => {
    if (landingActive) {
      if (isLocalHost()) {
        navigate("/?storefront=1");
        return;
      }
      window.open(PREVIEW_STOREFRONT_URL, "_blank", "noopener,noreferrer");
      return;
    }
    navigate("/");
  };

  const buttonLabel = landingActive && !isPreviewHost() && !isLocalHost()
    ? "Open preview ↗"
    : landingActive && isLocalHost()
      ? "Preview shop ↗"
      : label;

  return (
    <Button
      size="small"
      variant="contained"
      color="primary"
      onClick={handleClick}
      sx={{
        fontSize: "0.78rem",
        fontFamily: MONO_FONT,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        fontWeight: 800,
        whiteSpace: "nowrap",
        ...sx,
      }}
      {...props}
    >
      {buttonLabel}
    </Button>
  );
}

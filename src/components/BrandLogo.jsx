import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BRAND_LOGO } from "../data/mediaAssets.js";
import { BrandMark } from "./icons.jsx";

export default function BrandLogo({ sx, imageSx }) {
  const theme = useTheme();
  const useImage = theme.ha?.useImageLogo;

  if (useImage) {
    return (
      <Box
        component="img"
        src={BRAND_LOGO}
        alt="Hobby Arena"
        decoding="async"
        fetchpriority="high"
        width={512}
        height={341}
        sx={{
          display: "block",
          height: { xs: 54, md: 66 },
          width: "auto",
          objectFit: "contain",
          bgcolor: "transparent",
          filter: "none",
          ...imageSx,
          ...sx,
        }}
      />
    );
  }

  return <BrandMark sx={sx} />;
}

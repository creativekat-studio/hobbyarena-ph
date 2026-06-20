import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { BrandMark } from "./icons.jsx";

export default function BrandLogo({ sx, imageSx }) {
  const theme = useTheme();
  const useImage = theme.ha?.useImageLogo;

  if (useImage) {
    return (
      <Box
        component="img"
        src="/logo.png"
        alt="Hobby Arena"
        sx={{
          height: { xs: 44, md: 52 },
          width: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.35))",
          ...imageSx,
          ...sx,
        }}
      />
    );
  }

  return <BrandMark sx={sx} />;
}

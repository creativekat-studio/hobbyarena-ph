import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { MARQUEE_BANNERS } from "../data/mediaAssets.js";

const marqueeSlide = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

function BannerSlide({ src, alt }) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      sx={{
        height: { xs: 88, sm: 110, md: 128 },
        width: "auto",
        maxWidth: { xs: 280, sm: 360, md: 420 },
        objectFit: "cover",
        borderRadius: 1.5,
        flexShrink: 0,
        display: "block",
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
      }}
    />
  );
}

export default function BannerMarquee() {
  const theme = useTheme();
  if (!MARQUEE_BANNERS.length) return null;

  const loop = [...MARQUEE_BANNERS, ...MARQUEE_BANNERS];

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        py: { xs: 1.5, md: 2 },
        borderBottom: "1px solid",
        borderColor: alpha(theme.palette.divider, 0.6),
        bgcolor: alpha(theme.palette.background.default, 0.5),
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          top: 0,
          bottom: 0,
          width: { xs: 32, md: 64 },
          zIndex: 1,
          pointerEvents: "none",
        },
        "&::before": {
          left: 0,
          background: `linear-gradient(90deg, ${theme.palette.background.default}, transparent)`,
        },
        "&::after": {
          right: 0,
          background: `linear-gradient(270deg, ${theme.palette.background.default}, transparent)`,
        },
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          gap: { xs: 2, md: 3 },
          whiteSpace: "nowrap",
          animation: `${marqueeSlide} 38s linear infinite`,
          px: { xs: 2, md: 3 },
          "&:hover": { animationPlayState: "paused" },
        }}
      >
        {loop.map((src, index) => (
          <BannerSlide key={`${src}-${index}`} src={src} alt={`Hobby Arena promo ${(index % MARQUEE_BANNERS.length) + 1}`} />
        ))}
      </Box>
    </Box>
  );
}

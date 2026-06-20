import { useState } from "react";
import { Box, Rating, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import { MONO_FONT } from "../theme.js";
import { avatarStyles } from "../lib/surfaces.js";
import { TESTIMONIALS } from "../data/mockData.js";

const marqueeSlide = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

function TestimonialCard({ item, panelSx, isDarkMode, surfaceBorderColor }) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const primary = theme.palette.primary.main;
  const hoverAccent = theme.palette.secondary.main;

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        ...panelSx,
        width: { xs: 288, sm: 320, md: 340 },
        flexShrink: 0,
        p: 3,
        height: "100%",
        minHeight: 220,
        display: "flex",
        flexDirection: "column",
        scrollSnapAlign: "center",
        cursor: "default",
        transition: "transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1), border-color 280ms ease, box-shadow 320ms ease",
        transform: hovered ? "translateY(-10px) scale(1.02)" : "none",
        borderColor: hovered ? alpha(hoverAccent, 0.55) : surfaceBorderColor,
        boxShadow: hovered
          ? isDarkMode
            ? `0 28px 60px rgba(0,0,0,0.5), 0 0 28px ${alpha(hoverAccent, 0.22)}`
            : `0 24px 48px ${alpha(hoverAccent, 0.16)}`
          : panelSx.boxShadow,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: hovered
            ? `linear-gradient(135deg, ${alpha(hoverAccent, 0.08)} 0%, transparent 55%)`
            : "transparent",
          pointerEvents: "none",
          transition: "opacity 280ms ease",
          opacity: hovered ? 1 : 0,
        },
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Typography
        aria-hidden
        sx={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: "3.5rem",
          lineHeight: 1,
          color: alpha(primary, hovered ? 0.14 : 0.07),
          fontFamily: "Georgia, serif",
          transition: "color 280ms ease, transform 320ms ease",
          transform: hovered ? "scale(1.1) rotate(-6deg)" : "none",
          userSelect: "none",
        }}
      >
        "
      </Typography>

      <Rating
        value={5}
        size="small"
        readOnly
        sx={{
          mb: 1.5,
          position: "relative",
          zIndex: 1,
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: "transform 280ms ease",
          "& .MuiRating-iconFilled": { color: primary },
        }}
      />

      <Typography
        sx={{
          fontSize: hovered ? "1.03rem" : "1rem",
          lineHeight: 1.65,
          flexGrow: 1,
          position: "relative",
          zIndex: 1,
          transition: "font-size 280ms ease, color 280ms ease",
          color: hovered ? "text.primary" : "text.primary",
          fontStyle: "normal",
        }}
      >
        {item.quote}
      </Typography>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5, position: "relative", zIndex: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            ...avatarStyles(theme),
            transition: "transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1)",
            transform: hovered ? "scale(1.1) rotate(-4deg)" : "none",
            boxShadow: hovered ? `0 4px 16px ${alpha(theme.palette.secondary.main, 0.35)}` : "none",
          }}
        >
          {item.name.charAt(0)}
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name}</Typography>
          <Typography
            sx={{
              color: hovered ? "primary.main" : "text.secondary",
              fontSize: "0.78rem",
              fontFamily: MONO_FONT,
              letterSpacing: 0.3,
              transition: "color 280ms ease",
            }}
          >
            {item.role}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function TestimonialsShowcase({ panelSx, isDarkMode, surfaceBorderColor }) {
  const theme = useTheme();
  const [paused, setPaused] = useState(false);
  const loop = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <Box>
      <Stack spacing={1} alignItems="center" textAlign="center" sx={{ mb: 4 }}>
        <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 800, letterSpacing: 2 }}>
          Loved by collectors
        </Typography>
        <Typography variant="h4">The thrill of the pull.</Typography>
        <Typography color="text.secondary" sx={{ fontSize: "0.88rem", mt: 0.5 }}>
          Hover to pause · swipe on mobile
        </Typography>
      </Stack>

      <Box
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        sx={{
          position: "relative",
          overflow: "hidden",
          mx: { xs: -2, sm: 0 },
          "&::before, &::after": {
            content: '""',
            position: "absolute",
            top: 0,
            bottom: 0,
            width: { xs: 24, md: 56 },
            zIndex: 2,
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
        {/* Mobile / touch: manual scroll */}
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            gap: 2,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            px: 2,
            pb: 1,
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {TESTIMONIALS.map((item) => (
            <TestimonialCard
              key={item.name}
              item={item}
              panelSx={panelSx}
              isDarkMode={isDarkMode}
              surfaceBorderColor={surfaceBorderColor}
            />
          ))}
        </Box>

        {/* Desktop: auto-scroll marquee */}
        <Box
          sx={{
            display: { xs: "none", md: "block" },
            overflow: "hidden",
            py: 2,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              gap: 2.5,
              whiteSpace: "nowrap",
              animation: `${marqueeSlide} 55s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
              px: 1,
            }}
          >
            {loop.map((item, index) => (
              <TestimonialCard
                key={`${item.name}-${index}`}
                item={item}
                panelSx={panelSx}
                isDarkMode={isDarkMode}
                surfaceBorderColor={surfaceBorderColor}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

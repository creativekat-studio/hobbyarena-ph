import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CardIcon, PokeballIcon } from "../components/icons.jsx";
import { OFF_WHITE } from "../lib/colors.js";
import { productMediaSurface } from "../lib/surfaces.js";

export default function InventoryProductThumb({ row, size = 48, isDarkMode }) {
  const theme = useTheme();
  const dark = isDarkMode ?? theme.palette.mode === "dark";
  const isPokemon = row.line?.startsWith("Pokémon");
  const Glyph = isPokemon ? PokeballIcon : CardIcon;

  return (
    <Box
      sx={{
        ...productMediaSurface(dark),
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {row.image ? (
        <Box
          component="img"
          src={row.image}
          alt=""
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Glyph sx={{ fontSize: size * 0.42, color: OFF_WHITE.glyph, opacity: 0.85 }} />
      )}
    </Box>
  );
}

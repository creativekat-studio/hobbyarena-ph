import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { MONO_FONT } from "../theme.js";

export default function AdminStorefrontButton({
  label = "Open storefront ↗",
  sx,
  ...props
}) {
  const navigate = useNavigate();

  return (
    <Button
      size="small"
      variant="contained"
      color="primary"
      onClick={() => navigate("/")}
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
      {label}
    </Button>
  );
}

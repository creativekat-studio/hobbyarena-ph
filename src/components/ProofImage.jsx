import { useState } from "react";
import { Box, CircularProgress } from "@mui/material";

/** Attachment/proof image preview: async decode + spinner while it loads. */
export default function ProofImage({ src, alt, surfaceBorderColor }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Box sx={{ position: "relative", minHeight: 180 }}>
      {!loaded ? (
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={26} />
        </Box>
      ) : null}
      <Box
        component="img"
        src={src}
        alt={alt}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        sx={{
          width: "100%",
          maxHeight: "70vh",
          objectFit: "contain",
          borderRadius: 1,
          border: "1px solid",
          borderColor: surfaceBorderColor,
          display: "block",
          mx: "auto",
          opacity: loaded ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      />
    </Box>
  );
}

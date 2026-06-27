import { Rating, Stack, Typography } from "@mui/material";
import { useCms } from "../lib/cmsContent.jsx";

/**
 * Product star rating + review count. Hidden unless CMS enables product ratings
 * and the product has at least one review.
 */
export default function ProductRating({ product, size = "small", showLabel = true }) {
  const { content } = useCms();
  const enabled = content.productReviews?.showRatings;
  const count = product?.reviews ?? 0;
  const rating = product?.rating ?? 0;

  if (!enabled || count <= 0) return null;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Rating value={rating} precision={0.1} size={size} readOnly />
      {showLabel ? (
        <Typography sx={{ fontSize: size === "small" ? "0.72rem" : "0.85rem", color: "text.secondary" }}>
          ({count} {count === 1 ? "review" : "reviews"})
        </Typography>
      ) : null}
    </Stack>
  );
}

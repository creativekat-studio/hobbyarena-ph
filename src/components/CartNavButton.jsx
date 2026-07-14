import { useEffect, useState } from "react";
import { Badge, IconButton, Tooltip } from "@mui/material";
import { keyframes } from "@mui/system";
import { CartIcon } from "./icons.jsx";
import { useCart } from "../lib/cartStore.jsx";

const cartBounce = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.22) rotate(-8deg); }
  50% { transform: scale(0.94) rotate(6deg); }
  75% { transform: scale(1.1) rotate(-3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const badgePop = keyframes`
  0% { transform: scale(0.5); }
  55% { transform: scale(1.28); }
  100% { transform: scale(1); }
`;

export default function CartNavButton({ onOpenCart, size = "medium", ...iconButtonProps }) {
  const { itemCount, addPulse, openCart } = useCart();
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (!addPulse) return undefined;
    setBounce(false);
    const frame = window.requestAnimationFrame(() => setBounce(true));
    const timer = window.setTimeout(() => setBounce(false), 560);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [addPulse]);

  function handleClick() {
    if (onOpenCart) onOpenCart();
    else openCart();
  }

  const { sx: sxProp, ...rest } = iconButtonProps;

  return (
    <Tooltip title="Cart">
      <IconButton
        color="inherit"
        onClick={handleClick}
        size={size}
        aria-label="Open cart"
        {...rest}
        sx={{
          ...(sxProp || {}),
          ...(bounce
            ? { animation: `${cartBounce} 520ms cubic-bezier(0.34, 1.4, 0.64, 1)` }
            : null),
        }}
      >
        <Badge
          badgeContent={itemCount}
          color="primary"
          invisible={itemCount === 0}
          sx={
            bounce
              ? {
                  "& .MuiBadge-badge": {
                    animation: `${badgePop} 420ms ease-out`,
                  },
                }
              : undefined
          }
        >
          <CartIcon />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}

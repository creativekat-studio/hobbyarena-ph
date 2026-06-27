import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getNavConfig } from "../data/shopNav.js";
import { useShopNavLayout } from "../lib/shopNavLayout.jsx";

function NavButton({ children, onClick, sx }) {
  return (
    <Button
      color="inherit"
      onClick={onClick}
      sx={{ fontWeight: 700, color: "text.secondary", "&:hover": { color: "text.primary" }, ...sx }}
    >
      {children}
    </Button>
  );
}

function NavDropdown({ label, items, onNavigate, isActive }) {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);

  return (
    <>
      <NavButton
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ color: isActive ? "text.primary" : "text.secondary" }}
      >
        {label} ▾
      </NavButton>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              setAnchor(null);
              onNavigate(item);
            }}
            sx={{ fontWeight: 600, fontSize: "0.9rem" }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function ShopNav({ onSectionNav }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { layoutId } = useShopNavLayout();
  const config = getNavConfig(layoutId);

  if (config.type === "dock") return null;

  function goTo(to) {
    navigate(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleItem(item) {
    if (item.section) {
      onSectionNav(item.section);
      return;
    }
    goTo(item.to);
  }

  const shopPath = location.pathname.startsWith("/shop");

  function groupActive(items) {
    return shopPath && items.some((item) => item.to && `${location.pathname}${location.search}`.startsWith(item.to.split("?")[0]));
  }

  if (config.type === "flat") {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 2, display: { xs: "none", lg: "flex" } }}>
        <NavButton onClick={() => goTo(config.home.to)}>Home</NavButton>
        {config.links.map((item) => (
          <NavButton
            key={item.label}
            onClick={() => handleItem(item)}
            sx={{ color: `${location.pathname}${location.search}` === item.to ? "text.primary" : undefined }}
          >
            {item.label}
          </NavButton>
        ))}
        <NavButton onClick={() => handleItem(config.contact)}>Contact</NavButton>
      </Stack>
    );
  }

  if (config.type === "compact") {
    const allItems = config.shopMenu.groups.flatMap((g) => g.items);
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 2, display: { xs: "none", lg: "flex" } }}>
        <NavButton onClick={() => goTo(config.home.to)}>Home</NavButton>
        <NavDropdown label={config.shopMenu.label} items={allItems} onNavigate={handleItem} isActive={shopPath} />
        <NavButton onClick={() => handleItem(config.contact)}>Contact</NavButton>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: 2, display: { xs: "none", lg: "flex" } }}>
      <NavButton onClick={() => goTo(config.home.to)}>Home</NavButton>
      {config.groups.map((group) => (
        <NavDropdown
          key={group.id}
          label={group.label}
          items={group.items}
          onNavigate={handleItem}
          isActive={groupActive(group.items)}
        />
      ))}
      <NavButton onClick={() => handleItem(config.contact)}>Contact</NavButton>
    </Stack>
  );
}

/** Mobile drawer links — flat list for classic layouts. */
export function ShopNavMobileItems({ onNavigate, onClose }) {
  const { layoutId } = useShopNavLayout();
  const config = getNavConfig(layoutId);

  function handle(item) {
    onNavigate(item);
    onClose?.();
  }

  const items = [{ label: "Home", to: "/" }];
  if (config.type === "flat") {
    items.push(...config.links);
  } else if (config.type !== "dock") {
    const groups = config.type === "compact" ? config.shopMenu.groups : config.groups;
    groups.forEach((group) => {
      items.push(...group.items.map((item) => ({ ...item, label: `${group.label} · ${item.label}` })));
    });
  }
  items.push({ label: "Contact", section: "contact" });

  return items.map((item) => (
    <Button
      key={item.label}
      fullWidth
      color="inherit"
      onClick={() => handle(item)}
      sx={{ justifyContent: "flex-start", fontWeight: 600, py: 1.25 }}
    >
      {item.label}
    </Button>
  ));
}

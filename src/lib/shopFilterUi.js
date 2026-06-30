/** Storefront listing filter layout helpers. */

export function getFilterLayoutMode(layoutId) {
  if (layoutId === "franchiseRail") return "rail";
  if (layoutId === "current") return "sidebar";
  return "top";
}

export function getTopFilterVariant(layoutId) {
  if (layoutId === "commandBar" || layoutId === "franchiseTiles" || layoutId === "breadcrumb") {
    return layoutId;
  }
  return null;
}

export function embedsCategoryTabs(layoutId) {
  return layoutId === "commandBar";
}

export function resolveLineLogo(line) {
  const text = `${line?.label ?? ""} ${line?.match ?? ""}`.toLowerCase();
  if (text.includes("pokémon") || text.includes("pokemon")) return "/TCG logos/Pokemon Logo.png";
  if (text.includes("one piece")) return "/TCG logos/One Piece Logo.png";
  if (text.includes("gundam")) return "/TCG logos/Gundam Logo.png";
  if (text.includes("lorcana")) return "/TCG logos/Lorcana logo.jpg";
  if (text.includes("union arena")) return "/TCG logos/union arena logo.webp";
  if (text.includes("magic")) return "/TCG logos/magic logo.png";
  if (text.includes("yugioh") || text.includes("yu-gi-oh")) return "/TCG logos/Yugioh Logo.jpg";
  return null;
}

export function shortLineLabel(label) {
  if (!label || label === "All lines") return "All";
  const words = label.split(/\s+/);
  if (words.length <= 2) return label;
  return words.slice(0, 2).join(" ");
}

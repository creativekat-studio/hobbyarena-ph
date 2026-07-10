import {
  BoltIcon,
  BoxIcon,
  CardIcon,
  HeartIcon,
  PokeballIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
} from "../components/icons.jsx";

/** Shared perk icon map for CMS + storefront. */
export const PERK_ICONS = {
  shield: ShieldIcon,
  truck: TruckIcon,
  sparkle: SparkleIcon,
  bolt: BoltIcon,
  box: BoxIcon,
  card: CardIcon,
  heart: HeartIcon,
  pokeball: PokeballIcon,
};

export const PERK_ICON_OPTIONS = [
  { id: "shield", label: "Shield" },
  { id: "truck", label: "Truck" },
  { id: "sparkle", label: "Sparkle" },
  { id: "bolt", label: "Bolt" },
  { id: "box", label: "Box" },
  { id: "card", label: "Card" },
  { id: "heart", label: "Heart" },
  { id: "pokeball", label: "Pokeball" },
];

export function getPerkIcon(id) {
  return PERK_ICONS[id] || SparkleIcon;
}

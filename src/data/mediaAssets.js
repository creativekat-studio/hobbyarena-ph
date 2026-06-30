/** Static assets in /public — served from site root. */

/** Encode path segments so filenames with spaces work in URLs. */
export function publicAsset(path) {
  return path
    .split("/")
    .map((segment, index) => (index === 0 && segment === "" ? "" : encodeURIComponent(segment)))
    .join("/");
}

export const BRAND_LOGO = publicAsset("/hobby_arena_hd.png");
export const BRAND_LOGO_HD = BRAND_LOGO;

export const PAYMENT_QR = {
  bpi: publicAsset("/BPI QR.jpg"),
  bdo: publicAsset("/BDO QR.jpg"),
  gcash: publicAsset("/Gcash QR.jpg"),
  maya: publicAsset("/Maya QR.jpg"),
};

export const MARQUEE_BANNERS = [
  publicAsset("/banner/f40acd_0503401aab2c4ba3bfc14b359609b970~mv2.avif"),
  publicAsset("/banner/f40acd_32fb3cd0b7884e909581ad3dd1443c63~mv2.avif"),
  publicAsset("/banner/f40acd_f53c8b9b5591445bb691480ed645e015~mv2.avif"),
  publicAsset("/TCG logos/Pokemon Logo.png"),
  publicAsset("/TCG logos/One Piece Logo.png"),
  publicAsset("/TCG logos/Lorcana logo.jpg"),
  publicAsset("/TCG logos/Gundam Logo.png"),
  publicAsset("/TCG logos/union arena logo.webp"),
  publicAsset("/TCG logos/magic logo.png"),
  publicAsset("/TCG logos/Yugioh Logo.jpg"),
  publicAsset("/TCG logos/weis schwarz logo.jpg"),
];

export const PRODUCT_IMAGES = {
  "pkm-phantasmal-etb": "/products/f40acd_2ff6b3ee34cb4e7c85a7ae6767789628~mv2.avif",
  "pkm-ascended-etb": "/products/ascended-heroes.jpg",
  "pkm-first-partner": "/products/f40acd_53a60dfb33d14d0993e6255305d0a108~mv2.avif",
  "pkm-charizard-upc": "/products/f40acd_98f7e213de1146e8aba5719441063c05~mv2.avif",
  "op-15-booster": "/products/f40acd_af80e6067dc647969bc92eedc6aaa173~mv2.avif",
  "op-jp-3rd-anni-en": "/preorder/f40acd_294040f1956a46d384f4ed755f8d37bb~mv2.avif",
  "op-jp-3rd-anni-cn": "/preorder/f40acd_477bf29bd8014cb681ec9048f83063ff~mv2.avif",
  "op-treasure-chest-2": "/preorder/f40acd_977bd589e0e94c06989894ebb450e433~mv2.avif",
  "op-spc-01": "/preorder/f40acd_b14fcd4cf81b4ea182a7e5d3907f1d54~mv2.avif",
  "op-mini-tin-4": "/preorder/f40acd_d2edf7b3b5e74f9ab4432875528f54f6~mv2.avif",
};

export function productImage(productId) {
  return PRODUCT_IMAGES[productId] ?? null;
}

export function withProductImage(product) {
  return { ...product, image: product.image ?? productImage(product.id) };
}

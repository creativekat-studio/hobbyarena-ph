import { INVENTORY } from "../data/mockData.js";
import { productImage } from "../data/mediaAssets.js";

/** Default inventory rows seeded on first Firestore sync or empty localStorage. */
export function seedInventory() {
  return INVENTORY.map((row, index) => ({
    ...row,
    image: productImage(row.id),
    published: index % 5 !== 0,
    custom: false,
  }));
}

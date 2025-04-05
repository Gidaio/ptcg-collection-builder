import { getSetCards } from "./set-cache.ts";
import { partitionOn } from "./util.ts";

const cards = await getSetCards("SVI");
const cardsByRarity = partitionOn(cards, "rarity");

console.log(cardsByRarity["Common"]?.[0]);
console.log(cardsByRarity["Uncommon"]?.[0]);
console.log(cardsByRarity["Rare"]?.[0]);
console.log(cardsByRarity["Double Rare"]?.[0]);
console.log(cardsByRarity["Illustration Rare"]?.[0]);
console.log(cardsByRarity["Ultra Rare"]?.[0]);
console.log(cardsByRarity["Special Illustration Rare"]?.[0]);
console.log(cardsByRarity["Hyper Rare"]?.[0]);

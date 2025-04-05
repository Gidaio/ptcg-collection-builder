import { getSetCards } from "./set-cache.ts";

const cards = await getSetCards("SVI");

console.log(JSON.stringify(cards, null, 2));

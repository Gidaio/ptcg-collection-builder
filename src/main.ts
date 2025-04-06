import { addBoosterToCollection, Collection } from "./collection.ts";
import { renderCollection as renderCollectionHTML } from "./html.ts";
import { Card, getSetCards } from "./set-cache.ts";
import { partitionOn } from "./util.ts";

export type CardWithQuantity = Card & { quantity: number };

const setToOpen = Deno.args[0];
if (!setToOpen) {
    console.warn("Please give a set to open packs from.");
    Deno.exit(1);
}

const packsToOpen = Number(Deno.args[1]);
if (isNaN(packsToOpen)) {
    console.warn("Please give a number of packs to add to your collection.");
    Deno.exit(1);
}
if (!Number.isInteger(packsToOpen)) {
    console.warn("Please give an INTEGER number of packs to add to your collection. Dingus.");
    Deno.exit(1);
}

const cards = await getSetCards(setToOpen);
const cardsByRarity = partitionOn(cards, "rarity");

const collection: Collection = {};

for (let i = 0; i < packsToOpen; i += 1) {
    addBoosterToCollection(cardsByRarity, collection, {
        doubleRare: 0.1376,
        ultraRare: 0.0657,
        illustrationRare: 0.0767,
        specialIllustrationRare: 0.0315,
        hyperRare: 0.0185,
    });
}

const collectionCards = Object.entries(collection)
    .map<CardWithQuantity>(([number, quantity]) => ({
        ...cards.find((card) => card.number === parseInt(number))!,
        quantity,
    }))
    .sort((a, b) => a.number - b.number);

await Deno.writeTextFile("collection.json", JSON.stringify(collectionCards));
await Deno.writeTextFile("collection.html", renderCollectionHTML(collectionCards));

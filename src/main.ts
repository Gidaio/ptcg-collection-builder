import { addBoosterToCollection, Collection } from "./collection.ts";
import { renderCollection as renderCollectionHTML } from "./html.ts";
import { Card, getSetCards } from "./set-cache.ts";
import { partitionOn } from "./util.ts";

export type CardWithQuantity = Card & { quantity: number };

const cards = await getSetCards("SVI");
const cardsByRarity = partitionOn(cards, "rarity");

const collection: Collection = {};

addBoosterToCollection(cardsByRarity, collection, {
    doubleRare: 0.1376,
    ultraRare: 0.0657,
    illustrationRare: 0.0767,
    specialIllustrationRare: 0.0315,
    hyperRare: 0.0185,
});

const collectionCards = Object.entries(collection)
    .map<CardWithQuantity>(([number, quantity]) => ({
        ...cards.find((card) => card.number === parseInt(number))!,
        quantity,
    }))
    .sort((a, b) => a.number - b.number);

await Deno.writeTextFile("collection.json", JSON.stringify(collectionCards));
await Deno.writeTextFile("collection.html", renderCollectionHTML(collectionCards));

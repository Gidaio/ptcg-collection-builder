import Cache from "./cache.ts";
import Collection from "./collection.ts";
import { renderCollection as renderCollectionHTML } from "./html.ts";
import PokemonTCG from "./pokemon-tcg.ts";
import { partitionOn, readTextFileIfExists } from "./util.ts";

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

// Backup stuff in case anything goes wrong!
const cache = new Cache("cache", new PokemonTCG(await readTextFileIfExists("apikey.txt")));
const cards = await cache.getSetCards(setToOpen);
const cardsByRarity = partitionOn(cards, "rarity");

const collection = await Collection.load("collection.json");

for (let i = 0; i < packsToOpen; i += 1) {
    collection.addBooster(cardsByRarity, {
        doubleRare: 0.1376,
        ultraRare: 0.0657,
        illustrationRare: 0.0767,
        specialIllustrationRare: 0.0315,
        hyperRare: 0.0185,
    });
}

await collection.save();

const collectionCards = await collection.hydrate(cache);

await Deno.copyFile("collection.html", "collection.html.old");
await Deno.writeTextFile("collection.html", renderCollectionHTML(collectionCards));

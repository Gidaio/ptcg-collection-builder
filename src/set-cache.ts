import PokemonTCG from "./pokemon-tcg.ts";
import { readTextFileIfExists } from "./util.ts";

export interface Card {
    number: number;
    name: string;
    rarity: Rarity;
    image: string;
}

type Rarity =
    | "Common"
    | "Uncommon"
    | "Rare"
    | "Double Rare"
    | "Ultra Rare"
    | "Illustration Rare"
    | "Special Illustration Rare"
    | "Hyper Rare";

export async function getSetCards(setID: string): Promise<Card[]> {
    const cardsString = await readTextFileIfExists(`./cache/${setID}.json`);
    if (cardsString !== null) {
        console.log(`Loading ${setID} from cache.`);
        return JSON.parse(cardsString);
    }

    console.log(`Fetching ${setID} from pokemontcg.io.`);
    const apiKey = await readTextFileIfExists("./apikey.txt");
    const pokemonTCG = new PokemonTCG(apiKey);
    const sets = await pokemonTCG.searchSets({ query: `id:${setID} OR ptcgoCode:${setID}` });

    if (sets.length === 0) {
        throw new Error(`No sets matching "${setID}".`);
    }

    if (sets.length > 1) {
        console.warn(`Found multiple sets matching "${setID}", using the first.`);
    }

    const apiCards = await pokemonTCG.searchCards({
        query: `set.id:${sets[0].id}`,
    });

    const cards = apiCards.map<Card>((apiCard) => ({
        number: parseInt(apiCard.number),
        name: apiCard.name,
        rarity: apiCard.rarity as Rarity,
        image: apiCard.images.large,
    })).sort((a, b) => a.number - b.number);

    try {
        await Deno.mkdir("./cache");
    } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
            throw error;
        }
    }
    await Deno.writeTextFile(`./cache/${setID}.json`, JSON.stringify(cards));

    return cards;
}

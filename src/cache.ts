import { join } from "@std/path/join";

import PokemonTCG from "./pokemon-tcg.ts";
import { readTextFileIfExists } from "./util.ts";

export interface Card {
    id: string;
    set: string;
    number: number;
    name: string;
    rarity: Rarity;
    image: string;
}

interface Index {
    version: number;
    sets: IndexSet[];
}

interface IndexSet {
    id: string;
    satisfies: string[];
    fileName: string;
}

interface SetCache {
    version: number;
    setID: string;
    cards: Card[];
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

export default class Cache {
    #index: Index | null = null;

    public constructor(private readonly folder: string, private readonly api: PokemonTCG) {}

    private async getIndex(): Promise<Index> {
        if (this.#index !== null) {
            return this.#index;
        }

        const indexString = await readTextFileIfExists(join(this.folder, "index.lock"));
        if (indexString === null) {
            this.#index = { version: 1, sets: [] };
        } else {
            this.#index = JSON.parse(indexString) as Index;
        }

        return this.#index;
    }

    private async addSetToIndex(set: IndexSet): Promise<void> {
        if (this.#index === null) {
            await this.getIndex();
        }

        this.#index!.sets.push(set);
        await Deno.writeTextFile(join(this.folder, "index.lock"), JSON.stringify(this.#index));
    }

    public async getSetCards(setID: string): Promise<Card[]> {
        const index = await this.getIndex();

        const indexSet = index.sets.find((set) => set.satisfies.includes(setID)) ?? null;
        if (indexSet !== null) {
            const setCacheFileContents = await readTextFileIfExists(
                join(this.folder, indexSet.fileName),
            );

            if (setCacheFileContents !== null) {
                const setCache = JSON.parse(setCacheFileContents) as SetCache;
                return setCache.cards;
            }

            console.warn(`Cache seems corrupt for "${setID}".`);
            index.sets = index.sets.filter((set) => set !== indexSet);
        }

        const setSearch = await this.api.searchSets({
            query: `id:${setID} OR ptcgoCode:${setID}`,
        });

        if (setSearch.length === 0) {
            throw new Error(`Couldn't find a set for "${setID}".`);
        }

        if (setSearch.length > 1) {
            console.warn(`Found ${setSearch.length} sets for "${setID}", using the first.`);
        }

        const apiSet = setSearch[0];

        const cards = (await this.api.searchCards({ query: `set.id:${apiSet.id}` }))
            .map<Card>((apiCard) => ({
                id: apiCard.id,
                set: apiSet.id,
                number: parseInt(apiCard.number),
                name: apiCard.name,
                rarity: apiCard.rarity as Rarity,
                image: apiCard.images.small,
            }));

        const setCache: SetCache = {
            version: 1,
            setID: apiSet.id,
            cards,
        };

        try {
            await Deno.mkdir(this.folder, { recursive: true });
        } catch (error) {
            if (!(error instanceof Deno.errors.AlreadyExists)) {
                throw error;
            }
        }

        await Deno.writeTextFile(
            join(this.folder, `${setCache.setID}.json`),
            JSON.stringify(setCache),
        );

        await this.addSetToIndex({
            id: apiSet.id,
            satisfies: Array.from(new Set([apiSet.id, apiSet.ptcgoCode, setID])),
            fileName: `${setCache.setID}.json`,
        });

        return cards;
    }
}

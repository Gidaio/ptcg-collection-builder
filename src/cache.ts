import { join } from "@std/path/join";

import PokemonTCG from "./pokemon-tcg.ts";
import { readTextFileIfExists } from "./util.ts";
import * as v from "./validator.ts";

export interface Card {
    id: string;
    setID: string;
    setCode: string;
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
    booster: Slot[];
    cards: Card[];
}

type Slot = SlotChance[];
interface SlotChance {
    rarities: Card["rarity"][];
    chance: number;
    allowDupes?: boolean;
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

const boosterParser = v.array(v.array(v.type({
    rarities: v.array(v.enumeration(
        "Common",
        "Uncommon",
        "Rare",
        "Double Rare",
        "Ultra Rare",
        "Illustration Rare",
        "Special Illustration Rare",
        "Hyper Rare",
    )),
    chance: v.number,
    allowDupes: v.optional(v.boolean),
})));

export default class Cache {
    #index: Index | null = null;
    private sets: Record<string, SetCache> = {};

    public constructor(private readonly folder: string, private readonly api: PokemonTCG) {}

    private async getIndex(): Promise<Index> {
        if (this.#index !== null) {
            return this.#index;
        }

        const indexString = await readTextFileIfExists(join(this.folder, "index.lock"));
        if (indexString === null) {
            this.#index = { version: 2, sets: [] };
        } else {
            this.#index = JSON.parse(indexString) as Index;
            if (this.#index.version < 2) {
                console.log("Cache is old.");
                Deno.remove(this.folder, { recursive: true });
                this.#index = { version: 2, sets: [] };
            }
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

    private async fetchSet(setID: string): Promise<void> {
        const index = await this.getIndex();

        const indexSet = index.sets.find((set) => set.satisfies.includes(setID)) ?? null;
        if (indexSet !== null) {
            const setCacheFileContents = await readTextFileIfExists(
                join(this.folder, indexSet.fileName),
            );

            if (setCacheFileContents !== null) {
                const setCache = JSON.parse(setCacheFileContents) as SetCache;
                this.sets[setID] = setCache;
                return;
            }

            console.warn(`Cache seems corrupt for "${setID}".`);
            index.sets = index.sets.filter((set) => set !== indexSet);
        }

        console.log(`Fetching set for ${setID}...`);
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
                setID: apiSet.id,
                setCode: apiSet.ptcgoCode,
                number: parseInt(apiCard.number),
                name: apiCard.name,
                rarity: apiCard.rarity as Rarity,
                image: apiCard.images.small,
            }));

        const booster = await fetchSetBooster(apiSet.id);

        const setCache: SetCache = {
            version: 1,
            setID: apiSet.id,
            booster,
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

        this.sets[setID] = setCache;
    }

    public async getSetCards(setID: string): Promise<Card[]> {
        if (!(setID in this.sets)) {
            await this.fetchSet(setID);
        }

        return this.sets[setID].cards;
    }

    public async getSetBooster(setID: string): Promise<Slot[]> {
        if (!(setID in this.sets)) {
            await this.fetchSet(setID);
        }

        return this.sets[setID].booster;
    }
}

async function fetchSetBooster(setID: string): Promise<Slot[]> {
    console.log(`Fetching booster format for set ${setID}...`);
    const response = await fetch(`http://tananda.online/ptcg/${setID}.json`);

    if (!response.ok) {
        throw new Error(`Failed to fetch booster for set ${setID}. ${response.status}`);
    }

    return boosterParser(await response.json(), []);
}

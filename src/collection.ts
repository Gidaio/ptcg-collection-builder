import Cache, { Card } from "./cache.ts";
import { readTextFileIfExists } from "./util.ts";

export type CardWithQuantity = Card & { quantity: number };
type Quantities = Record<Card["id"], number>;
interface SavedQuantities {
    version: number;
    collection: Quantities;
}

type Slot = SlotChance[];
interface SlotChance {
    rarities: Card["rarity"][];
    chance: number;
    allowDupes?: boolean;
}

export default class Collection {
    private constructor(
        private readonly filePath: string,
        private quantities: Quantities,
    ) {}

    public static async load(filePath: string): Promise<Collection> {
        const quantitiesString = await readTextFileIfExists(filePath);
        if (quantitiesString === null) {
            return new Collection(filePath, {});
        }

        const savedQuantities = JSON.parse(quantitiesString) as SavedQuantities;
        if (savedQuantities.version > 1) {
            console.warn("Woah, I'm not equipped to handle more than version 1. I'll try my best.");
        }

        return new Collection(filePath, savedQuantities.collection);
    }

    public async save(): Promise<void> {
        // Do a backup!
        try {
            await Deno.copyFile(this.filePath, `${this.filePath}.old`);
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) {
                throw error;
            }
        }

        await Deno.writeTextFile(
            this.filePath,
            JSON.stringify({ version: 1, collection: this.quantities }),
        );
    }

    public addBooster(
        cardsByRarity: Partial<Record<Card["rarity"], Card[]>>,
        slots: Slot[],
    ): void {
        const booster: Card[] = [];

        for (const slot of slots) {
            booster.push(chooseCardInSlot(slot, booster));
        }

        booster.forEach((card) => {
            if (!(card.id in this.quantities)) {
                this.quantities[card.id] = 1;
            } else {
                this.quantities[card.id] += 1;
            }
        });

        function chooseCardInSlot(slot: Slot, booster: Card[]): Card {
            let chance = Math.random();
            const slotChanceIndex = slot.findIndex((slotChance) => {
                if (chance < slotChance.chance) {
                    return true;
                } else {
                    chance -= slotChance.chance;
                    return false;
                }
            });

            const slotChance = slot[slotChanceIndex];
            const options = slotChance.rarities.flatMap((rarity) => cardsByRarity[rarity]!);

            while (true) {
                const card = randomElementFrom(options);
                if ((slotChance.allowDupes ?? false) || !booster.includes(card)) {
                    return card;
                }
            }
        }
    }

    public async hydrate(cache: Cache): Promise<CardWithQuantity[]> {
        // This is just to make sure the cache has all of the sets only once.
        await Promise.all(
            [...new Set(Object.keys(this.quantities).map((id) => id.split("-")[0]))].map((setID) =>
                cache.getSetCards(setID)
            ),
        );

        return (await Promise.all(
            Object.entries(this.quantities).map<Promise<CardWithQuantity>>(
                async ([id, quantity]) => {
                    const setCards = await cache.getSetCards(id.split("-")[0]);
                    return { ...setCards.find((card) => card.id === id)!, quantity };
                },
            ),
        )).sort(byCollectorNumber);
    }
}

export function byCollectorNumber(a: CardWithQuantity, b: CardWithQuantity): number {
    if (a.setID < b.setID) {
        return -1;
    } else if (a.setID > b.setID) {
        return 1;
    } else {
        return a.number - b.number;
    }
}

function randomElementFrom<T>(arr: T[]): T {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

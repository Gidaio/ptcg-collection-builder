import Cache, { Card } from "./cache.ts";
import { readTextFileIfExists } from "./util.ts";

export type CardWithQuantity = Card & { quantity: number };
type Quantities = Record<Card["id"], number>;
interface SavedQuantities {
    version: number;
    collection: Quantities;
}

interface Rates {
    doubleRare: number;
    illustrationRare: number;
    ultraRare: number;
    specialIllustrationRare: number;
    hyperRare: number;
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

        await Deno.copyFile(filePath, `${filePath}.old`);
        const savedQuantities = JSON.parse(quantitiesString) as SavedQuantities;
        if (savedQuantities.version > 1) {
            console.warn("Woah, I'm not equipped to handle more than version 1. I'll try my best.");
        }

        return new Collection(filePath, savedQuantities.collection);
    }

    public async save(): Promise<void> {
        await Deno.writeTextFile(
            this.filePath,
            JSON.stringify({ version: 1, collection: this.quantities }),
        );
    }

    public addBooster(
        cardsByRarity: Partial<Record<Card["rarity"], Card[]>>,
        rates: Rates,
    ): void {
        const booster = [
            ...selectRandomNUniqueFrom(cardsByRarity["Common"] ?? [], 4),
            ...selectRandomNUniqueFrom(cardsByRarity["Uncommon"] ?? [], 3),
        ];

        let reverseHolos = 1;
        let secondSlotChance = Math.random();

        if ((secondSlotChance -= rates.illustrationRare) < 0) {
            booster.push(randomElementFrom(cardsByRarity["Illustration Rare"] ?? []));
        } else if ((secondSlotChance -= rates.specialIllustrationRare) < 0) {
            booster.push(randomElementFrom(cardsByRarity["Special Illustration Rare"] ?? []));
        } else if ((secondSlotChance -= rates.hyperRare) < 0) {
            booster.push(randomElementFrom(cardsByRarity["Hyper Rare"] ?? []));
        } else {
            reverseHolos += 1;
        }

        booster.push(
            ...selectRandomNUniqueFrom(
                (cardsByRarity["Common"] ?? []).concat(cardsByRarity["Uncommon"] ?? []).concat(
                    cardsByRarity["Rare"] ?? [],
                ),
                reverseHolos,
            ),
        );

        let rareSlotChance = Math.random();

        if ((rareSlotChance -= rates.doubleRare) < 0) {
            booster.push(randomElementFrom(cardsByRarity["Double Rare"] ?? []));
        } else if ((rareSlotChance -= rates.ultraRare) < 0) {
            booster.push(randomElementFrom(cardsByRarity["Ultra Rare"] ?? []));
        } else {
            booster.push(randomElementFrom(cardsByRarity["Rare"] ?? []));
        }

        booster.forEach((card) => {
            if (!(card.id in this.quantities)) {
                this.quantities[card.id] = 1;
            } else {
                this.quantities[card.id] += 1;
            }
        });
    }

    public async hydrate(cache: Cache): Promise<CardWithQuantity[]> {
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
    if (a.set < b.set) {
        return -1;
    } else if (a.set > b.set) {
        return 1;
    } else {
        return a.number - b.number;
    }
}

function selectRandomNUniqueFrom<T>(arr: T[], n: number): T[] {
    if (arr.length <= n) {
        return arr;
    }

    const out: T[] = [];
    while (out.length < n) {
        const selected = randomElementFrom(arr);
        if (!out.includes(selected)) {
            out.push(selected);
        }
    }

    return out;
}

function randomElementFrom<T>(arr: T[]): T {
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
}

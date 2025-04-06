import { Card } from "./set-cache.ts";

export type Collection = Record<number, number>;

interface Rates {
    doubleRare: number;
    illustrationRare: number;
    ultraRare: number;
    specialIllustrationRare: number;
    hyperRare: number;
}

export function addBoosterToCollection(
    cardsByRarity: Partial<Record<Card["rarity"], Card[]>>,
    collection: Collection,
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
        if (!(card.number in collection)) {
            collection[card.number] = 1;
        } else {
            collection[card.number] += 1;
        }
    });
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

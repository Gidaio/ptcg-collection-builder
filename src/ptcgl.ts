import { CardWithQuantity } from "./collection.ts";

export function renderCollection(cards: CardWithQuantity[]): string {
    return cards.map(renderCard).join("\n");
}

function renderCard(card: CardWithQuantity): string {
    return `${card.quantity} ${card.name} ${card.setCode} ${card.number}`;
}

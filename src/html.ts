import { CardWithQuantity } from "./main.ts";

const html = `<!DOCTYPE html>
<html>

<head>
    <style>
        .grid {
            display: flex;
            flex-flow: wrap;
            justify-content: center;
        }

        .card {
            position: relative;
            margin: 4px;
        }

        .card-image {
            max-width: 100%;
        }

        .quantity {
            margin: 0;
            width: 30%;
            height: 15%;

            display: flex;
            justify-content: center;
            align-items: center;

            position: absolute;
            bottom: 0px;
            right: 0px;

            background-color: rgba(255, 255, 255, 0.3);

            font-size: 2em;
        }
    </style>
</head>

<body>
    <div class="grid">
<!-- CARDS GO HERE -->
    </div>
</body>

</html>`;

export function renderCollection(cards: CardWithQuantity[]): string {
    const cardHTMLs = cards.map(renderCard);
    return html.replace("<!-- CARDS GO HERE -->", cardHTMLs.join("\n"));
}

function renderCard(card: CardWithQuantity): string {
    return `        <div class="card">
            <img class="card-image" src="${card.image}" />
            <p class="quantity">${card.quantity}</p>
        </div>`;
}

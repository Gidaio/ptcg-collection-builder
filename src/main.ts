import Cache from "./cache.ts";
import Collection from "./collection.ts";
import { renderCollection as renderCollectionHTML } from "./html.ts";
import PokemonTCG from "./pokemon-tcg.ts";
import { renderCollection } from "./ptcgl.ts";
import { partitionOn, readTextFileIfExists } from "./util.ts";

interface AddInput {
    set: string;
    quantity: number;
    collection: string;
}

interface RenderInput {
    format: "html" | "text";
    collection: string;
}

const DEFAULT_COLLECTION = "collection";

const command = Deno.args[0];

if (!command) {
    console.error("No command given.\n");
    helpCommand();
}

switch (command) {
    case "help":
        helpCommand();
        break;

    case "add":
        await addCommand(parseAddInput(Deno.args.slice(1)));
        break;

    case "render":
        await renderCommand(parseRenderInput(Deno.args.slice(1)));
        break;

    default:
        console.log(`Unrecognized command "${command}".`);
        helpCommand();
        break;
}

function parseAddInput(args: string[]): AddInput {
    const positionalArguments = [];
    const keyedArguments: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 1) {
        if (args[i].startsWith("--")) {
            keyedArguments[args[i].slice(2)] = args[++i];
        } else {
            positionalArguments.push(args[i]);
        }
    }

    const out: Partial<AddInput> = {};

    if (positionalArguments.length < 1) {
        console.error("Missing set.");
        Deno.exit(1);
    }

    out.set = positionalArguments[0];

    if (positionalArguments.length < 2) {
        console.error("Missing quantity.");
        Deno.exit(1);
    }

    const quantity = Number(positionalArguments[1]);

    if (isNaN(quantity) || !Number.isInteger(quantity)) {
        console.error("Quantity must be an integer.");
        Deno.exit(1);
    }

    out.quantity = quantity;

    if (positionalArguments.length > 2) {
        console.error("Too many positional arguments.");
        Deno.exit(1);
    }

    out.collection = DEFAULT_COLLECTION;

    for (const [key, value] of Object.entries(keyedArguments)) {
        if (key === "collection") {
            out.collection = value;
        } else {
            console.error(`Unrecognized argument "${key}".`);
            Deno.exit(1);
        }
    }

    return out as AddInput;
}

function parseRenderInput(args: string[]): RenderInput {
    const positionalArguments = [];
    const keyedArguments: Record<string, string> = {};
    for (let i = 0; i < args.length; i += 1) {
        if (args[i].startsWith("--")) {
            keyedArguments[args[i].slice(2)] = args[++i];
        } else {
            positionalArguments.push(args[i]);
        }
    }

    const out: Partial<RenderInput> = {};

    if (positionalArguments.length < 1) {
        console.error("Missing format.");
        Deno.exit(1);
    }

    const format = positionalArguments[0];

    if (!["html", "text"].includes(format)) {
        console.error(`Unsupported format "${format}".`);
        Deno.exit(1);
    }

    out.format = format as "html" | "text";

    if (positionalArguments.length > 1) {
        console.error("Too many positional arguments.");
        Deno.exit(1);
    }

    out.collection = DEFAULT_COLLECTION;

    for (const [key, value] of Object.entries(keyedArguments)) {
        if (key === "collection") {
            out.collection = value;
        } else {
            console.error(`Unrecognized argument "${key}".`);
            Deno.exit(1);
        }
    }

    return out as RenderInput;
}

async function addCommand(input: AddInput): Promise<void> {
    const cache = new Cache("cache", new PokemonTCG(await readTextFileIfExists("apikey.txt")));
    const cards = await cache.getSetCards(input.set);
    const cardsByRarity = partitionOn(cards, "rarity");

    const collectionFileName = input.collection.endsWith(".json")
        ? input.collection
        : `${input.collection}.json`;
    const collection = await Collection.load(collectionFileName);

    for (let i = 0; i < input.quantity; i += 1) {
        collection.addBooster(cardsByRarity, {
            doubleRare: 0.1376,
            ultraRare: 0.0657,
            illustrationRare: 0.0767,
            specialIllustrationRare: 0.0315,
            hyperRare: 0.0185,
        });
    }

    await collection.save();
}

async function renderCommand(input: RenderInput): Promise<void> {
    const cache = new Cache("cache", new PokemonTCG(await readTextFileIfExists("apikey.txt")));

    const collectionFileName = input.collection.endsWith(".json")
        ? input.collection
        : `${input.collection}.json`;
    const collection = await Collection.load(collectionFileName);

    const collectionCards = await collection.hydrate(cache);

    let rendered;
    let extension;
    switch (input.format) {
        case "html":
            rendered = renderCollectionHTML(collectionCards);
            extension = "html";
            break;

        case "text":
            rendered = renderCollection(collectionCards);
            extension = "txt";
            break;
    }

    await Deno.writeTextFile(`${input.collection}.${extension}`, rendered);
}

function helpCommand() {
    console.log("Usage: packsim <command> ...");
    console.log("Supported commands:");
    console.log("  help\n    Display this message.");
    console.log("\n  add [--collection <collection name>] <set id> <quantity>");
    console.log(
        "    Opens the specified number of packs from the specified set and adds them to the collection.",
    );
    console.log("\n  render [--collection <collection name>] <format>");
    console.log("    Renders the specified collection out as a file with the same name.");
    console.log("    Currently supported formats:");
    console.log("      - HTML");
    console.log("      - Text");
    Deno.exit(0);
}

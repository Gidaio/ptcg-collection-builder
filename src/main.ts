import PokemonTCG from "./pokemon-tcg.ts";

const apiKey = await readTextFileIfExists("./apikey.txt");
const pokemonTCG = new PokemonTCG(apiKey);
const sviSet = await pokemonTCG.getSet("sv1");

console.log(JSON.stringify(sviSet, null, 2));

async function readTextFileIfExists(filePath: string): Promise<string | null> {
    try {
        return await Deno.readTextFile(filePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return null;
        } else {
            throw error;
        }
    }
}

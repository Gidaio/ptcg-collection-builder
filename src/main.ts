import PokemonTCG from "./pokemon-tcg.ts";

const apiKey = await readTextFileIfExists("./apikey.txt");
const pokemonTCG = new PokemonTCG(apiKey);
const sets = await pokemonTCG.searchSets({ query: "ptcgoCode:SVI" });

console.log(JSON.stringify(sets, null, 2));

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

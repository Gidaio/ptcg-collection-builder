export async function readTextFileIfExists(filePath: string): Promise<string | null> {
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

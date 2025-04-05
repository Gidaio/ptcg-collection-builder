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

export function partitionOn<K extends keyof T, T extends { [key in K]: string }>(
    arr: T[],
    key: K,
): Partial<Record<T[K], T[]>> {
    const out: Partial<Record<T[K], T[]>> = {};

    for (const obj of arr) {
        if (!(obj[key] in out)) {
            out[obj[key]] = [obj];
        } else {
            out[obj[key]]!.push(obj);
        }
    }

    return out;
}

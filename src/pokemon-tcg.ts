interface ErrorResponse {
    error: {
        code: number;
        message: string;
    };
}

interface Set {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: SetLegalities;
    ptcgoCode: string;
    releaseDate: string;
    updatedAt: string;
    images: SetImages;
}

interface SetImages {
    symbol?: string;
    logo?: string;
}

interface SetLegalities {
    standard?: "Legal";
    expanded?: "Legal";
    unlimited?: "Legal";
}

type SuccessResponse<T> = { data: T };

class RateLimitError extends Error {
    public override name = "RateLimitError";

    public constructor() {
        super("The rate limit has been exceeded.");
    }
}

class PokemonTCGError extends Error {
    public override name = "PokemonTCGError";

    public constructor(message: string) {
        super(message);
    }
}

export default class PokemonTCG {
    public constructor(private readonly apiKey: string | null = null) {}

    public async getSet(setID: string): Promise<Set | null> {
        const headers: Record<string, string> = {
            accept: "application/json",
        };

        if (this.apiKey !== null) {
            headers["X-Api-Key"] = this.apiKey;
        }

        const response = await fetch(`https://api.pokemontcg.io/v2/sets/${setID}`, { headers });

        if (response.status === 429) {
            throw new RateLimitError();
        }

        if (response.status >= 500) {
            const responseBody = await response.json() as ErrorResponse;
            throw new PokemonTCGError(responseBody.error?.message ?? "Unknown error.");
        }

        if (response.status === 404) {
            return null;
        }

        const responseBody = await response.json() as SuccessResponse<Set>;

        return responseBody.data;
    }
}

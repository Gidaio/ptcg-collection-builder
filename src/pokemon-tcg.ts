interface ErrorResponse {
    error: {
        code: number;
        message: string;
    };
}

interface SearchSetInput {
    query: string;
    page?: number;
    pageSize?: number;
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
type SuccessListResponse<T> = {
    data: T[];
    page: number;
    pageSize: number;
    count: number;
    totalCount: number;
};

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
        const headers = new Headers({
            accept: "application/json",
        });

        if (this.apiKey !== null) {
            headers.set("X-Api-Key", this.apiKey);
        }

        const response = await this.commonFetch(
            `https://api.pokemontcg.io/v2/sets/${setID}`,
            { headers },
        );

        if (response.status === 404) {
            return null;
        }

        const responseBody = await response.json() as SuccessResponse<Set>;

        return responseBody.data;
    }

    public async searchSets({ query, page = 1, pageSize = 250 }: SearchSetInput): Promise<Set[]> {
        const searchParams = new URLSearchParams();
        searchParams.set("q", query);
        searchParams.set("page", page.toString(10));
        searchParams.set("pageSize", pageSize.toString(10));

        const headers = new Headers({
            accept: "application/json",
        });

        if (this.apiKey !== null) {
            headers.set("X-Api-Key", this.apiKey);
        }

        const response = await this.commonFetch(
            `https://api.pokemontcg.io/v2/sets?${searchParams.toString()}`,
            { headers },
        );

        if (response.status === 404) {
            return [];
        }

        const responseBody = await response.json() as SuccessListResponse<Set>;

        return responseBody.data;
    }

    private async commonFetch(
        ...args: Parameters<typeof fetch>
    ): ReturnType<typeof fetch> {
        const response = await fetch(...args);

        if (response.status === 429) {
            throw new RateLimitError();
        }

        if (response.status >= 400 && response.status !== 404) {
            const responseBody = await response.json() as ErrorResponse;
            throw new PokemonTCGError(responseBody.error?.message ?? "Unknown error.");
        }

        return response;
    }
}

interface Card {
    id: string;
    name: string;
    set: Set;
    number: number;
    rarity: string;
    images: CardImages;
}

interface CardImages {
    small: string;
    large: string;
}

interface ErrorResponse {
    error: {
        code: number;
        message: string;
    };
}

interface SearchInput {
    query: string;
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

    public getSet(setID: string): Promise<Set | null> {
        return this.getResource("sets", setID);
    }

    public getCard(cardID: string): Promise<Card | null> {
        return this.getResource("cards", cardID);
    }

    public searchSets(searchInput: SearchInput): Promise<Set[]> {
        return this.searchResource("sets", searchInput);
    }

    public searchCards(searchInput: SearchInput): Promise<Card[]> {
        return this.searchResource("cards", searchInput);
    }

    private async getResource(resourceName: "sets", setID: string): Promise<Set | null>;
    private async getResource(resourceName: "cards", cardID: string): Promise<Card | null>;
    private async getResource<R>(
        resourceName: "sets" | "cards",
        resourceID: string,
    ): Promise<R | null> {
        const headers = new Headers({
            accept: "application/json",
        });

        if (this.apiKey !== null) {
            headers.set("X-Api-Key", this.apiKey);
        }

        const response = await this.commonFetch(
            `https://api.pokemontcg.io/v2/${resourceName}/${resourceID}`,
            { headers },
        );

        if (response.status === 404) {
            return null;
        }

        const responseBody = await response.json() as SuccessResponse<R>;

        return responseBody.data;
    }

    private async searchResource(resourceName: "sets", searchInput: SearchInput): Promise<Set[]>;
    private async searchResource(resourceName: "cards", searchInput: SearchInput): Promise<Card[]>;
    private async searchResource<R>(
        resourceName: "sets" | "cards",
        { query, pageSize = 250 }: SearchInput,
    ): Promise<R[]> {
        const headers = new Headers({
            accept: "application/json",
        });

        if (this.apiKey !== null) {
            headers.set("X-Api-Key", this.apiKey);
        }

        const resources: R[] = [];
        let currentPage = 1;
        let total = 0;

        do {
            const searchParams = new URLSearchParams();
            searchParams.set("q", query);
            searchParams.set("page", currentPage.toString(10));
            searchParams.set("pageSize", pageSize.toString(10));

            const response = await this.commonFetch(
                `https://api.pokemontcg.io/v2/${resourceName}?${searchParams.toString()}`,
                { headers },
            );

            if (response.status === 404) {
                break;
            }

            const responseBody = await response.json() as SuccessListResponse<R>;

            resources.push(...responseBody.data);
            total = responseBody.totalCount;
        } while (currentPage++ * pageSize < total);

        return resources;
    }

    private async commonFetch(
        ...args: Parameters<typeof fetch>
    ): ReturnType<typeof fetch> {
        console.log(JSON.stringify(args));

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

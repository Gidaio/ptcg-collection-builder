// deno-lint-ignore no-explicit-any
type Props = Record<string, TypeParse<any>>;
type PropType<P extends Props> = { [K in keyof P]: TypeOf<P[K]> };
export type TypeOf<T> = T extends TypeParse<infer Output> ? Output : never;
export type TypeParse<Output> = (input: unknown, path?: string[]) => Output;

export const boolean: TypeParse<boolean> = (input, path = []) => {
    if (typeof input === "boolean") {
        return input;
    } else {
        throw new Error(
            `${
                path.length > 0
                    ? `${path.join(".")}: `
                    : ""
            }Expected a boolean, got ${typeof input}.`,
        );
    }
};

export const number: TypeParse<number> = (input, path = []) => {
    if (typeof input === "number") {
        return input;
    } else {
        throw new Error(
            `${
                path.length > 0
                    ? `${path.join(".")}: `
                    : ""
            }Expected a number, got ${typeof input}.`,
        );
    }
};

export const integerStr: TypeParse<number> = (input, path = []) => {
    if (typeof input !== "string") {
        throw new Error(
            `${
                path.length > 0
                    ? `${path.join(".")}: `
                    : ""
            }Expected an integer string, got ${typeof input}.`,
        );
    }

    const parsed = Number(input);
    if (isNaN(parsed)) {
        throw new Error(
            `${
                path.length > 0
                    ? `${path.join(".")}: `
                    : ""
            }Expected an integer string, got a string that didn't contain a number.`,
        );
    }

    if (!Number.isInteger(parsed)) {
        throw new Error(
            `${
                path.length > 0
                    ? `${path.join(".")}: `
                    : ""
            }Expected an integer string, got a string that didn't contain an integer.`,
        );
    }

    return parsed;
};

export const enumeration: <T extends string>(...values: T[]) => TypeParse<T> = <T extends string>(
    ...values: T[]
) => {
    return (input, path = []) => {
        if (typeof input !== "string") {
            throw new Error(`${path.length > 0 ? `${path.join(".")}: ` : ""}Expected a string.`);
        }

        if (!values.includes(input as T)) {
            throw new Error(
                `${path.length > 0 ? `${path.join(".")}: ` : ""}Expected one of ${
                    values.map((val) => `"${val}"`).join(", ")
                }.`,
            );
        }

        return input as T;
    };
};

export const string: TypeParse<string> = (input, path = []) => {
    if (typeof input === "string") {
        return input;
    } else {
        throw new Error(`${path.length > 0 ? `${path.join(".")}: ` : ""}Expected a string.`);
    }
};

export const optional: <T>(type: TypeParse<T>) => TypeParse<T | undefined> = (type) => {
    return (input, path = []) => {
        if (typeof input === "undefined") {
            return input;
        }

        return type(input, path);
    };
};

export const array: <T>(innerType: TypeParse<T>) => TypeParse<T[]> = (innerType) => {
    return (input, path = []) => {
        if (!Array.isArray(input)) {
            throw new Error(`${path.length > 0 ? `${path.join(".")}: ` : ""}Expected an array.`);
        }

        return input.map((value, index) => innerType(value, path.concat(index.toString(10))));
    };
};

export const type: <P extends Props>(props: P) => TypeParse<PropType<P>> = <P extends Props>(
    props: P,
) => {
    return (input: unknown, path: string[] = []) => {
        if (typeof input !== "object" || input === null) {
            throw new Error(`${path.length > 0 ? `${path.join(".")}: ` : ""}Expected an object.`);
        }

        for (const key of Object.keys(input)) {
            if (!(key in props)) {
                throw new Error(
                    `${path.length > 0 ? `${path.join(".")}: ` : ""}Unexpected key "${key}".`,
                );
            }
        }

        // deno-lint-ignore no-explicit-any
        const out: any = {};
        for (const key of Object.keys(props)) {
            out[key] = props[key]((input as Record<string, unknown>)[key], path.concat(key));
        }

        return out;
    };
};

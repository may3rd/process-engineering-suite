export type SortDirection = "asc" | "desc";

export interface SortConfig<T extends string = string> {
    key: T;
    direction: SortDirection;
}

export const toggleSortConfig = <T extends string>(
    current: SortConfig<T> | null,
    key: T
): SortConfig<T> => {
    if (current?.key === key) {
        return {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
        };
    }

    return {
        key,
        direction: "asc",
    };
};

export const sortByGetter = <T, K extends string>(
    data: T[],
    config: SortConfig<K> | null,
    getter: (item: T, key: K) => string | number
): T[] => {
    if (!config) return data;

    const sorted = [...data];
    sorted.sort((a, b) => {
        const valueA = getter(a, config.key);
        const valueB = getter(b, config.key);

        const comparison =
            typeof valueA === "number" && typeof valueB === "number"
                ? valueA - valueB
                : valueA
                      .toString()
                      .localeCompare(valueB.toString(), undefined, {
                          numeric: true,
                          sensitivity: "base",
                      });

        return config.direction === "asc" ? comparison : -comparison;
    });

    return sorted;
};

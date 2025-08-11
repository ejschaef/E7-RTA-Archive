import { BattleType } from "../references.ts";

export type FilterFn = {
    call(battle: BattleType): boolean,
    asString(prefix: string): string,
};

export type FilterContainer = {
	localFilters: FilterFn[];
	globalFilters: FilterFn[];
}

export type FilterRefs = {
    SeasonDetails: any[];
    HM: any;
    ARTIFACT_LOWERCASE_STRINGS_MAP: { [x: string]: string };
}

type FieldTSType = {
    str: string;
    extractData: Function;
    asString: () => string;
}

type DeclaredData = {
    data: any;
    asString: () => string;
    str?: string;
}

export type BaseFilterElement = FieldTSType | DeclaredData;
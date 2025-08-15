import { FilterReferences } from "./filter-parse-references";
import HeroManager from "../hero-manager";
import { LEAGUE_TO_CLEAN_STR, WORLD_CODE_LOWERCASE_TO_CLEAN_STR } from "../references";
import { EQUIPMENT_LOWERCASE_STRINGS_MAP } from "./filter-parse-references";
import { RegExps } from "../regex";

export abstract class StringLiteralParser {
    abstract parse(str: string, REFS?: FilterReferences): string | null;
    abstract parserType: string;
}

class HeroParser extends StringLiteralParser {
    parse(str: string, REFS: FilterReferences): string | null {
        return HeroManager.getHeroByName(str, REFS.HM)?.name ?? null;
    }
    parserType = "Hero";
}

class LeagueParser extends StringLiteralParser {
    parse(str: string): string | null {
        console.log(`Parsing str: ${str} using map:`, LEAGUE_TO_CLEAN_STR);
        return LEAGUE_TO_CLEAN_STR[str];
    }
    parserType = "League";
}

class ServerParser extends StringLiteralParser {
    parse(str: string): string | null {
        return WORLD_CODE_LOWERCASE_TO_CLEAN_STR[str];
    }
    parserType = "Server";
}

class EquipmentParser extends StringLiteralParser {
    parse(str: string): string | null {
        return EQUIPMENT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Equipment";
}

class ArtifactParser extends StringLiteralParser {
    parse(str: string, REFS: FilterReferences): string | null {
        return REFS.ARTIFACT_LOWERCASE_STRINGS_MAP[str.toLowerCase()];
    }
    parserType = "Artifact";
}

class SeasonCodeParser extends StringLiteralParser {
    parse(str: string, REFS: FilterReferences): string | null {
        let seasonNum: string;
        if ( str === "current-season" ) {
            return REFS.SEASON_DETAILS[0].Code;
        }
        else if (RegExps.SEASON_LITERAL_RE.test(str)) {
            seasonNum = str.split("-")[-1];
        } 
        else if (RegExps.SEASON_CODE_LITERAL_RE.test(str)) {
            seasonNum = str.split("_")[-1]
        } 
        else {
            return null
        }
        return REFS.SEASON_DETAILS.find((season: { Code: string; }) => season.Code.split("_")[-1] === seasonNum)?.Code;
    }
    parserType = "Season Code";
}

export function parseStringLiteral(str: string, REFS: FilterReferences, parsers: StringLiteralParser[]): string | null {
    for (const parser of parsers) {
        const parsed = parser.parse(str, REFS);
        console.log(`Parsed string literal: ${str} with ${parser.parserType} as ${parsed}`);
        if (parsed) 
            return parsed;
    }
    return null;
}

export const STRING_LITERAL_PARSERS = {
    Hero: new HeroParser(),
    League: new LeagueParser(),
    Server: new ServerParser(),
    Equipment: new EquipmentParser(),
    Artifact: new ArtifactParser(),
    Season: new SeasonCodeParser(),
} as const;


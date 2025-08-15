import { LanguageCode, LANGUAGES } from "../e7/references";

export type LangContent = string | string[] | readonly string[];

export type LangBlock = {
    [LANGUAGES.CODES.EN]: LangContent,
    [LANGUAGES.CODES.DE]?: LangContent,
    [LANGUAGES.CODES.KO]?: LangContent,
    [LANGUAGES.CODES.PT]?: LangContent,
    [LANGUAGES.CODES.TH]?: LangContent,
    [LANGUAGES.CODES.ZH_TW]?: LangContent,
    [LANGUAGES.CODES.JA]?: LangContent,
    [LANGUAGES.CODES.FR]?: LangContent,
    [LANGUAGES.CODES.ZH_CN]?: LangContent,
    [LANGUAGES.CODES.ES]?: LangContent,
};

export function getText(lang: LanguageCode, block: LangBlock): LangContent {
    return block[lang] ?? block[LANGUAGES.CODES.EN];
}

export const TextRetrieveFns = {
    [LANGUAGES.CODES.EN]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.EN, block) as T; },
    [LANGUAGES.CODES.DE]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.DE, block) as T; },
    [LANGUAGES.CODES.KO]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.KO, block) as T; },
    [LANGUAGES.CODES.PT]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.PT, block) as T; },
    [LANGUAGES.CODES.TH]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.TH, block) as T; },
    [LANGUAGES.CODES.ZH_TW]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.ZH_TW, block) as T; },
    [LANGUAGES.CODES.JA]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.JA, block) as T; },
    [LANGUAGES.CODES.FR]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.FR, block) as T; },
    [LANGUAGES.CODES.ZH_CN]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.ZH_CN, block) as T; },
    [LANGUAGES.CODES.ES]: 
        function <T>(block: LangBlock): T { return getText(LANGUAGES.CODES.ES, block) as T; },
}

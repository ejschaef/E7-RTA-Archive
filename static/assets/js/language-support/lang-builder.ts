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

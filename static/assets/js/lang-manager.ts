import { LANGUAGES, LanguageCode } from "./e7/references";
import { CM } from "./content-manager";

const LangManager = {

    changeLang: async function(lang: LanguageCode) {
        await CM.ClientCache.setLang(lang);
        await CM.HeroManager.fetchAndCacheHeroManager(lang);
        window.location.reload();
    },

    getLang: async function(): Promise<LanguageCode> {
        return await CM.ClientCache.getLang();
    },
}

export { LangManager };
import { LANGUAGES, LanguageCode } from "./e7/references";
import { ContentManager } from "./content-manager";

const LangManager = {

    changeLang: async function (lang: LanguageCode) {
        await ContentManager.ClientCache.setLang(lang);
        await ContentManager.HeroManager.fetchAndCacheHeroManager(lang);
        window.location.reload();
    },

    getLang: async function (): Promise<LanguageCode> {
        return await ContentManager.ClientCache.getLang();
    },
}

export { LangManager };
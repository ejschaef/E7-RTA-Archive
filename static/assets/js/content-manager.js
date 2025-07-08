import HeroManager from "./e7/hero-manager.js";
import BattleManager from "./e7/battle-manager.js";
import SeasonManager from "./e7/season-manager.js";
import ClientCache from "./cache-manager.js";
import FilterSyntaxParser from "./e7/filter-syntax.js";

let ContentManager = {
    HeroManager: HeroManager,
    BattleManager: BattleManager,
    SeasonManager: SeasonManager, 
    ClientCache: ClientCache,

    getFilters: async function(HM) {
        const filterStr = await ClientCache.getFilterStr();
        if (!filterStr) {
            return FilterSyntaxParser.getEmptyFilters();
        }
        const seasonDetails = await SeasonManager.getSeasonDetails();
        const parser = await FilterSyntaxParser.createAndParse(filterStr, HM, seasonDetails);
        return parser.filters;
    },
};

export default ContentManager;

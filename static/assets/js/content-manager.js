import HeroManager from "./e7/hero-manager.js";
import BattleManager from "./e7/battle-manager.js";
import SeasonManager from "./e7/season-manager.js";
import ClientCache from "./cache-manager.js";
import FilterSyntaxParser from "./e7/filter-syntax-parser.js";
import UserManager from "./e7/user-manager.js";
import ArtifactManager from "./e7/artifact-manager.js";

let ContentManager = {
    HeroManager: HeroManager,
    BattleManager: BattleManager,
    SeasonManager: SeasonManager, 
    UserManager: UserManager,
    ClientCache: ClientCache,
    ArtifactManager: ArtifactManager,

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

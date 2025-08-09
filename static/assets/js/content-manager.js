import HeroManager from "./e7/hero-manager.js";
import BattleManager from "./e7/battle-manager.js";
import SeasonManager from "./e7/season-manager.js";
import ClientCache from "./cache-manager.js";
import UserManager from "./e7/user-manager.js";
import ArtifactManager from "./e7/artifact-manager.js";

let CM = {
	HeroManager: HeroManager,
	BattleManager: BattleManager,
	SeasonManager: SeasonManager,
	UserManager: UserManager,
	ClientCache: ClientCache,
	ArtifactManager: ArtifactManager,
};

export { CM };

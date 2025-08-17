import HeroManager from "./e7/hero-manager.ts";
import BattleManager from "./e7/battle-manager.js";
import SeasonManager from "./e7/season-manager.js";
import ClientCache from "./cache-manager.ts";
import UserManager from "./e7/user-manager.ts";
import ArtifactManager from "./e7/artifact-manager.js";
import { LangManager } from "./lang-manager.ts";

let CM = {
	HeroManager: HeroManager,
	BattleManager: BattleManager,
	SeasonManager: SeasonManager,
	UserManager: UserManager,
	ClientCache: ClientCache,
	ArtifactManager: ArtifactManager,
	LangManager: LangManager,
};

export { CM };

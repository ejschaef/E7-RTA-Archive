import { ContentManager } from "../content-manager.ts";
import { BattleType } from "../e7/references";

export const heroDicts = await ContentManager.HeroManager.getHeroDicts();

const BATTLES_OBJ = await ContentManager.BattleManager.getBattles() || {};

export const BATTLES = Object.values(BATTLES_OBJ) as BattleType[];
import HeroManager from './hero-manager.js';
import BattleManager from './battle-manager.js';

async function test() {
    const HM = await HeroManager.getHeroManager();

    const battles = await BattleManager.getBattles(HM);
    console.log(`Battles: ${JSON.stringify(battles)}`);

    const filteredBattles = await BattleManager.getNumericalFilteredBattles([], HM);
    console.log(`Filtered Battles: ${JSON.stringify(filteredBattles)}`);

    const stats = await BattleManager.getPrebanStats(filteredBattles, HM);
    console.log(`Preban Stats: ${JSON.stringify(stats)}`);  

    const firstpickStats = await BattleManager.getFirstPickStats(filteredBattles, HM);
    console.log(`Firstpick Stats: ${JSON.stringify(firstpickStats)}`);  

    const generalStats = await BattleManager.getGeneralStats(filteredBattles, HM);
    console.log(`General Stats: ${JSON.stringify(generalStats)}`);

    const heroStats = await BattleManager.getHeroStats(filteredBattles, HM);
    console.log(`Player Hero Stats: ${JSON.stringify(heroStats.playerHeroStats)}`);
};

export {test}
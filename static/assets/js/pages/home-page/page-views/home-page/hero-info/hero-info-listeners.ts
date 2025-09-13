import { ContentManager } from "../../../../../content-manager";
import { BattleType, COLUMNS_MAP } from "../../../../../e7/references";
import StatsBuilder from "../../../../../e7/stats-builder";
import { Safe } from "../../../../../html-safe";
import { Tables } from "../../../../../populate-content";
import { TextController, TextPacket } from "../../../../orchestration/text-controller";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references";
import PageUtils from "../../../../page-utilities/page-utils";

const searchInput = DOC_ELEMENTS.HOME_PAGE.SEARCH_INPUT as HTMLInputElement;
const dropdown = DOC_ELEMENTS.HOME_PAGE.HERO_SEARCH_OPTIONS;
const contentBody = DOC_ELEMENTS.HOME_PAGE.HERO_INFO_BODY;
const defaultContent = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_DEFAULT_CONTENT);


function filterPicks(
    {battles, heroName, isP1}: {battles: BattleType[], heroName: string, isP1: boolean}
): BattleType[] {
    const pickCol = isP1 ? COLUMNS_MAP.P1_PICKS : COLUMNS_MAP.P2_PICKS;
    return battles.filter((b) => {
        return b[pickCol].includes(heroName);
    })
}


async function chooseHero(heroName: string) {
    searchInput.value = heroName;
    searchInput.textContent = heroName;

    dropdown.classList.remove('show');
    PageUtils.setVisibility(defaultContent, false);

    const battles = await ContentManager.ClientCache.getStats().then(stats => Object.values(stats ? stats.filteredBattlesObj : {})) as BattleType[];
    const subset = filterPicks({battles, heroName, isP1: true});

    const selectedHeroStats = StatsBuilder.queryStats(subset, battles.length, heroName);


    TextController.writeStrFromID(
        selectedHeroStats["Pick Rate"], 
        'pick-rate-value', [TextController.STYLES.E_BLUE]
    );
    TextController.writeStrFromID(
        selectedHeroStats["Win rate"], 
        'win-rate-value', [TextController.STYLES.E_BLUE]
    );
    TextController.writeStrFromID(
        selectedHeroStats["Postban Rate"], 
        'postban-rate-value', [TextController.STYLES.E_BLUE]
    );

    const heroDicts = await ContentManager.HeroManager.getHeroDicts();

    const heroStats = StatsBuilder.getHeroStats(subset, heroDicts);

    Tables.populateHeroStatsTable(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_PLAYER_TBL, heroStats.playerHeroStats);
    Tables.populateHeroStatsTable(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_OPPONENT_TBL, heroStats.enemyHeroStats);

    TextController.writeStrFromID(
        `${heroName}`, 
        'selected-hero-value', [TextController.STYLES.E_BLUE]
    );
    TextController.writeStrFromID(
        `${subset.length}`, 
        'battles-picked-value', [TextController.STYLES.E_BLUE]
    );


    const contentContainer = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_INFO_CONTENT);
    PageUtils.setVisibility(contentContainer, true);
}


function addHeroSelectListeners() {
    // show dropdown when search input is clicked
    searchInput.addEventListener('click', function(event) {
        event.stopPropagation();
        console.log("clicked");
        searchInput.value = "";
        searchInput.textContent = "";
        dropdown.classList.add('show');
    });

    // hide dropdown when clicked outside
    contentBody.addEventListener('click', function (event) {
        const target = event.target as Node;
        if (!searchInput.contains(target) && !dropdown.contains(target)) {
            dropdown.classList.remove('show');
        }
    });

    // filter options based on search term
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const options = document.querySelectorAll('.option-list .option') as NodeListOf<HTMLElement>;
        options.forEach((option) => {
            if (option.textContent.toLowerCase().includes(searchTerm)) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    });

    // select option when clicked
    document.querySelectorAll('.option-list .option').forEach(option => {
        option.addEventListener('click', async function() {
            await chooseHero(option.textContent);
        });
    });
}


function addHeroInfoListeners() {
    addHeroSelectListeners();
}

export { addHeroInfoListeners };


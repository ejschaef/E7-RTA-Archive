import { ContentManager } from "../../../../../content-manager";
import { Safe } from "../../../../../html-safe";
import type { DispatchFn, View } from "../../../../orchestration/page-orchestration-template";
import { HOME_PAGE_FNS } from "../../../../orchestration/page-state-manager";
import { TextController, TextPacket } from "../../../../orchestration/text-controller";
import DOC_ELEMENTS from "../../../../page-utilities/doc-element-references";
import { HOME_PAGE_STATES  } from "../../../../page-utilities/page-state-references";
import PageUtils from "../../../../page-utilities/page-utils";
import { heroInfoBuildTables } from "../../../home-page-build-tables";
import { addHeroInfoListeners } from "./hero-info-listeners";

async function populateOptionList() {
    const optionList = Safe.unwrapHtmlElt('hero-option-list');
    const heroes = await ContentManager.HeroManager.getHeroDicts();
    let options = new Set(
        heroes.heroes
            .filter(hero => hero.name !== heroes.Empty.name && hero.name !== heroes.Fodder.name)
            .map(hero => hero.name)
            .sort((a, b) => a.localeCompare(b))
    );
    options.forEach(heroName => {
        const option = document.createElement('div');
        option.classList.add('option');
        option.textContent = heroName;
        option.dataset.value = heroName;
        optionList.appendChild(option);
    });
}

async function setDefaultText() {
    const user = await ContentManager.UserManager.getUser();
    const stats = await ContentManager.ClientCache.getStats();
    const defaultText = Safe.unwrapHtmlElt('default-text');
    if (!user) {
        TextController.write(new TextPacket(
            "No data loaded: Query or Upload data on the 'Select Data' page to view hero information.", 
            defaultText, [TextController.STYLES.RED]));
    }
    else {
        TextController.write(new TextPacket(
            "Use the search and dropdown menu to select a hero and view statistics.", 
            defaultText, []));
    }
    const filtersAppliedElt = Safe.unwrapHtmlElt('filters-applied');
    const numBattlesElt = Safe.unwrapHtmlElt('num-battles');
    if (stats) {
        const numFilters = stats.numFilters;
        const numBattles = Object.values(stats.filteredBattlesObj).length;
        TextController.write(new TextPacket(
            `${numFilters}`, 
            filtersAppliedElt, []));
        TextController.write(new TextPacket(
            `${numBattles}`, 
            numBattlesElt, []));
    }
    else {
        TextController.write(new TextPacket(
            "n/a",
            filtersAppliedElt, []
        ));
        TextController.write(new TextPacket(
            "n/a",
            numBattlesElt, []
        ));
    }
}

function getPlayerTableHtml(id: string, title: string, descr: string) {
    return `
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header fixed-height-table-header kpi-header">
                <h5>${title}</h5>
                <br>
                <h6 style="font-size: 0.7em;">
                    ${descr}
                </h6>
            </div>
            <div class="card-body kpi-body">
                <table id="${id}" class="display compact cell-border" style="width:100%">
                </table>
            </div>
        </div>
    </div>
    `
}

function createTables(target: HTMLElement) {
    const tbl1HTML = getPlayerTableHtml("hero-player-tbl", 
        "Teammate Heroes",
        "Displays statistics for heroes computed based on when they appear on the player's team. " +
        "Success Rate indicates percentage of games in which the player won the game or the hero was post banned.");
    const tbl2HTML = getPlayerTableHtml("hero-opponent-tbl", 
        "Opponent Heroes",
        "Displays statistics for heroes computed based on when they appear on the enemy team. " +
        "Win rate, +/-, postban rate, and point gain are relative to the player while pick rate, Avg " +
        "CR, and first turn rate are relative to the opponent.");
    const container = document.createElement('div');
    container.innerHTML = tbl1HTML + tbl2HTML;
    target.appendChild(container);
    heroInfoBuildTables();
}


function makeRowDiv() {
    const row = document.createElement('div');
    row.classList.add("d-flex", "flex-row", "mb-2", "gap-3");
    return row;
}


function createKPICards(target: HTMLElement) {
    const row1 = makeRowDiv();
    const row2 = makeRowDiv();
    const rows = [row1, row2];

    row1.innerHTML = `
    <div class="col-md-3">
        <div class="card mb-0 p-2 d-flex justify-content-center flex-column align-items-center">
            <span class="f-16">Selected Hero</span>
            <span class="f-16" id="selected-hero-value">&nbsp;</span>
        </div>
    </div>
    `

    row2.innerHTML = `
    <div class="col-md-2">
        <div class="card p-2 d-flex justify-content-center flex-column align-items-center"">
            <span class="f-16">Battles Picked</span>
            <span class="f-16" id="battles-picked-value">&nbsp;</span>
        </div>
    </div>
    <div class="col-md-2">
        <div class="card p-2 d-flex justify-content-center flex-column align-items-center" id="pick-rate">
            <span class="f-16">Pick Rate</span>
            <span class="f-16" id="pick-rate-value">&nbsp;</span>
        </div>
    </div>
    <div class="col-md-2">
        <div class="card p-2 d-flex justify-content-center flex-column align-items-center" id="win-rate">
            <span class="f-16">Win Rate</span>
            <span class="f-16" id="win-rate-value">&nbsp;</span>
        </div>
    </div>
    <div class="col-md-2">
        <div class="card p-2 d-flex justify-content-center flex-column align-items-center" id="postban-rate">
            <span class="f-16">Postban Rate</span>
            <span class="f-16" id="postban-rate-value">&nbsp;</span>
        </div>
    </div>
    `
    rows.forEach((row) => target.appendChild(row));
}


async function resetPage() {
    const searchInput = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.SEARCH_INPUT) as HTMLInputElement;
    searchInput.value = '';
    searchInput.textContent = '';

    const contentContainer = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_INFO_CONTENT);
    PageUtils.setVisibility(contentContainer, false);
    await setDefaultText();
    const defaultContent = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_DEFAULT_CONTENT);
    PageUtils.setVisibility(defaultContent, true);
}

async function initialize(stateDispatcher: DispatchFn) {
    await populateOptionList();
    addHeroInfoListeners();
    const target = DOC_ELEMENTS.HOME_PAGE.getElt(DOC_ELEMENTS.HOME_PAGE.IDS.HERO_INFO_CONTENT);
    createKPICards(target);
    createTables(target);
}

async function runLogic(stateDispatcher: DispatchFn) {
    await resetPage();
}

async function handleDispatch(dispatcher: DispatchFn) {
    await runLogic(dispatcher);
    await HOME_PAGE_FNS.homePageSetView(HOME_PAGE_STATES.HERO_INFO);
}

let HeroInfoView: View = {
    runLogic: runLogic,
    initialize: initialize,
    triggerState: HOME_PAGE_STATES.HERO_INFO,
    handleDispatch: handleDispatch
};

export { HeroInfoView };
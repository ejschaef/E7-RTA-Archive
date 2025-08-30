import { RegExps } from "../e7/regex.ts";
import PageUtils from "./page-utilities/page-utils.js";
import { NavBarUtils } from "./page-utilities/nav-bar-utils.ts";
import { LangBlocks } from "../language-support/information-lang-blocks.ts";
import { ComposeOption, HTMLComposeElement, HTMLConstructor } from "./html-constructor/html-constructor.ts";
import DOC_ELEMENTS from "./page-utilities/doc-element-references.ts";
import { Safe } from "../html-safe.ts";
import { LangManager } from "../lang-manager.ts";
import { getText, TextRetrieveFns } from "../language-support/lang-builder.ts";
import { LanguageCode } from "../e7/references.ts";

const EDITORS: any[] = [];

let CURRENT_CARD: HTMLElement | null = null;

const ELEMENT_IDS = DOC_ELEMENTS.INFO_PAGE.IDS;

export function makeExampleFilterCardHTMLStr(title: string, description: string, exFilterTextAreaID: string): string {
	return `
    <div class="col-sm-12 d-none", id="${exFilterTextAreaID}-card">
      <div class="card">
        <div class="card-header">
          <h5>${title}</h5>
          <p class="text-sm">${description}</p>
        </div>
        <div class="card-body pc-component text-sm" id="${exFilterTextAreaID}-wrapper">
          <textarea name="code" class="codemirror-hidden" id="${exFilterTextAreaID}"></textarea>
        </div>
      </div>
    </div>
  `; // height of codeMirror area is set by style applied to wrapper id in CSS file
}
function makeTestFilterHTMLStr(title: string, description: string): string {
	return `
    <div class="col-sm-12 d-none" id="${ELEMENT_IDS.TEST_SYNTAX_CARD}">
      <div class="card">
        <div class="card-header text-center kpi-header tight-fit">
          <h3>${title}</h3>
          <h6 class="small-text">${description}</h6>
        </div>
        <div class="card-body text-center kpi-body tight-fit">
          <div class="row justify-content-center px-4">
            <span class="d-block mb-1 rel-width-80 scrollable-60px" id="${ELEMENT_IDS.TEST_FILTER_MESSAGE}">&nbsp;</span>
              <textarea id="codeArea" name="code" class="codemirror-hidden"></textarea>
              <div class="d-flex justify-content-center gap-3 mt-4">
                <button type="button" id="${ELEMENT_IDS.CHECK_SYNTAX_BTN}" name="check-syntax" value="check" class="btn shadow px-sm-1">Check
                  Syntax</button>
              </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function makeOverviewHTMLStr(languageCode: LanguageCode): string {
	const WELCOME_BLOCK = LangBlocks.WELCOME_BLOCK;
	return `
		<div class="col-md-9 mb-3 d-none", id="${DOC_ELEMENTS.INFO_PAGE.IDS.OVERVIEW_CARD}">
			<div class="card">
				<div class="card-header text-center">
					<h3>${getText(languageCode, WELCOME_BLOCK.TITLE)}</h3>
				</div>
				<div class="card-body text-start py-3 px-5">
					<ul>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART1)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART2)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART3)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART4)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART5)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART6)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART7)}</li>
						<li>${getText(languageCode, WELCOME_BLOCK.DESCRIPTION_PART8)}</li>
					</ul>
				</div>
			</div>
		</div>
  `;
}

function makeExampleAndTestHTMLStr(lang: LanguageCode) {
	let exampleFilterStr = "";
	const getText = TextRetrieveFns[lang];
	const LANG_BLOCK = LangBlocks.FilterExamplesAndTest;

	exampleFilterStr += makeExampleFilterCardHTMLStr(
		getText(LANG_BLOCK.EX1_TITLE),
		getText(LANG_BLOCK.EX1_DESCRIPTION),
		DOC_ELEMENTS.INFO_PAGE.IDS.EX_FILTER_1
	);

	exampleFilterStr += makeExampleFilterCardHTMLStr(
		getText(LANG_BLOCK.EX2_TITLE),
		getText(LANG_BLOCK.EX2_DESCRIPTION),
		DOC_ELEMENTS.INFO_PAGE.IDS.EX_FILTER_2
	);

	exampleFilterStr += makeExampleFilterCardHTMLStr(
		getText(LANG_BLOCK.EX3_TITLE),
		getText(LANG_BLOCK.EX3_DESCRIPTION),
		DOC_ELEMENTS.INFO_PAGE.IDS.EX_FILTER_3
	);

	exampleFilterStr += makeExampleFilterCardHTMLStr(
		getText(LANG_BLOCK.EX4_TITLE),
		getText(LANG_BLOCK.EX4_DESCRIPTION),
		DOC_ELEMENTS.INFO_PAGE.IDS.EX_FILTER_4
	);

	exampleFilterStr += makeExampleFilterCardHTMLStr(
		getText(LANG_BLOCK.EX5_TITLE),
		getText(LANG_BLOCK.EX5_DESCRIPTION),
		DOC_ELEMENTS.INFO_PAGE.IDS.EX_FILTER_5
	);

	exampleFilterStr += makeTestFilterHTMLStr(
		getText(LANG_BLOCK.TEST_TITLE),
		getText(LANG_BLOCK.TEST_DESCRIPTION)
	);

	return exampleFilterStr;
}

type CardArgs = {
  attributes?: { [key: string]: string },
  classes?: string[],
}

function injectInCard(composeList: HTMLComposeElement[], cardArgs?: CardArgs): HTMLComposeElement {
  const composeElt = {
    tag: "div",
    classes: ["col-sm-12", "d-none"],
    children: [
      {
        tag: "div",
        classes: ["card"],
        children: composeList
      },
    ],
    attributes: cardArgs?.attributes
  }
  return composeElt;
}


function paragraph(text: string, classes?: string[]): HTMLComposeElement {
  return {
    tag: "p",
    textContent: text,
    classes: classes
  }
}

function header(text: string, hNum = 1, classes?: string[]): HTMLComposeElement {
  return {
    tag: "h" + hNum,
    textContent: text,
    classes: classes
  }
}

function cardHeader(title: string, hNum = 1, subheader?: string): HTMLComposeElement {
  const header: HTMLComposeElement = {
    tag: "div",
    classes: ["card-header"],
    children: [
      {
        tag: "h" + hNum,
        textContent: title
      }
    ]
  }
  if (subheader) header.children?.push(paragraph(subheader));
  return header
}

type CardBodyArgs = {
  composeList?: HTMLComposeElement[],
  classes?: string[]
  option?: ComposeOption
}

function cardBody({ composeList, classes, option }: CardBodyArgs): HTMLComposeElement {
  return {
    tag: "div",
    classes: ["card-body", "pc-component"].concat(classes ?? []),
    option: option,
    children: composeList
  }
}

function hr(): HTMLComposeElement {
  return {
    tag: "hr"
  }
}

type ListElementArgs = {
  outertag?: string,
  outerclasses?: string[],
  innertag?: string,
  innerclasses?: string[],
  textList: string[]
}

function listElement({ outertag, outerclasses, innertag, innerclasses, textList }: ListElementArgs): HTMLComposeElement {
  return {
    tag: outertag ?? "ul",
    classes: outerclasses ?? [],
    children: [
      {
        tag: innertag ?? "li",
        classes: innerclasses ?? [],
        textContent: textList
      }
    ]
  }
}

function filterSyntaxTable(composeList: HTMLComposeElement[]): HTMLComposeElement {
  return {
    tag: "table",
    style: "width: 100%;",
    classes: ["table", "filter-syntax-table"],
    children: [
      {
        tag: "tbody",
        children: composeList
      }
    ]
  }
}

type SyntaxRulesTableRowArg = {
  leftText: string,
  leftClasses?: string[],
  rightText: string,
  rightClasses?: string[],
}

function syntaxRulesTableRow({ leftText, rightText, leftClasses, rightClasses }: SyntaxRulesTableRowArg): HTMLComposeElement {
  return {
    tag: "tr",
    children: [
      {
        tag: "td",
        style: "white-space: nowrap;",
        classes: leftClasses ?? [],
        textContent: leftText
      },
      {
        tag: "td",
        classes: ["cm-def"],
        innerHtml: "&rarr;"
      },
      {
        tag: "td",
        classes: rightClasses ?? [],
        textContent: rightText
      }
    ]
  };
}


type SyntaxRulesTableRowsArg = {
  entries: Array<[string, string]>,
  leftClasses?: string[],
  rightClasses?: string[],
}

function SyntaxRulesTableRows({ entries, leftClasses, rightClasses }: SyntaxRulesTableRowsArg): HTMLComposeElement[] {
  return entries.map(([leftText, rightText]) => syntaxRulesTableRow({ leftText, rightText, leftClasses, rightClasses }));
}


function makeComposeList(lang: LanguageCode): HTMLComposeElement[] {

  const text = TextRetrieveFns[lang];

  const FilterOverview = LangBlocks.FilterOverview;
  let filterOverviewBody: HTMLComposeElement[] = [
    cardHeader(text(FilterOverview.generalOverviewTitle), 3, text(FilterOverview.generalOverviewDescription)),
    cardBody({ option: ComposeOption.NEST }),
    header(text(FilterOverview.filterUsageTitle), 4),
    paragraph(text(FilterOverview.filterUsageDescription)),
    hr(),
    header(text(FilterOverview.objectTypesTitle), 4),
    paragraph(text(FilterOverview.objectTypesDescription)),
    listElement({
      outertag: "ol",
      outerclasses: ["text-sm"],
      textList: text(FilterOverview.objectTypesList)
    }),
    hr(),
    header(text(FilterOverview.highLevelRulesTitle), 4),
    listElement({
      outertag: "ol",
      outerclasses: ["text-sm"],
      textList: text(FilterOverview.highLevelRulesList)
    }),
  ]
  const filterOverviewCard = injectInCard(filterOverviewBody, { attributes: { id: ELEMENT_IDS.FILTER_OVERVIEW } });

  const Fields = LangBlocks.Fields;
  let fieldBody = [
    cardHeader(text(Fields.title), 5),
    cardBody({ classes: ["text-sm"], option: ComposeOption.NEST }),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["date", text(Fields.date)],
          ["season", text(Fields.season)],
          ["is-win", text(Fields.isWin)],
          ["is-first-pick", text(Fields.isFirstPick)],
          ["is-first-turn", text(Fields.isFirstTurn)],
          ["first-turn-hero", text(Fields.firstTurnHero)],
          ["victory-points", text(Fields.victoryPoints)],
          ["prebans", text(Fields.prebans)],
          ["postbans", text(Fields.postbans)],
          ["turns", text(Fields.turns)],
          ["seconds", text(Fields.seconds)],
          ["point-gain", text(Fields.pointGain)],
        ],
        leftClasses: ["cm-datafield"],
        rightClasses: ["cm-default"]
      })
    ),
    paragraph(text(Fields.attributesTitle)),
    paragraph(text(Fields.attributesDescription), ["text-sm"]),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["pick[n]", text(Fields.pickN)],
          ["picks", text(Fields.picks)],
          ["league", text(Fields.league)],
          ["prebans", text(Fields.prebansAttribute)],
          ["postban", text(Fields.postban)],
          ["server", text(Fields.server)],
          ["id", text(Fields.id)],
          ["mvp", text(Fields.mvp)],
        ],
        leftClasses: ["cm-datafield"],
        rightClasses: ["cm-default"]
      })
    )
  ]
  const fieldCard = injectInCard(fieldBody, { attributes: { id: ELEMENT_IDS.FIELD_SYNTAX } });

  const DeclaredData = LangBlocks.DeclaredData;
  const declaredDataBody = [
    cardHeader(text(DeclaredData.title), 5),
    cardBody({ classes: ["text-sm"], option: ComposeOption.NEST }),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["Integer", text(DeclaredData.Integer)],
          ["Date", text(DeclaredData.Date)],
          ["String", text(DeclaredData.String)],
          ["Boolean", text(DeclaredData.Boolean)],
          ["Set", text(DeclaredData.Set)],
          ["Range", text(DeclaredData.Range)],
          ["Season", text(DeclaredData.Season)],
        ],
        leftClasses: ["cm-declared-data"],
        rightClasses: ["cm-default"]
      })
    )
  ]
  const declaredDataCard = injectInCard(declaredDataBody, { attributes: { id: ELEMENT_IDS.DATA_SYNTAX } });


  const Operators = LangBlocks.Operators;
  const operatorsBody = [
    cardHeader(text(Operators.title), 5),
    cardBody({ classes: ["text-sm"], option: ComposeOption.NEST }),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["=", text(Operators.equal)],
          ["!=", text(Operators.notEqual)],
          [">", text(Operators.gt)],
          [">=", text(Operators.gte)],
          ["<", text(Operators.lt)],
          ["<=", text(Operators.lte)],
          ["in", text(Operators.in)],
          ["!in", text(Operators.notIn)],
        ],
        leftClasses: ["cm-operator"],
        rightClasses: ["cm-default"]
      })
    )
  ]
  const operatorsCard = injectInCard(operatorsBody, { attributes: { id: ELEMENT_IDS.OPERATOR_SYNTAX } });


  const Functions = LangBlocks.Functions;
  const functionsBody = [
    cardHeader(text(Functions.title), 5),
    cardBody({ classes: ["text-sm"], option: ComposeOption.NEST }),
    paragraph(text(Functions.clauseFunctionsTitle)),
    paragraph(text(Functions.clauseFunctionsDescription), ["text-sm"]),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["AND", text(Functions.AND)],
          ["OR", text(Functions.OR)],
          ["XOR", text(Functions.XOR)],
          ["NOT", text(Functions.NOT)],
        ],
        leftClasses: ["cm-keyword"],
        rightClasses: ["cm-default"]
      })
    ),
    paragraph(text(Functions.directFunctionsTitle)),
    paragraph(text(Functions.directFunctionsDescription), ["text-sm"]),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["[p1/p2].equipment(hero, str/set)", text(Functions.EQUIPMENT)],
          ["[p1/p2].artifact(hero, str/set)", text(Functions.ARTIFACT)],
          ["[p1/p2].CR(hero, operator, integer)", text(Functions.CR)],
        ],
        leftClasses: ["cm-keyword"],
        rightClasses: ["cm-default"]
      })
    ),
    paragraph(text(Functions.globalFiltersTitle)),
    paragraph(text(Functions.globalFiltersDescription), ["text-sm"]),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          ["last-N", text(Functions.lastN)],
        ],
        leftClasses: ["cm-keyword"],
        rightClasses: ["cm-default"]
      })
    ),
  ]
  const functionsCard = injectInCard(functionsBody, { attributes: { id: ELEMENT_IDS.FUNCTION_SYNTAX } });


  const Syntax = LangBlocks.Syntax;
  const syntaxBody = [
    cardHeader(text(Syntax.title), 5),
    cardBody({ classes: ["text-sm"], option: ComposeOption.NEST }),
    filterSyntaxTable(
      SyntaxRulesTableRows({
        entries: [
          [";", text(Syntax.semiColon)],
          [",", text(Syntax.comma)],
          ["(", text(Syntax.parentheses)],
          ["{", text(Syntax.braces)],
        ],
        leftClasses: ["cm-bracket"],
        rightClasses: ["cm-default"]
      })
    )
  ]
  const syntaxCard = injectInCard(syntaxBody, { attributes: { id: ELEMENT_IDS.STRUCTURAL_SYNTAX } });

  return [filterOverviewCard, fieldCard, declaredDataCard, operatorsCard, functionsCard, syntaxCard];
}

function makeExFilter(textAreaID: string, str: string) {
	const textArea = Safe.unwrapHtmlElt(textAreaID) as HTMLTextAreaElement;

	textArea.value = str.replace(/^\n/, "");

	// @ts-ignore
	const editor = CodeMirror.fromTextArea(textArea, {
		mode: "filterSyntax",
		lineNumbers: true,
		theme: "default",
		readOnly: true,
	});

	EDITORS.push(editor);

	textArea.classList.remove("codemirror-hidden");
}

function initializeCodeBlocksAndAddListeners() {

	// @ts-ignore
	CodeMirror.defineMode("filterSyntax", function () {
		return {

			token: function (stream: any, _state: any) {
				return RegExps.tokenMatch(stream);
			},
		};
	});

	const ex1Str = `
season = current-season;
is-first-pick = true;
p1.pick1 in {lone wolf peira, new moon luna};
OR("harsetti" in p1.prebans, "harsetti" in p2.prebans);`;

	makeExFilter("exFilter1", ex1Str);

	const ex2Str = `
last-n(500);
date in 2025-04-01...2025-07-01;
is-first-pick = false;
OR(
	AND(
		p2.league in {warlord, emperor, legend},
    	p2.pick3 = "zio"
    ),
    victory-points >= 3000
)`;

	makeExFilter("exFilter2", ex2Str);

	const ex3Str = `
"Rinak" in prebans;
"Boss Arunka" in prebans;
"Harsetti" in p1.picks;
NOT("Harsetti" = p2.postban);
victory-points in 2500...=3000;`;

	makeExFilter("exFilter3", ex3Str);

	const ex4Str = `
season = season-16f;
is-win = true;`;

	makeExFilter("exFilter4", ex4Str);

	const ex5Str = `
p1.equipment("belian", {immunity, counter});
p1.artifact("belian", {3f, elbris ritual sword});
p2.cr("New Moon Luna" > 100);
p2.server in {global, asia, Japan};`;

	makeExFilter("exFilter5", ex5Str);

	const textarea = Safe.unwrapHtmlElt("codeArea") as HTMLTextAreaElement;

	// @ts-ignore
	const editor = CodeMirror.fromTextArea(textarea, {
		mode: "filterSyntax",
		lineNumbers: true,
		theme: "default",
	});

	EDITORS.push(editor);

	// Intercept form submission
	const checkSyntaxBtn = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.CHECK_SYNTAX_BTN);
	checkSyntaxBtn.addEventListener("click", async function (event) {
		event.preventDefault(); // Prevent actual form submission to server

		// Ensure value is synced back to textarea before submit ; not strictly necessary since processed client-side
		// @ts-ignore
		Safe.unwrapHtmlElt("codeArea").value = editor.getValue();
		const syntaxStr = editor.getValue();
		console.log("Checking Str", syntaxStr);
		await PageUtils.validateFilterSyntax(syntaxStr);
	});

	// sync changes back to textarea if needed
	editor.on("change", () => {
		editor.save(); // Updates the hidden textarea for form submit
	});

	// Show the editor after it's initialized
	textarea.classList.remove("codemirror-hidden");
}

async function addText() {
	const rulesContainer = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.FILTER_SYNTAX_CONTAINER);
	const lang = await LangManager.getLang();
	const composeList = makeComposeList(lang);
	console.log("Compose List", composeList);
	const constructor = new HTMLConstructor(rulesContainer);
	constructor.compose(composeList);

	const exampleAndTestContainer = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.FILTER_EXAMPLES_AND_TEST_CONTAINER);
	const exampleAndTestHTMLStr = makeExampleAndTestHTMLStr(lang);
	exampleAndTestContainer.innerHTML = exampleAndTestHTMLStr;

	const overviewContainer = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.OVERVIEW_CONTAINER);
	const overviewHTMLStr = makeOverviewHTMLStr(lang);
	overviewContainer.innerHTML = overviewHTMLStr;
}

function addLinkClickListener() {
	const linkContainer = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.INFORMATION_CONTENT_LINKS_CONTAINER);
	linkContainer.addEventListener("click", function (event) {
		const target = event.target as HTMLButtonElement;
		if (target.name === "link-button") {
			const id = target.id;
			const cardTarget = id.replace("link", "card");
			const card = document.getElementById(cardTarget);
			CURRENT_CARD = card;
			card?.classList.remove("d-none");
			for (const editor of EDITORS) {
				editor.refresh();
			}
			DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.RETURN_CONTAINER).classList.remove("d-none");
			linkContainer.classList.add("d-none");
		}
	})
};

function addReturnBtnListener() {
	const returnBtn = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.RETURN_BTN);
	const linkContainer = DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.INFORMATION_CONTENT_LINKS_CONTAINER);
	returnBtn.addEventListener("click", function (event) {
		linkContainer.classList.remove("d-none");
		CURRENT_CARD?.classList.add("d-none");
		DOC_ELEMENTS.INFO_PAGE.getFromId(DOC_ELEMENTS.INFO_PAGE.IDS.RETURN_CONTAINER).classList.add("d-none");
	});
}

async function main() {
	await addText();
	await NavBarUtils.initialize();
	addLinkClickListener();
	addReturnBtnListener();
	PageUtils.setVisibility(DOC_ELEMENTS.BODY_FOOTER_CONTAINER, true);
	initializeCodeBlocksAndAddListeners();
}

await main();


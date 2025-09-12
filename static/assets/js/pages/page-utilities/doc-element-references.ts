import { Safe } from "../../html-safe.ts";



const HomePageIds = {
	SELECT_DATA_MSG: "select-data-msg",
	FILTER_MSG: "filterMSG",

	SELECT_DATA_BODY: "select-data-body",

	SHOW_STATS_BODY: "show-stats-body",

	LOAD_DATA_BODY: "load-data-body",

	HERO_INFO_BODY: "hero-info-body",

	HERO_INFO_CONTENT: "hero-info-content",

	HERO_DEFAULT_CONTENT: "default-content",

	LATEST_BATTLES_BTN: "latest-battles-btn",

	UPLOAD_FORM: "uploadForm",

	CSV_FILE: "csvFile",

	USER_QUERY_FORM_NAME: "user-query-form-name",

	USER_QUERY_FORM_SERVER: "user-query-form-server",

	AUTO_ZOOM_FLAG: "auto-zoom-flag",

	USER_NAME: "user-name",

	USER_ID: "user-id",

	USER_SERVER: "user-server",

	BATTLE_FILTER_TOGGLER: "filter-battle-table",

	ID_SEARCH_FLAG: "id-search-flag",

	SEASON_DETAILS_TBL: "season-details-tbl",

	PERFORMANCE_STATS_TBL: "performance-stats-tbl",

	FIRST_PICK_STATS_TBL: "first-pick-stats-tbl",

	PREBAN_STATS_TBL: "preban-stats-tbl",

	PLAYER_TBL: "player-tbl",

	OPPONENT_TBL: "opponent-tbl",

	BATTLES_TBL: "battles-tbl",

	RANK_PLOT: "rank-plot",

	SEARCH_INPUT: "searchInput",

	HERO_SEARCH_OPTIONS: "hero-option-list",

	HERO_PLAYER_TBL: "hero-player-tbl",

	HERO_OPPONENT_TBL: "hero-opponent-tbl",

} as const;

class HomePageElements {

	IDS = HomePageIds;

	private _SELECT_DATA_MSG: HTMLElement | null = null;
	private _FILTER_MSG: HTMLElement | null = null;

	private _SELECT_DATA_BODY: HTMLElement | null = null;
	private _SHOW_STATS_BODY: HTMLElement | null = null;
	private _LOAD_DATA_BODY: HTMLElement | null = null;
	private _HERO_INFO_BODY: HTMLElement | null = null;

	private _LATEST_BATTLES_BTN: HTMLElement | null = null;
	private _UPLOAD_FORM: HTMLElement | null = null;
	private _CSV_FILE: HTMLElement | null = null;

	private _USER_QUERY_FORM_NAME: HTMLElement | null = null;
	private _USER_QUERY_FORM_SERVER: HTMLElement | null = null;

	private _AUTO_ZOOM_FLAG: HTMLElement | null = null;

	private _FOOTER: HTMLElement | null = null;
	private _USER_NAME: HTMLElement | null = null;
	private _USER_ID: HTMLElement | null = null;
	private _USER_SERVER: HTMLElement | null = null;

	private _BATTLE_FILTER_TOGGLER: HTMLElement | null = null;

	private _ID_SEARCH_FLAG: HTMLElement | null = null;

	private _SEASON_DETAILS_TBL: HTMLElement | null = null;
	private _PERFORMANCE_STATS_TBL: HTMLElement | null = null;
	private _FIRST_PICK_STATS_TBL: HTMLElement | null = null;
	private _PREBAN_STATS_TBL: HTMLElement | null = null;
	private _PLAYER_TBL: HTMLElement | null = null;
	private _OPPONENT_TBL: HTMLElement | null = null;
	private _BATTLE_TBL: HTMLElement | null = null;
	private _RANK_PLOT: HTMLElement | null = null;

	private _HERO_PLAYER_TBL: HTMLElement | null = null;
	private _HERO_OPPONENT_TBL: HTMLElement | null = null;

	private _SEARCH_INPUT: HTMLElement | null = null;
	private _SEARCH_OPTIONS: HTMLElement | null = null;

	getElt(id: typeof HomePageIds[keyof typeof HomePageIds]) {
		return Safe.unwrapHtmlElt(id);
	}

	get SELECT_DATA_MSG() {
		return this._SELECT_DATA_MSG ||= Safe.unwrapHtmlElt("select-data-msg");
	}
	get FILTER_MSG() {
		return this._FILTER_MSG ||= Safe.unwrapHtmlElt("filterMSG");
	}

	get SELECT_DATA_BODY() {
		return this._SELECT_DATA_BODY ||= Safe.unwrapHtmlElt("select-data-body");
	}

	get SHOW_STATS_BODY() {
		return this._SHOW_STATS_BODY ||= Safe.unwrapHtmlElt("show-stats-body");
	}

	get LOAD_DATA_BODY() {
		return this._LOAD_DATA_BODY ||= Safe.unwrapHtmlElt("load-data-body");
	}

	get HERO_INFO_BODY() {
		return this._HERO_INFO_BODY ||= Safe.unwrapHtmlElt("hero-info-body");
	}

	get LATEST_BATTLES_BTN() {
		return this._LATEST_BATTLES_BTN ||= Safe.unwrapHtmlElt("latest-battles-btn");
	}

	get UPLOAD_FORM() {
		return this._UPLOAD_FORM ||= Safe.unwrapHtmlElt("uploadForm");
	}

	get CSV_FILE() {
		return this._CSV_FILE ||= Safe.unwrapHtmlElt("csvFile");
	}

	get USER_QUERY_FORM_NAME() {
		return this._USER_QUERY_FORM_NAME ||= Safe.unwrapHtmlElt(
			"user-query-form-name"
		);
	}

	get USER_QUERY_FORM_SERVER() {
		return this._USER_QUERY_FORM_SERVER ||= Safe.unwrapHtmlElt(
			"user-query-form-server"
		);
	}

	get AUTO_ZOOM_FLAG() {
		return this._AUTO_ZOOM_FLAG ||= Safe.unwrapHtmlElt("auto-zoom-flag");
	}

	get USER_NAME() {
		return this._USER_NAME ||= Safe.unwrapHtmlElt("user-name");
	}

	get USER_ID() {
		return this._USER_ID ||= Safe.unwrapHtmlElt("user-id");
	}

	get USER_SERVER() {
		return this._USER_SERVER ||= Safe.unwrapHtmlElt("user-server");
	}

	get BATTLE_FILTER_TOGGLE() {
		return this._BATTLE_FILTER_TOGGLER ||= Safe.unwrapHtmlElt(
			"filter-battle-table"
		);
	}

	get ID_SEARCH_FLAG() {
		return this._ID_SEARCH_FLAG ||= Safe.unwrapHtmlElt("id-search-flag");
	}

	get SEASON_DETAILS_TBL() {
		return this._SEASON_DETAILS_TBL ||=
			Safe.unwrapHtmlElt("season-details-tbl");
	}

	get PERFORMANCE_STATS_TBL() {
		return this._PERFORMANCE_STATS_TBL ||= Safe.unwrapHtmlElt("performance-stats-tbl");
	}

	get FIRST_PICK_STATS_TBL() {
		return this._FIRST_PICK_STATS_TBL ||= Safe.unwrapHtmlElt(
			"first-pick-stats-tbl"
		);
	}

	get PREBAN_STATS_TBL() {
		return this._PREBAN_STATS_TBL ||= Safe.unwrapHtmlElt("preban-stats-tbl");
	}

	get PLAYER_TBL() {
		return this._PLAYER_TBL ||= Safe.unwrapHtmlElt("player-tbl");
	}

	get OPPONENT_TBL() {
		return this._OPPONENT_TBL ||= Safe.unwrapHtmlElt("opponent-tbl");
	}

	get BATTLES_TBL() {
		return this._BATTLE_TBL ||= Safe.unwrapHtmlElt("battles-tbl");
	}

	get RANK_PLOT() {
		return this._RANK_PLOT ||= Safe.unwrapHtmlElt("rank-plot");
	}

	get MESSAGE_ELEMENTS_LIST() {
		return [this.SELECT_DATA_MSG, this.FILTER_MSG];
	}

	get SEARCH_INPUT() {
		return this._SEARCH_INPUT ||= Safe.unwrapHtmlElt("searchInput");
	}

	get HERO_SEARCH_OPTIONS() {
		return this._SEARCH_OPTIONS ||= Safe.unwrapHtmlElt("hero-option-list");
	}

	get HERO_PLAYER_TBL() {
		return this._HERO_PLAYER_TBL ||= Safe.unwrapHtmlElt("hero-player-tbl");
	}

	get HERO_OPPONENT_TBL() {
		return this._HERO_OPPONENT_TBL ||= Safe.unwrapHtmlElt("hero-opponent-tbl");
	}
}

class NavBarElements {
	private _SIDEBAR_HIDE_BTN: HTMLElement | null = null;
	get SIDEBAR_HIDE_BTN() {
		return (this._SIDEBAR_HIDE_BTN ||= Safe.unwrapHtmlElt("sidebar-hide"));
	}

	private _CLEAR_DATA_BTN: HTMLElement | null = null;
	get CLEAR_DATA_BTN() {
		return (this._CLEAR_DATA_BTN ||= Safe.unwrapHtmlElt("clear-data-btn"));
	}

	private _EXPORT_CSV_BTN: HTMLElement | null = null;
	get EXPORT_DATA_BTN() {
		return (this._EXPORT_CSV_BTN ||= Safe.unwrapHtmlElt("export-data-btn"));
	}

	private _OFFICIAL_SITE_BTN: HTMLElement | null = null;
	get OFFICIAL_SITE_BTN() {
		return (this._OFFICIAL_SITE_BTN ||= Safe.unwrapHtmlElt(
			"official-site-btn"
		));
	}

	private _USER_NAME: HTMLElement | null = null;
	get USER_NAME() {
		return (this._USER_NAME ||= Safe.unwrapHtmlElt("user-name"));
	}

	private _USER_ID: HTMLElement | null = null;
	get USER_ID() {
		return (this._USER_ID ||= Safe.unwrapHtmlElt("user-id"));
	}

	private _USER_SERVER: HTMLElement | null = null;
	get USER_SERVER() {
		return (this._USER_SERVER ||= Safe.unwrapHtmlElt("user-server"));
	}

	private _SIDEBAR_CONTROL: HTMLElement | null = null;
	get SIDEBAR_CONTROL() {
		return (this._SIDEBAR_CONTROL ||= Safe.unwrapHtmlElt("sidebar-control"));
	}

	private _REFRESH_REFERENCES_BTN: HTMLElement | null = null;
	get REFRESH_REFERENCES_BTN() {
		return (this._REFRESH_REFERENCES_BTN ||= Safe.unwrapHtmlElt(
			"refresh-references-btn"
		));
	}


}

class SEARCH_PAGE_ELEMENTS {
	private _SEARCH_DOMAINS: HTMLElement | null = null;
	get SEARCH_DOMAINS() {
		return (this._SEARCH_DOMAINS ||= Safe.unwrapHtmlElt("search-domains"));
	}

	private _SEARCH_SUBMIT_BTN: HTMLElement | null = null;
	get SEARCH_SUBMIT_BTN() {
		return (this._SEARCH_SUBMIT_BTN ||=
			Safe.unwrapHtmlElt("search-submit-btn"));
	}

	private _SEARCH_FORM: HTMLElement | null = null;
	get SEARCH_FORM() {
		return (this._SEARCH_FORM ||= Safe.unwrapHtmlElt("searchForm"));
	}

	private _SEARCH_TABLE_CONTAINER: HTMLElement | null = null;
	get SEARCH_TABLE_CONTAINER() {
		return (this._SEARCH_TABLE_CONTAINER ||= Safe.unwrapHtmlElt(
			"search-table-container"
		));
	}
}

class FILTER_SYNTAX_PAGE_ELEMENTS {

	private _FILTER_SYNTAX_RULES_CONTAINER: HTMLElement | null = null;
	get FILTER_SYNTAX_RULES_CONTAINER() {
		return (this._FILTER_SYNTAX_RULES_CONTAINER ||= Safe.unwrapHtmlElt(
			"filter-syntax-rules-container"
		));
	}

	private _ALL_CONTENT_CONTAINER: HTMLElement | null = null;
	get ALL_CONTENT_CONTAINER() {
		return (this._ALL_CONTENT_CONTAINER ||= Safe.unwrapHtmlElt(
			"all-content-container"
		));
	}
}

class INFO_PAGE_ELEMENTS {
	IDS = {
		OVERVIEW_CONTAINER : "overview-container",
		OVERVIEW_CARD : "overview-card",
		RETURN_BTN : "info-return-btn",
		RETURN_CONTAINER : "info-return-container",
		FILTER_SYNTAX_CONTAINER : "filter-syntax-rules-container",
		FILTER_EXAMPLES_AND_TEST_CONTAINER : "filter-syntax-examples-and-test-container",
		INFORMATION_CONTENT_LINKS_CONTAINER : "information-content-links-container",
		ALL_CONTENT_CONTAINER : "all-content-container",
		FILTER_OVERVIEW : "filter-rules-card",
		FIELD_SYNTAX : "fields-card",
		FUNCTION_SYNTAX : "functions-card",
		OPERATOR_SYNTAX : "operators-card",
		DATA_SYNTAX : "declared-data-card",
		STRUCTURAL_SYNTAX : "structural-syntax-card",
		EX_FILTER_1 : "exFilter1",
		EX_FILTER_2 : "exFilter2",
		EX_FILTER_3 : "exFilter3",
		EX_FILTER_4 : "exFilter4",
		EX_FILTER_5 : "exFilter5",
		TEST_FILTER_FORM : "test-filter-form",
		TEST_FILTER_MESSAGE : "filterMSG",
		TEST_SYNTAX_CARD : "test-syntax-card",
		CHECK_SYNTAX_BTN : "check-syntax-btn",
	} as const;


	private _CACHE: Partial<Record<typeof this.IDS[keyof typeof this.IDS], HTMLElement>> = {};

	constructor () {
		this._CACHE = {};
	}

	getFromId(id: typeof this.IDS[keyof typeof this.IDS]): HTMLElement {
		return this._CACHE[id] ||= Safe.unwrapHtmlElt(id);
	}
}

class DocElements {
	HOME_PAGE: HomePageElements;
	NAV_BAR: NavBarElements;
	SEARCH_PAGE: SEARCH_PAGE_ELEMENTS;
	FILTER_SYNTAX_PAGE: FILTER_SYNTAX_PAGE_ELEMENTS;
	INFO_PAGE: INFO_PAGE_ELEMENTS;

	private _BODY_FOOTER_CONTAINER: HTMLElement | null = null;
	private _FOOTER_WRAPPER: HTMLElement | null = null;

	constructor() {
		this.HOME_PAGE = new HomePageElements();
		this.NAV_BAR = new NavBarElements();
		this.SEARCH_PAGE = new SEARCH_PAGE_ELEMENTS();
		this.FILTER_SYNTAX_PAGE = new FILTER_SYNTAX_PAGE_ELEMENTS();
		this.INFO_PAGE = new INFO_PAGE_ELEMENTS();
	}

	get BODY_FOOTER_CONTAINER(): HTMLElement {
		return (this._BODY_FOOTER_CONTAINER ??=
			Safe.unwrapHtmlElt("body-footer-container"));
	}

	get FOOTER_WRAPPER(): HTMLElement {
		return (this._FOOTER_WRAPPER ||= Safe.unwrapHtmlElt("footer-wrapper"));
	}


}

const DOC_ELEMENTS = new DocElements();

export default DOC_ELEMENTS;

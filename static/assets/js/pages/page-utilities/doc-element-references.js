import { Safe } from "../../utils";
class HomePageElements {
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

    get CLEAR_DATA_BTN() {
        return this._CLEAR_DATA_BTN ||= Safe.unwrapHtmlElt("clear-data-btn");
    }

    get UPLOAD_FORM() {
        return this._UPLOAD_FORM ||= Safe.unwrapHtmlElt("uploadForm");
    }

    get CSV_FILE() {
        return this._CSV_FILE ||= Safe.unwrapHtmlElt("csvFile");
    }

    get USER_QUERY_FORM_NAME() {
        //needs to be kept in sync with id in forms.py of home folder in apps
        return this._USER_QUERY_FORM_NAME ||= Safe.unwrapHtmlElt("user-query-form-name"); 
        
    }

    get USER_QUERY_FORM_SERVER() {
        //needs to be kept in sync with id in forms.py of home folder in apps
        return this._USER_QUERY_FORM_SERVER ||= Safe.unwrapHtmlElt("user-query-form-server"); 
    }

    get BATTLES_TABLE() {
        return this._BATTLES_TABLE ||= Safe.unwrapHtmlElt("BattlesTable");
    }

    get AUTO_ZOOM_FLAG() {
        return this._AUTO_ZOOM_FLAG ||= Safe.unwrapHtmlElt("auto-zoom-flag");
    }

    get FOOTER_BODY() {
        return this._FOOTER ||= Safe.unwrapHtmlElt("footer-body");
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
        return this._BATTLE_FILTER_TOGGLER ||= Safe.unwrapHtmlElt("filter-battle-table");
    }

    get ID_SEARCH_FLAG() {
        return this._ID_SEARCH_FLAG ||= Safe.unwrapHtmlElt("id-search-flag");
    }

    get ESCAPE_BTN() {
        return this._ESCAPE_BTN ||= Safe.unwrapHtmlElt("escape-btn");
    }

    get SEASON_DETAILS_TBL() {
        return this._SEASON_DETAILS_TBL ||= Safe.unwrapHtmlElt("season-details-tbl");
    }

    get SERVER_STATS_TBL() {
        return this._SERVER_STATS_TBL ||= Safe.unwrapHtmlElt("server-stats-tbl");
    }

    get FIRST_PICK_STATS_TBL() {
        return this._FIRST_PICK_STATS_TBL ||= Safe.unwrapHtmlElt("first-pick-stats-tbl");
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


    get MESSAGE_ELEMENTS_LIST() {
        return [this.SELECT_DATA_MSG, this.FILTER_MSG];
    }
}

class NavBarElements {
    get SIDEBAR_HIDE_BTN() {
        return this._SIDEBAR_HIDE_BTN ||= Safe.unwrapHtmlElt("sidebar-hide");
    }

    get CLEAR_DATA_BTN() {
        return this._CLEAR_DATA_BTN ||= Safe.unwrapHtmlElt("clear-data-btn");
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

    get SIDEBAR_CONTROL() {
        return this._SIDEBAR_CONTROL ||= Safe.unwrapHtmlElt("sidebar-control");
    }
}

class SEARCH_PAGE_ELEMENTS {

    get SEARCH_DOMAINS() {
        return this._SEARCH_DOMAINS ||= Safe.unwrapHtmlElt("search-domains");
    }

    get SEARCH_SUBMIT_BTN() {
        return this._SEARCH_SUBMIT_BTN ||= Safe.unwrapHtmlElt("search-submit-btn");
    }

    get SEARCH_FORM() {
        return this._SEARCH_FORM ||= Safe.unwrapHtmlElt("searchForm");
    }

    get SEARCH_TABLE_CONTAINER() {
        return this._SEARCH_TABLE_CONTAINER ||= Safe.unwrapHtmlElt("search-table-container");
    }

}

let DOC_ELEMENTS = {
	HOME_PAGE: new HomePageElements(),
    NAV_BAR: new NavBarElements(),
    SEARCH_PAGE: new SEARCH_PAGE_ELEMENTS(),
};

export default DOC_ELEMENTS;

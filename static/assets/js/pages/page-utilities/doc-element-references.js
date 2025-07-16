class HomePageElements {
	get SELECT_DATA_MSG() {
		return this._SELECT_DATA_MSG ||= document.getElementById("select-data-msg");
	}
	get FILTER_MSG() {
		return this._FILTER_MSG ||= document.getElementById("filterMSG");
	}

    get SELECT_DATA_BODY() {
        return this._SELECT_DATA_BODY ||= document.getElementById("select-data-body");
    }

    get SHOW_STATS_BODY() {
        return this._SHOW_STATS_BODY ||= document.getElementById("show-stats-body");
    }

    get LOAD_DATA_BODY() {
        return this._LOAD_DATA_BODY ||= document.getElementById("load-data-body");
    }

    get CLEAR_DATA_BTN() {
        return this._CLEAR_DATA_BTN ||= document.getElementById("clear-data-btn");
    }

    get UPLOAD_FORM() {
        return this._UPLOAD_FORM ||= document.getElementById("uploadForm");
    }

    get CSV_FILE() {
        return this._CSV_FILE ||= document.getElementById("csvFile");
    }

    get USER_QUERY_FORM_NAME() {
        //needs to be kept in sync with id in forms.py of home folder in apps
        return this._USER_QUERY_FORM_NAME ||= document.getElementById("user-query-form-name"); 
        
    }

    get USER_QUERY_FORM_SERVER() {
        //needs to be kept in sync with id in forms.py of home folder in apps
        return this._USER_QUERY_FORM_SERVER ||= document.getElementById("user-query-form-server"); 
    }

    get BATTLES_TABLE() {
        return this._BATTLES_TABLE ||= document.getElementById("BattlesTable");
    }

    get AUTO_ZOOM_FLAG() {
        return this._AUTO_ZOOM_FLAG ||= document.getElementById("auto-zoom-flag");
    }

    get FOOTER_BODY() {
        return this._FOOTER ||= document.getElementById("footer-body");
    }
}

let DOC_ELEMENTS = {
	HOME_PAGE: new HomePageElements(),
};

export default DOC_ELEMENTS;

import { addHomePageMainListeners } from "./listeners/home-page/home-page-main-listeners";
import { addLoadDataListeners } from "../page-views/home-page/load-data/load-data-listeners";
import { addSelectDataListeners } from "../page-views/home-page/select-data/select-data-listeners";
import { addPublicStatsListeners } from "../page-views/home-page/stats/stats-listeners";

let ListenerController = {
	addHomePageListeners: function (stateDispatcher) {
		addHomePageMainListeners();
		addLoadDataListeners(stateDispatcher);
		addSelectDataListeners(stateDispatcher);
		addPublicStatsListeners();
	},
};

export { ListenerController };

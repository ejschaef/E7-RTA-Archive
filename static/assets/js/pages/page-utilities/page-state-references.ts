export const HOME_PAGE_STATES = {
	SELECT_DATA: "select-data",
	SHOW_STATS: "show-stats",
	LOAD_DATA: "load-data",
	HERO_INFO: "hero-info",
} as const;

export type HomePageState = typeof HOME_PAGE_STATES[keyof typeof HOME_PAGE_STATES];


export type PageState = HomePageState;
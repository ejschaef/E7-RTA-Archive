const LOG_CATEGORIES = {
    TEST : "~TEST~",
    CACHE : "~CACHE~",
    FILTER_PARSING : "~FLT~",
    PAGE_LOGIC : "~PAGE~",
    APIS : "~API~",
    CODE_MIRROR : "~CM~"
} as const;


export type LogCategory = typeof LOG_CATEGORIES[keyof typeof LOG_CATEGORIES];

const LOG_CATEGORY_VALUES = Object.values(LOG_CATEGORIES);

const SUPPRESS_CATEGORIES = [
    LOG_CATEGORIES.TEST,
    LOG_CATEGORIES.CODE_MIRROR
]

class Logger {
    originalLog = console.log
    suppressCategories: LogCategory[] = SUPPRESS_CATEGORIES;
    boundCategory: LogCategory | null = null;

    log(...args: any[]) {
        if (this.boundCategory && this.suppressCategories.includes(this.boundCategory)) return;
        this.originalLog(...args);
    }

    initialize() {
        console.log = (...args) => this.log(...args);
    }

    bindCategory(category: LogCategory) {
        this.boundCategory = category;
    }

    unbindCategory() {
        this.boundCategory = null;
    }   
}

const CONSOLE_LOGGER = new Logger();
CONSOLE_LOGGER.initialize();

export { CONSOLE_LOGGER, LOG_CATEGORIES };
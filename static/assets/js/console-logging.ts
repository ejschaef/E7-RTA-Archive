const LOG_CATEGORIES = {
    TEST : "~TEST~",
    CACHE : "~CACHE~",
    FILTER_PARSING : "~FLT~",
    PAGE_LOGIC : "~PAGE~",
    APIS : "~API~",
    CODE_MIRROR : "~CM~"
} as const;


export type LogCategory = typeof LOG_CATEGORIES[keyof typeof LOG_CATEGORIES];

const SUPPRESS_CATEGORIES = [
    LOG_CATEGORIES.TEST,
    LOG_CATEGORIES.CODE_MIRROR
]

class Logger {
    originalLog = console.log
    suppressCategories: LogCategory[] = SUPPRESS_CATEGORIES;
    boundCategory: LogCategory | null = null;
    captures: Record<string, Array<Array<any>>> = {};
    captureKey: string | null = null;

    log(...args: any[]) {
        if (this.captureKey !== null) {
            this.captures[this.captureKey].push(args);
            return;
        }

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

    bindCapture(key: string) {
        this.captures[key] = [];
        this.captureKey = key;
    }

    unbindCapture() {
        this.captureKey = null;
    }
}

const CONSOLE_LOGGER = new Logger();
CONSOLE_LOGGER.initialize();

export { CONSOLE_LOGGER, LOG_CATEGORIES };
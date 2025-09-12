import { PageState } from "../page-utilities/page-state-references";


export type DispatchFn = (state: PageState) => Promise<void>;
export type DispatchHandler = (dispatcher: DispatchFn) => Promise<void>;

export type View = {
    triggerState: PageState;
    handleDispatch: DispatchHandler;
    initialize: (stateDispatcher: DispatchFn) => Promise<void>;
    runLogic: (stateDispatcher: DispatchFn) => Promise<void>;
}


export type WrapperLogic = {
    preInitialize: (stateDispatcher: DispatchFn) => Promise<void>;
    postInitialize: (stateDispatcher: DispatchFn) => Promise<void>;
    preDispatch: (state: PageState) => Promise<void>;
    postDispatch: (state: PageState) => Promise<void>;
}


export class PageOrchestration {

    wrapperLogic: WrapperLogic;
    views: View[];

    dispatch!: DispatchFn;
    initialize!: () => Promise<void>;

    constructor(wrapperLogic: WrapperLogic, views: View[]) {
        this.wrapperLogic = wrapperLogic;
        this.views = views;
        this.bindViews();
    }

    bindViews(): void {
        const self = this;
        this.dispatch = async function(state: PageState) {
            await self.wrapperLogic.preDispatch(state);
            for (const view of self.views) {
                if (view.triggerState === state) {
                    await view.handleDispatch(self.dispatch);
                };
            }
            await self.wrapperLogic.postDispatch(state);
        }

        this.initialize = async function() {
            await self.wrapperLogic.preInitialize(self.dispatch);
            for (const view of self.views) {
                await view.initialize(self.dispatch);
            }
            await self.wrapperLogic.postInitialize(self.dispatch);
        }
    }

    appendView(view: View) {
        this.views.push(view);
        this.bindViews();
    }
}
export const Safe = {

    unwrapHtmlElt: function (eltID: string): HTMLElement {
        const elt = document.getElementById(eltID);
        if (elt === null) {
            throw new Error(`Could not find element with ID ${eltID}`);
        }
        return elt;
    },

    setText: function (eltID: string, text: string): void {
        const elt = this.unwrapHtmlElt(eltID);
        elt.textContent = text;
    },

}
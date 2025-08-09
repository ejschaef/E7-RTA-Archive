import Fuse from "fuse.js";

export function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function strArrToCountMap(strArr) {
    return strArr.reduce((acc, elt) => {
        acc[elt] = (acc[elt] || 0) + 1;
        return acc;
    }, {})
}

export function getStrMatches(str, strings, numMatches = null, customConfig = null) {
    const config = { 
        includeScore: true, 
        threshold: 0.3,
    }
    let fuse = null;
    if ( customConfig) {
        fuse = new Fuse(strings, {...config, ...customConfig});
    } else {
        fuse = new Fuse(strings, config);
    }
    const result = fuse.search(str);
    if (numMatches !== null) {
        return result.slice(0, numMatches);
    }
    return result;
}


export const Safe = {

    unwrapHtmlElt: function (eltID) {
        const elt = document.getElementById(eltID);
        if (elt === null) {
            throw new Error(`Could not find element with ID ${eltID}`);
        }
        return elt;
    },

    setText: function (eltID, text) {
        const elt = this.unwrapHtmlElt(eltID);
        elt.textContent = text;
    },

}
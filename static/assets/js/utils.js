export function toTitleCase(str) {
    return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function strArrToCountMap(strArr) {
    return strArr.reduce((acc, elt) => {
        acc[elt] = (acc[elt] || 0) + 1;
        return acc;
    }, {})
}
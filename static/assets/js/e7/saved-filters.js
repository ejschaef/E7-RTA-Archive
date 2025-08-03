let SavedFilters = {
    "Current Season" : "date in current-season",
    "First Pick" : "is-first-pick = true",
    "Second Pick" : "is-first-pick = false",
    "Champion+ Opponent" : "p2.league in {champion, warlord, emperor, legend}",
    "Warlord+ Opponent" : "p2.league in {warlord, emperor, legend}",
    "Emperor+ Opponent" : "p2.league in {emperor, legend}",
    "Legend Opponent" : "p2.league = 'legend'",
    "Wins" : "is-win = true",
    "Losses" : "is-win = false",

    extendFilters: function(currFilterStr, filterName) {
        const filter = SavedFilters[filterName];
        // trim whitespace only from end of str
        currFilterStr = currFilterStr.replace(/\s+$/, '');
        if (currFilterStr.slice(-1) !== ";" && currFilterStr.length > 0) {
            currFilterStr += ";\n";
        } else if (currFilterStr.slice(-1) === ";") {
            currFilterStr += "\n";
        }
        return `${currFilterStr}${filter};`;
    }
}


export default SavedFilters;
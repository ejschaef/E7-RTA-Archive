import E7API from "../e7-API.js";



async function test() {
    await E7API.fetchUserJSON("global");
    await E7API.fetchHeroJSON("en");
};

export {test}
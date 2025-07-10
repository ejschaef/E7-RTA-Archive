import E7API from "../e7-API.js";
import ContentManager from "../content-manager.js";



async function test() {
    await ContentManager.UserManager.findUser({id : "195863691"});
};

export {test}
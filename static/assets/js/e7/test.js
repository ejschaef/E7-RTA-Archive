import UserManager from './user-manager.js'

async function test() {
    const username = "octothorpe"
    const user = UserManager.getUser(username);
    console.log(`GOT: ${JSON.stringify(user)}`)
};

export {test}
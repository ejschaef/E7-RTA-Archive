import { WORLD_CODES } from "./references.js";


class E7APIError extends Error {
  constructor(message) {
    super(message); // Pass message to base Error
    this.name = "E7APIError"; // Set error name
  }
}

async function getJSON(url) {
    console.log("Fetching")
    return fetch(url)
    .then(response => {
        console.log("Got response")
        if (!response.ok) {
            // Handle HTTP error responses (404, 500, etc.)
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();  // May also throw if not valid JSON
    })
    .catch(error => {
       throw new E7APIError(`Fetch error: ${error.message}`);
    });
}


function createUser(userJSON, world_code) {
    return {
        "ID"         : userJSON.nick_no,
        "Name"       : userJSON.nick_nm.toLowerCase(),
        "code"       : userJSON.code,
        "rank"       : userJSON.rank,
        "world_code" : world_code
    }

}

async function getUsers(world_code) {
    if (!WORLD_CODES.has(world_code)) {
        console.log(`No Data returned: code ${world_code} not in ${refs.WORLD_CODES}`)
        return
    };
    world_code = world_code.replace("world_", "")
    const url = `https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_${world_code}.json`;
    const data = await getJSON(url);
    var users = new Object();
    data.users.forEach(user => {
        users[user.nick_nm] = createUser(user, world_code)
    });
    return users
};


function printObjStruct(obj) {
  const newObj = {};
  for (const key in obj) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      newObj[key] = [obj[key][0], `Length: ${obj[key].length}`];
    } else {
      newObj[key] = obj[key];
    }
  }
  console.log(newObj);
}

//Used by hero manager to convert heroes into prime numbers
function getPrimes(limit) {
  const sieve = new Uint8Array(limit + 1);
  const primes = [];
  for (let i = 2; primes.length < 5000; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = 1;
      }
    }
  }
  return primes;
}


export {E7APIError, getJSON, getUsers, printObjStruct}
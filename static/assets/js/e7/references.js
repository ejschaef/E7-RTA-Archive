export const WORLD_CODES = new Set(["world_kor", "world_global", "world_jpn", "world_asia", "world_eu"]);

export const WORLD_CODE_ENUM = {
  GLOBAL : "world_global", 
  KOR : "world_kor", 
  JPN : "world_jpn", 
  ASIA : "world_asia", 
  EU : "world_eu"
}

export const WORLD_CODE_TO_CLEAN_STR = {
  "world_global" : "Global",
  "world_kor" : "Korea",
  "world_jpn" : "Japan",
  "world_asia" : "Asia",
  "world_eu" : "Europe"
}

export const EQUIPMENT_SET_MAP = {
  "set_speed" : "Speed",
  "set_acc" : "Hit",
  "set_cri" : "Crit",
  "set_res" : "Resist",
  "set_def" : "Defense",
  "set_att" : "Attack",
  "set_max_hp" : "HP",
  "set_cri_dmg" : "Crit DMG",
  "set_coop" : "Unity",
  "set_immune" : "Immunity",
  "set_rage" : "Rage",
  "set_vampire" : "Lifesteal",
  "set_shield" : "Protection",
  "set_revenge" : "Revenge",
  "set_penetrate" : "Penetration",
  "set_torrent" : "Torrent",
  "set_counter" : "Counter",
  "set_scar" : "Injury"
}

export const ONE_DAY = 1000 * 60 * 60 * 24;

export const LEAGUE_MAP = {
    "bronze" : 0,
    "silver" : 1,
    "gold" : 2,
    "master" : 3,
    "challenger" : 4,
    "champion" : 5,
    "warlord" : 6,
    "emperor" : 7,
    "legend" : 8
}

export const COLUMNS = [
  "Date/Time","Seq Num",

  "P1 ID","P1 Server","P1 League","P1 Points",
  "P2 ID","P2 Server","P2 League",

  "Win","First Pick","P1 Preban 1","P1 Preban 2","P2 Preban 1","P2 Preban 2",

  "P1 Pick 1","P1 Pick 2","P1 Pick 3","P1 Pick 4","P1 Pick 5",
  "P2 Pick 1","P2 Pick 2","P2 Pick 3","P2 Pick 4","P2 Pick 5",
  
  "P1 Postban","P2 Postban"
  ];

export const COLUMNS_EXPANDED = [
  "Season",
  "Date/Time",
  "Seconds",
  "Turns",
  "Seq Num",
  "P1 ID",
  "P1 Server",
  "P2 ID",
  "P2 Server",
  "P1 League",
  "P2 League",
  "P1 Points",
  "Point Gain",
  "Win",
  "First Pick",
  "CR Bar",
  "First Turn",
  "First Turn Hero",
  "P1 Prebans",
  "P2 Prebans",
  "P1 Picks",
  "P2 Picks",
  "P1 Postban",
  "P2 Postban",
  "P1 Equipment",
  "P2 Equipment",
  "P1 Artifacts",
  "P2 Artifacts",
  "P1 MVP",
  "P2 MVP"
]

export const COLUMNS_MAP = {
  SEASON: "Season",
  DATE_TIME: "Date/Time",
  SECONDS: "Seconds",
  TURNS: "Turns",
  SEQ_NUM: "Seq Num",
  P1_ID: "P1 ID",
  P1_SERVER: "P1 Server",
  P2_ID: "P2 ID",
  P2_SERVER: "P2 Server",
  P1_LEAGUE: "P1 League",
  P2_LEAGUE: "P2 League",
  P1_POINTS: "P1 Points",
  POINT_GAIN: "Point Gain",
  WIN: "Win",
  FIRST_PICK: "First Pick",
  CR_BAR: "CR Bar",
  FIRST_TURN: "First Turn",
  FIRST_TURN_HERO: "First Turn Hero",
  P1_PREBANS: "P1 Prebans",
  P2_PREBANS: "P2 Prebans",
  P1_PICKS: "P1 Picks",
  P2_PICKS: "P2 Picks",
  P1_POSTBAN: "P1 Postban",
  P2_POSTBAN: "P2 Postban",
  P1_EQUIPMENT: "P1 Equipment",
  P2_EQUIPMENT: "P2 Equipment",
  P1_ARTIFACTS: "P1 Artifacts",
  P2_ARTIFACTS: "P2 Artifacts",
  P1_MVP: "P1 MVP",
  P2_MVP: "P2 MVP",
  P1_PICKS_PRIMES: "P1 Picks Primes",
  P1_PICKS_PRIME_PRODUCT: "P1 Picks Prime Product",
  P2_PICKS_PRIMES: "P2 Picks Primes",
  P2_PICKS_PRIME_PRODUCT: "P2 Picks Prime Product",
  P1_PREBANS_PRIMES: "P1 Prebans Primes",
  P1_PREBANS_PRIME_PRODUCT: "P1 Prebans Prime Product",
  P2_PREBANS_PRIMES: "P2 Prebans Primes",
  P2_PREBANS_PRIME_PRODUCT: "P2 Prebans Prime Product"
};



/**
 * Generates a list of all prime numbers up to and including the given limit.
 *
 * Uses the Sieve of Eratosthenes algorithm to generate the list.
 * 
 * Primes are used to represent as prime identifier allowing us to represent a set as a product of primes
 *
 * @param {number} limit - The upper limit of the prime numbers to generate. Must be a positive integer.
 * @returns {number[]} - A list of all prime numbers up to and including the given limit.
 */
function getPrimes(limit){
  const sieve = new Uint8Array(limit + 1);
  const primes = [];
  for (let i = 2; i <= limit; i++) {
    if (!sieve[i]) {
      primes.push(i);
      for (let j = i * i; j <= limit; j += i) {
        sieve[j] = 1;
      }
    }
  }
  return primes;
}

export const PRIMES = getPrimes(30000);


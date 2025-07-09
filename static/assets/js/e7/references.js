export const WORLD_CODES = new Set(["world_kor", "world_global", "world_jpn", "world_asia", "world_eu"]);

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
    "Date/Time", "Seq Num", "P1 ID", "P2 ID", 
    "P1 League", "P2 League", "P1 Points", "Win", "First Pick", 
    "P1 Preban 1", "P1 Preban 2", "P2 Preban 1", "P2 Preban 2", 
    "P1 Pick 1", "P1 Pick 2", "P1 Pick 3", "P1 Pick 4", "P1 Pick 5", 
    "P2 Pick 1", "P2 Pick 2", "P2 Pick 3", "P2 Pick 4", "P2 Pick 5", 
    "P1 Postban", "P2 Postban"];

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


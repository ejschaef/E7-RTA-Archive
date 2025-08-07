use crate::battle_api_structs::BattleAPIresponse;
use once_cell::sync::Lazy;
use reqwest::{blocking::Client};
use serde::de::DeserializeOwned;
use std::error::Error;

static CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

/// Fetches JSON data from a given URL and deserializes it into a specified type.
/// 
/// # Arguments
///
/// * `url` - A string representing the URL from which to fetch the JSON data.
///
/// # Returns
///
/// * `Result<T, Box<dyn Error>>` - Returns a result containing the deserialized JSON object of type `T`,
///   or an error if the request or deserialization fails.
///
/// # Type Parameters
///
/// * `T` - The type into which the JSON data should be deserialized. Must implement `DeserializeOwned`.
fn fetch_json<T>(url: String) -> Result<T, Box<dyn Error>> 
where
    T: DeserializeOwned,
{
    let response = CLIENT.post(&url).send()?;
    let json: T = response.json::<T>()?;
    return Ok(json);
}

/// Fetches a user's battle data from the Epic7.gg API.
///
/// # Arguments
///
/// * `uid` - The user ID of the user whose battle data should be fetched. You can find this by looking at url of players in gg site.
/// * `world_code` - The code of the world (server) on which the user is registered.
///
/// # Returns
///
/// * `Result<BattleAPIresponse, Box<dyn Error>>` - Returns a result containing the JSON data
///   returned by the API, or an error if the request or deserialization fails.
pub fn fetch_battle_data(uid: i64, world_code: &str) -> Result<BattleAPIresponse, Box<dyn Error>> {
    let url = format!("https://epic7.gg.onstove.com/gameApi/getBattleList?nick_no={USER_ID}&world_code={WORLD_CODE}&lang=en&season_code=recent", USER_ID = uid, WORLD_CODE = world_code);
    let json = fetch_json::<BattleAPIresponse>(url)?;
    return Ok(json);
}
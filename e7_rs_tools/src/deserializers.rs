use serde::{Deserialize, Serialize, de::DeserializeOwned};


fn wrap(s: &str) -> String {
    format!("{{{}}}", s)
}

pub fn wrap_and_deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Serialize,
    T: DeserializeOwned,
{
    use serde::de::Error;
    let s = String::deserialize(deserializer)?;

    let team: T = serde_json::from_str(&wrap(s.as_str())).map_err(Error::custom)?;
    Ok(team)
}


pub fn from_str<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    use serde::de::Error;
    let s = String::deserialize(deserializer)?;
    s.parse::<T>().map_err(Error::custom)
}
use serde::{Deserialize, Serialize, de::DeserializeOwned};


fn wrap(s: &str) -> String {
    format!("{{{}}}", s)
}

    /// A deserialization function that wraps the deserialized string in double
    /// curly braces and then deserializes the string as the specified type.
    ///
    /// This is useful when you need to deserialize a JSON string that is
    /// embedded in another JSON object.
    ///
    /// # Errors
    ///
    /// If the deserialization of the embedded JSON string fails, this function
    /// returns an error.
pub fn wrap_and_deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: Serialize,
    T: DeserializeOwned,
{
    use serde::de::Error;
    let s = String::deserialize(deserializer)?;

    let parsed: T = serde_json::from_str(&wrap(s.as_str())).map_err(Error::custom)?;
    Ok(parsed)
}


    /// A deserialization function that takes a string and parses it into the
    /// type given.
    ///
    /// # Errors
    ///
    /// If the deserialization of the string fails, this function returns an
    /// error.
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
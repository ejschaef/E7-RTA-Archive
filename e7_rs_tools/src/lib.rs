use pyo3::prelude::*;
use pyo3::wrap_pyfunction;

pub mod deserializers;
pub mod battle_api_structs;
pub mod e7_api;

use battle_api_structs::BattleStatsBundle;
use e7_api::fetch_battle_data;


fn runtime_error(msg: String) -> PyErr {
    PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(msg)
}   


#[pyfunction]
fn get_battle_array(uid: i64, world_code: &str) -> PyResult<Vec<BattleStatsBundle>> {
    let battle_api_response = fetch_battle_data(uid, world_code).map_err(|e| runtime_error(e.to_string()))?;
    let raw_array_opt = battle_api_response.result_body.battle_list;

    let raw_array = match raw_array_opt {
        Some(array) => array,
        None => Vec::new(),
    };
    let clean_array = raw_array.into_iter()
        .map(|elt| BattleStatsBundle::from_battle_entry(elt))
        .collect();
    return Ok(clean_array)
}


#[pymodule]
fn e7_rs_tools(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(get_battle_array, m)?)?;
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}

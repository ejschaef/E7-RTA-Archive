use serde::{Deserialize, Serialize};
use pyo3::{prelude::*, types::PyDict};
use crate::deserializers::{wrap_and_deserialize, from_str};



#[derive(Debug, Deserialize, Serialize)]
pub struct BattleAPIresponse {
    pub result_body: BattleListContainer,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct BattleListContainer {
    pub battle_list: Option<Vec<BattleListEntry>>,
}


#[derive(Debug, Deserialize, Serialize)]
pub struct BattleListEntry {
    pub battleCompletedate: String,
    pub battle_day: String,
    pub battle_seq: String,
    pub battle_time: i16,
    pub enemy_deck: Deck,
    pub enemy_grade_code: String,
    pub enemy_hero_code: String, // profile hero codes
    pub enemy_nick_no: String,
    pub enemy_world_code: String,

    #[serde(deserialize_with = "wrap_and_deserialize")]
    pub energyGauge: EnergyGauge, // this is a string-wrapped JSON
    pub grade_code: String,
    pub iswin: u8,
    pub langCode: String,
    pub matchPlayerNicknameno: i32,
    pub my_deck: Deck,
    pub myscore_info: MyScoreInfo,
    pub nicknameno: i32,

    #[serde(deserialize_with = "wrap_and_deserialize")]
    pub prebanList: PrebanList, // string-wrapped JSON

    #[serde(deserialize_with = "wrap_and_deserialize")]
    pub prebanListEnemy: PrebanList,
    pub regDate: String,
    pub season_code: String,
    pub season_name: String,

    #[serde(deserialize_with = "wrap_and_deserialize")]
    pub teamBettleInfo: Team,     // string-wrapped JSON

    #[serde(deserialize_with = "wrap_and_deserialize")]
    pub teamBettleInfoenemy: Team, // string-wrapped JSON
    pub turn: i16,
    pub updownPointWinscore: i16,
    pub updownTypeWinscore: u8,
    pub winScore: i16,
    pub worldCode: String,
}


// this is the struct that will compose the battle array
#[derive(Clone, Debug)]
pub struct BattleStatsBundle {
    pub date_time: String,
    pub season_name: String,
    pub season_code: String,
    pub seq_num: String,
    pub win: u8,
    pub first_pick: u8,
    pub turns: i16,
    pub seconds: i16,
    pub p1_id: i32,
    pub p2_id: i32,
    pub p1_server: String,
    pub p2_server: String,
    pub p1_league: String,
    pub p2_league: String,
    pub p1_prebans: Vec<String>,
    pub p2_prebans: Vec<String>,
    pub p1_picks: Vec<String>,
    pub p2_picks: Vec<String>,
    pub p1_mvp: Option<String>,
    pub p2_mvp: Option<String>,
    pub p1_postban: Option<String>,
    pub p2_postban: Option<String>,
    pub p1_equipment: Vec<Vec<String>>,
    pub p2_equipment: Vec<Vec<String>>,
    pub cr_bar: Vec<(String, i8)>,
    pub p1_artifacts: Vec<String>,
    pub p2_artifacts: Vec<String>,
    pub p1_point_delta: i16,
    pub p1_win_score: i16,
}


impl BattleStatsBundle {
    pub fn from_battle_entry(entry: BattleListEntry) -> Self {

        let first_pick = if entry.my_deck.is_first_pick() {1} else {0};
        let (point_delta, win_score) = ScoreInfoStatsBundle::get(entry.myscore_info);
        let (p1_picks, p1_equipment, p1_artifacts) = TeamStatsBundle::get(entry.teamBettleInfo);
        let (p2_picks, p2_equipment, p2_artifacts) = TeamStatsBundle::get(entry.teamBettleInfoenemy);
        let cr_bar = get_cr_bar(entry.energyGauge);
        let (p1_mvp, p2_postban, p1_prebans) = DeckStatsBundle::get(entry.my_deck);
        let (p2_mvp, p1_postban, p2_prebans) = DeckStatsBundle::get(entry.enemy_deck);

        Self {
            date_time: entry.battle_day,
            season_name: entry.season_name,
            season_code: entry.season_code,
            seq_num: entry.battle_seq,
            win: if entry.iswin == 1 {1} else {0},
            first_pick: first_pick,
            turns: entry.turn,
            seconds: entry.battle_time,
            p1_id: entry.nicknameno,
            p2_id: entry.matchPlayerNicknameno,
            p1_server: entry.worldCode,
            p2_server: entry.enemy_world_code,
            p1_league: entry.grade_code,
            p2_league: entry.enemy_grade_code,
            p1_prebans: p1_prebans,
            p2_prebans: p2_prebans,
            p1_picks: p1_picks,
            p2_picks: p2_picks,
            p1_mvp: p1_mvp,
            p2_mvp: p2_mvp,
            p1_postban: p1_postban,
            p2_postban: p2_postban,
            p1_equipment: p1_equipment,
            p2_equipment: p2_equipment,
            cr_bar: cr_bar,
            p1_artifacts: p1_artifacts,
            p2_artifacts: p2_artifacts,
            p1_point_delta: point_delta,
            p1_win_score: win_score
        }
    }
}


impl IntoPy<PyObject> for BattleStatsBundle {
    fn into_py(self, py: Python<'_>) -> PyObject {
        let dict = PyDict::new_bound(py);

        dict.set_item("date_time", self.date_time).unwrap();
        dict.set_item("season_name", self.season_name).unwrap();
        dict.set_item("season_code", self.season_code).unwrap();
        dict.set_item("seq_num", self.seq_num).unwrap();
        dict.set_item("win", self.win).unwrap();
        dict.set_item("first_pick", self.first_pick).unwrap();
        dict.set_item("turns", self.turns).unwrap();
        dict.set_item("seconds", self.seconds).unwrap();
        dict.set_item("p1_id", self.p1_id).unwrap();
        dict.set_item("p2_id", self.p2_id).unwrap();
        dict.set_item("p1_server", self.p1_server).unwrap();
        dict.set_item("p2_server", self.p2_server).unwrap();
        dict.set_item("p1_league", self.p1_league).unwrap();
        dict.set_item("p2_league", self.p2_league).unwrap();
        dict.set_item("p1_prebans", self.p1_prebans).unwrap();
        dict.set_item("p2_prebans", self.p2_prebans).unwrap();
        dict.set_item("p1_picks", self.p1_picks).unwrap();
        dict.set_item("p2_picks", self.p2_picks).unwrap();
        dict.set_item("p1_mvp", self.p1_mvp).unwrap();
        dict.set_item("p2_mvp", self.p2_mvp).unwrap();
        dict.set_item("p1_postban", self.p1_postban).unwrap();
        dict.set_item("p2_postban", self.p2_postban).unwrap();
        dict.set_item("p1_equipment", self.p1_equipment).unwrap();
        dict.set_item("p2_equipment", self.p2_equipment).unwrap();
        dict.set_item("cr_bar", self.cr_bar).unwrap();
        dict.set_item("p1_artifacts", self.p1_artifacts).unwrap();
        dict.set_item("p2_artifacts", self.p2_artifacts).unwrap();
        dict.set_item("p1_point_delta", self.p1_point_delta).unwrap();
        dict.set_item("p1_win_score", self.p1_win_score).unwrap();

        dict.into_py(py)
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

#[derive(Debug, Deserialize, Serialize)]
pub struct Deck {
    pub hero_list: Vec<HeroPick>,
    pub preban_list: Vec<String>,
}

impl Deck {
    pub fn is_first_pick(&self) -> bool {
        return self.hero_list.iter().any(|h| h.first_pick == 1);
    }
}

struct DeckStatsBundle {}

impl DeckStatsBundle {

    pub fn get(deck: Deck) -> (Option<String>, Option<String>, Vec<String>) {
        let mut mvp = None;
        let mut post_banned = None;
        for entry in deck.hero_list {
            if entry.mvp == 1 {
                mvp = Some(entry.hero_code.clone());
            }
            if entry.ban == 1 {
                post_banned = Some(entry.hero_code);
            }
        }
        return (
            mvp,
            post_banned,
            deck.preban_list,
        )
    }
}


#[derive(Debug, Deserialize, Serialize)]
pub struct PrebanList {
    pub preban_list: Vec<String>
}


#[derive(Debug, Deserialize, Serialize)]
pub struct HeroPick {
    pub ban: u8,
    pub first_pick: u8,
    pub hero_code: String,
    pub mvp: u8,
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////



#[derive(Debug, Deserialize, Serialize)]
pub struct MyScoreInfo {
    pub up_down_score: i16,
    pub up_down_type: i16,
    pub win_score: i16,
}

struct ScoreInfoStatsBundle {}

impl ScoreInfoStatsBundle {
    
    /// Returns a tuple of (point delta, win score) for the given MyScoreInfo object. The point delta is calculated
    /// as the product of the up_down_score and a value of 1 if up_down_type is 1, or -1 if up_down_type is not 1.
    /// The win score is taken directly from the MyScoreInfo object.
    pub fn get(score_info: MyScoreInfo) -> (i16, i16) {
        (
            score_info.up_down_score * {if score_info.up_down_type == 1 {1} else {-1}},
            score_info.win_score
        )
    }
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////


#[derive(Debug, Deserialize, Serialize)]
pub struct Team {
    pub my_team: Vec<HeroBattleInfo>,
}

struct TeamStatsBundle {}

impl TeamStatsBundle {

    pub fn get(team: Team) -> (Vec<String>, Vec<Vec<String>>, Vec<String>) {
        let mut heroes = Vec::with_capacity(5);
        let mut equipment = Vec::with_capacity(5);
        let mut artifacts= Vec::with_capacity(5);

        for hero in team.my_team.into_iter() {
            heroes.push(hero.hero_code);
            equipment.push(hero.equip);
            artifacts.push(hero.artifact);
        }

        return (
            heroes,
            equipment,
            artifacts
        )
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct HeroBattleInfo {
    pub artifact: String,
    pub attack_damage: i64,
    pub attribute_cd: String,
    pub awaken_grade: i16,
    pub equip: Vec<String>,
    pub grade: i16,
    pub hero_code: String,
    pub job_cd: String,
    pub kill_count: i16,
    pub level: i16,
    pub mvp: i8,
    pub mvp_point: i64,
    pub pick_order: i8,
    pub position: i8,
    pub receive_damage: f64,
    pub recovery: i64,
    pub respawn: i16
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////////


#[derive(Debug, Deserialize, Serialize)]
pub struct EnergyGauge {
    pub energy_gauge: Vec<HeroEnergyGaugeInfo>
}

fn get_cr_bar(gauge: EnergyGauge) -> Vec<(String, i8)> {
    return gauge.energy_gauge.into_iter()
        .map(|h| (h.hero_code, h.energy))
        .filter(|(_, energy)| *energy != 0)
        .collect()
}


// energy gauge is in order of CR bar ascending - last hero takes first turn
#[derive(Debug, Deserialize, Serialize)]
pub struct HeroEnergyGaugeInfo {
    pub energy: i8,
    pub hero_code: String,
    
    #[serde(deserialize_with = "from_str")]
    pub position_no: i8,

    #[serde(deserialize_with = "from_str")]
    pub team: u8
} 
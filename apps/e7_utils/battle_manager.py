# -*- coding: utf-8 -*-
"""
Created on Sun Mar 30 15:50:47 2025

@author: Grant
"""
from io import StringIO
from typing import Self, Iterable
import apps.e7_utils.utils as utils
from apps.e7_utils.hero_manager import HeroManager
from apps.e7_utils.references import LEAGUES, PERFORMANT_TYPE_DICT, PRETTY_COLUMN_DICT, RAW_TYPE_DICT, COL_CONSOLIDATION_MAP, HERO_COLS
import pandas as pd
import re
import os
import itertools
import jsonpickle

to_percent = lambda flt: str(round(flt * 100, 1)) + "%"


RAW_COL_ORDER = [col for col in RAW_TYPE_DICT]



class Battle:
    
    __slots__ = 'time', 'seq_num', 'p1_id', 'p2_id', \
                'p1_picks', 'p2_picks', 'winner',    \
                'grades', 'scores', 'p1_preban',     \
                'p2_preban', 'postbans', 'first_pick'
    
    @property
    def key(self):
        return self.seq_num
                
    def __init__(self, battle_data):
        for key, value in battle_data.items():
            setattr(self, key, value)
        
    def __hash__(self):
        return hash(self.key)
    
    def __eq__(self, battle):
        if isinstance(battle, Battle):
            return self.key == battle.key
        elif isinstance(battle, int):
            return self.key == battle
        else:
            raise RuntimeError("Attempted to check equality of Battle with something other than int or Battle")
    
    def to_dict(self):
        return {field : getattr(self, field) for field in self.__slots__}    

def df_row_to_battle(row):
    battle_data = {}
    for key, val in row.items():
        if key == 'index':
            continue
        if not re.match(".*_[1-9]$", key):
            battle_data[key] = val
        else:
            key = re.sub("_[1-9]$", "", key)
            battle_data.setdefault(key, []).append(val)
    for key, val in battle_data.items():
        if isinstance(val, list) and key != 'scores':
            battle_data[key] = tuple(val)
    return Battle(battle_data)


def calc_winrate(battle_list):
    if len(battle_list) == 0:
        return 0
    return sum(b.winner == 1 for b in battle_list) / len(battle_list)


def to_pretty_dataframe(df: pd.DataFrame, HM: HeroManager):
    df = df.replace(HM.str_name_map)
    df = df.rename(columns={v: k for k, v in PRETTY_COLUMN_DICT.items()})

    df = df[[col for col in PRETTY_COLUMN_DICT]].copy()
    
    df["Win"] = df["Win"].map({1: "W", 2: "L"}).astype(str)
    df["First Pick"] = df["First Pick"].map({1: True, 2: False}).astype(bool)
    return df

def to_raw_dataframe(df: pd.DataFrame, HM: HeroManager):
    col_replace_dict = {
            "Win" : {"W":1, "L":2},
            "First Pick" : {True:1, False:2, "True":1, "False":2},
        }
    
    df = df.replace(HM.name_str_map).infer_objects(copy=False)
    df = df.replace(col_replace_dict).infer_objects(copy=False)
    df["scores_2"] = -1
    
    df = df.rename(columns=PRETTY_COLUMN_DICT)
    df = df[RAW_COL_ORDER]
    return df


def filter_battles(battles: dict[str, Battle], conditions: list[callable]) -> list[Battle]:
    return {b.key : b for b in battles.values() if all(condition(b) for condition in conditions)}

def query_stats(battles: pd.DataFrame, total_battles: int) -> dict[str, float]:
        games_won = (battles['winner'] == 1).sum()
        games_appeared = len(battles)
        appearance_rate = games_appeared / total_battles if total_battles != 0 else 0
        winrate = games_won / games_appeared if games_appeared != 0 else 0
        return {
            'games_won'       : int(games_won),
            'games_appeared'  : int(games_appeared),
            'total_games'     : total_battles,
            'appearance_rate' : to_percent(appearance_rate),
            'win_rate'        : to_percent(winrate),
            '+/-'             : int(2 * games_won - games_appeared)
            }

def get_first_pick_stats(fp_battles: pd.DataFrame, HM: HeroManager) -> dict[str]:
    """
    Adds to general stats; covers stats for heroes that were picked first in first pick games
    """
    total_battles = len(fp_battles)
    fp_battles = fp_battles.copy()
    fp_battles["wins"] = fp_battles["winner"].apply(lambda v: v == 1)
    result_df = fp_battles.groupby("p1_picks_1", as_index=False).agg(
        wins=("wins", "sum"),
        appearances=("seq_num", "count")
    )

    result_df = result_df.rename({"p1_picks_1" : "hero"}, axis='columns')
    result_df["hero"] = result_df["hero"].apply(lambda prime: HM.get_from_prime(prime).name)

    result_df["win_rate"] = (result_df["wins"] / result_df["appearances"]).apply(to_percent)
    result_df["appearance_rate"] = (result_df["appearances"] / total_battles).apply(to_percent)
    result_df["+/-"] = 2 * result_df["wins"] - result_df["appearances"]

    result_df = result_df.sort_values(by="appearances", ascending=False)

    return result_df.to_dict(orient="records")

def get_preban_stats(battles: pd.DataFrame, HM: HeroManager) -> dict[str]:
    empty_prime = HM.get_from_name('empty').prime
    preban1 = set(prime for prime in battles["p1_preban_1"].unique() if prime and not prime == int(empty_prime))
    preban2 = set(prime for prime in battles["p1_preban_2"].unique() if prime and not prime == int(empty_prime))
    preban_set = preban1 | preban2
    prebans = []
    for r in [1, 2]:
        prebans.extend(itertools.combinations(preban_set, r=r))
    
    prebans = [t[0] * t[1] if len(t) == 2 else t[0] for t in prebans]

    total_battles = len(battles)

    output = []
    for preban in prebans:
        filtered = battles[battles["p1_prebans"] % preban == 0]
        if len(filtered) == 0:
            continue
        wins = (filtered["winner"] == 1).sum()
        appearances = len(filtered)
        appearance_rate = appearances / total_battles if total_battles > 0 else 0
        win_rate = wins / appearances if appearances > 0 else 0
        plus_minus = 2 * wins - appearances
        output.append({
            'preban' : HM.prime_pair_name_map[str(preban)],
            'wins' : int(wins),
            'appearances' : int(appearances),
            'appearance_rate' : to_percent(appearance_rate),
            'win_rate' : to_percent(win_rate),
            '+/-' : int(plus_minus)
        })
    output = sorted(output, key=lambda d: d['appearances'], reverse=True)
    return output


    
class BattleManager:
    
    def __init__(self, battles=None, filters=None):
        self.df = None
        self.performant_df = None

        #will be sets of hero primes
        self.player_heroes = None
        self.enemy_heroes = None
        
        #Set battles with dict if it is passed as dict, otherwise process the list into a dict
        if battles is not None:
            if not isinstance(battles, dict):
                battles_dict = {}
                for battle in battles:
                    key = battle.key
                    battles_dict[key] = battle
                battles = battles_dict
            self.battles = battles
        else:
            self.battles = {}

        #apply filters if passed
        if filters is not None:
            self.battles = filter_battles(self.battles, conditions=filters)

    
    @classmethod
    def from_raw_battles_list(cls, battles: list[dict]) -> Self:
        """
        takes in output of get_battles_list function from get_battles.py
        """
        battles = [Battle(battle) for battle in battles]
        return cls(battles)
    
    
    @classmethod
    def from_df(cls, df: pd.DataFrame) -> Self:
        battles = df.apply(df_row_to_battle, axis=1).to_list()
        return cls(battles)
    
    @classmethod
    def from_parquet(cls, file) -> Self:
        df = pd.read_parquet(file)
        return cls.from_df(df)
    
    @classmethod
    def decode(cls, serialized_content) -> Self:
        decoded = jsonpickle.decode(serialized_content)
        if decoded.df is not None:
            decoded.df = pd.read_json(StringIO(decoded.df))
            decoded.df = decoded.df.astype(RAW_TYPE_DICT)
        if decoded.performant_df is not None:
            decoded.performant_df = pd.read_json(StringIO(decoded.performant_df))
            decoded.performant_df = decoded.performant_df.astype(PERFORMANT_TYPE_DICT)
            decoded.make_hero_sets()
        return decoded

    def encode(self):
        print("ENCODING BATTLES")
        if self.performant_df is not None:
            self.enemy_heroes = None
            self.player_heroes = None
            self.player_hero_pairs = None
            self.enemy_hero_pairs = None
            self.performant_df = self.performant_df.to_json()
        if self.df is not None:
            self.df = self.df.to_json()
        encoded = jsonpickle.encode(self)
        return encoded
    
    @property
    def raw_battle_dict(self):
        return {seq_num : battle.to_dict() for seq_num, battle in self.battles.items()}
    
    def __contains__(self, battle: Battle):
        return battle in self.battles
    
    def __iter__(self):
        yield from self.battles

    def make_hero_sets(self):
        assert self.performant_df is not None
        self.player_heroes = dict()
        self.enemy_heroes = dict()
        for col in COL_CONSOLIDATION_MAP['p1_picks']:
            self.performant_df[col].apply(lambda prime: self.player_heroes.setdefault(prime, None))
        for col in COL_CONSOLIDATION_MAP['p2_picks']:
            self.performant_df[col].apply(lambda prime: self.enemy_heroes.setdefault(prime, None))

        #make pairs of heroes based on the battles
        self.player_hero_pairs = {p1 * p2: (p1, p2) for p1, p2 in itertools.combinations(self.player_heroes.keys(), 2)}
        self.enemy_hero_pairs = {p1 * p2: (p1, p2) for p1, p2 in itertools.combinations(self.enemy_heroes.keys(), 2)}

        #assign each hero the corresponding subset of battles
        for prime in self.player_heroes:
            self.player_heroes[prime] = self.performant_df[self.performant_df['p1_picks'] % prime == 0]
        for prime in self.enemy_heroes:
            self.enemy_heroes[prime] = self.performant_df[self.performant_df['p2_picks'] % prime == 0]

    def filter_battles(self, conditions) -> Self:
        filtered_battles = BattleManager(battles=self.battles, filters=conditions)
        return filtered_battles
    
    def add_battles(self, battles: Iterable[Battle]):
        for battle in battles:
            if battle.seq_num not in self.battles:
                self.battles[battle.seq_num] = battle
                
    def to_dataframe(self) -> pd.DataFrame:
        if self.df is not None:
            return self.df
        df = utils.dict_to_dataframe(self.raw_battle_dict)[RAW_COL_ORDER]
        df = df.astype(RAW_TYPE_DICT)
        self.df = df
        return self.df

    def to_pretty_dataframe(self, HM: HeroManager):
        return to_pretty_dataframe(self.to_dataframe(), HM)
    
    def to_performant_df(self, HM: HeroManager) -> pd.DataFrame:
        if self.performant_df is not None:
            return self.performant_df

        df = self.to_dataframe().copy()
        EMPTY = HM.get_from_name("Empty")

        def to_prime(hero_str_id):
            if not hero_str_id or hero_str_id == "None":
                return EMPTY.prime
            return HM.get_from_str_id(hero_str_id).prime

        for col in HERO_COLS:
            df[col] = df[col].apply(to_prime)

        
        for consolidation_col in ["p1_picks", "p2_picks", "p1_prebans", "p2_prebans"]:

            def consolidate_col(row):
                val = 1
                for col in COL_CONSOLIDATION_MAP[consolidation_col]:
                    val *= row[col]
                return val
        
            df[consolidation_col] = df.apply(consolidate_col, axis=1)

        df["grades_1"] = df["grades_1"].apply(lambda league: LEAGUES[league])
        df["grades_2"] = df["grades_2"].apply(lambda league: LEAGUES[league])
        
        df = df.astype(PERFORMANT_TYPE_DICT)
        self.performant_df = df
        return df
    
    def get_general_stats(self, HM: HeroManager) -> dict[str, object]:
        pfdf = self.to_performant_df(HM)
        total_battles = len(pfdf)

        fp_df = pfdf[pfdf['first pick']==1]
        sp_df = pfdf[pfdf['first pick']!=1]

        first_pick_count = len(fp_df)
        second_pick_count = len(sp_df)

        fp_wins = (fp_df['winner'] == 1).sum()
        sp_wins = (sp_df['winner'] == 1).sum()

        fp_r = first_pick_count / total_battles if total_battles > 0 else 0
        sp_r = second_pick_count / total_battles if total_battles > 0 else 0

        fp_wr = fp_wins / first_pick_count if first_pick_count > 0 else 0
        sp_wr = sp_wins / second_pick_count if second_pick_count > 0 else 0

        winrate = (pfdf["winner"] == 1).sum() / total_battles if total_battles > 0 else 0

        NA = "N/A"

        return {
            "first_pick_count"   : first_pick_count,
            "second_pick_count"  : second_pick_count,
            "first_pick_rate"    : to_percent(fp_r) if first_pick_count > 0 else NA,
            "second_pick_rate"   : to_percent(sp_r) if second_pick_count > 0 else NA,
            "first_pick_winrate" : to_percent(fp_wr) if first_pick_count > 0 else NA,
            "second_pick_winrate": to_percent(sp_wr) if second_pick_count > 0 else NA,
            "total_winrate"     : to_percent(winrate) if total_battles > 0 else NA,
            "total_battles"     : total_battles,
            "first_pick_stats"   : get_first_pick_stats(fp_df, HM),
            'preban_stats'      : get_preban_stats(pfdf, HM)
        }
        
    def merge(self, BM: Self):
        self.add_battles(BM.battles.values())
    
    def save_to_parquet(self, file, overwrite=False):
        old_df = None
        if os.path.exists(file):
            old_df = pd.read_parquet(file)
        
        df = self.to_dataframe()
        df = df.reset_index(drop=True)
        if old_df is None or overwrite is True:
            df.to_parquet(file, index=False)
            print(f"Overwriting/Creating battle data in {file}")
        else:
            df = pd.concat([old_df, df], ignore_index=True)
            df = df.drop_duplicates()
            df.to_parquet(file, index=False)
            print(f"Adding to existing battle data in {file}")
            
                        

        
        
        
        

    
            
        
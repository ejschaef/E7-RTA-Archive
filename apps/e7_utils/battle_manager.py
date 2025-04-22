# -*- coding: utf-8 -*-
"""
Created on Sun Mar 30 15:50:47 2025

@author: Grant
"""
from typing import Self, Iterable
import apps.e7_utils.utils as utils
from apps.e7_utils.hero_manager import HeroManager
import pandas as pd
import re
import os

to_percent = lambda flt: str(round(flt * 100, 1)) + "%"

PRETTY_COLUMN_DICT = {
    "Date/Time" : "time",
    "Seq Num" : "seq_num",
    "P1 ID" : "p1_id",
    "P2 ID" : "p2_id",
    "P1 League" : "grades_1",
    "P2 League" : "grades_2",
    "P1 Points" : "scores_1",
    "Win" : "winner",
    "Firstpick" : "firstpick",
    "P1 Preban 1" : "p1_preban_1",
    "P1 Preban 2" : "p1_preban_2",
    "P2 Preban 1" : "p2_preban_1",
    "P2 Preban 2" : "p2_preban_2",
    "P1 Pick 1" : "p1_picks_1",
    "P1 Pick 2" : "p1_picks_2",
    "P1 Pick 3" : "p1_picks_3",
    "P1 Pick 4" : "p1_picks_4",
    "P1 Pick 5" : "p1_picks_5",
    "P2 Pick 1" : "p2_picks_1",
    "P2 Pick 2" : "p2_picks_2",
    "P2 Pick 3" : "p2_picks_3",
    "P2 Pick 4" : "p2_picks_4",
    "P2 Pick 5" : "p2_picks_5",
    "P1 Postban" : "postbans_1",
    "P2 Postban" : "postbans_2",
    }

RAW_TYPE_DICT = {
    "time" : str,
    "seq_num" : str,
    "p1_id" : int,
    "p2_id" : int,
    "grades_1" : str,
    "grades_2" : str,
    "scores_1" : int,
    "scores_2" : int,
    "winner" : int,
    "firstpick" : int,
    "p1_preban_1" : str,
    "p1_preban_2" : str,
    "p2_preban_1" : str,
    "p2_preban_2" : str,
    "p1_picks_1" : str,
    "p1_picks_2" : str,
    "p1_picks_3" : str,
    "p1_picks_4" : str,
    "p1_picks_5" : str,
    "p2_picks_1" : str,
    "p2_picks_2" : str,
    "p2_picks_3" : str,
    "p2_picks_4" : str,
    "p2_picks_5" : str,
    "postbans_1" : str,
    "postbans_2" : str,
    }

RAW_COL_ORDER = [col for col in RAW_TYPE_DICT]

COL_CONSOLIDATION_MAP = {
    'p1_preban' : ('p1_preban_1', 'p1_preban_2'),
    'p2_preban' : ( 'p2_preban_1', 'p2_preban_2'),
    'p1_picks'  : ('p1_picks_1', 'p1_picks_2', 'p1_picks_3', 'p1_picks_4', 'p1_picks_5',),
    'p2_picks'  : ('p2_picks_1', 'p2_picks_2', 'p2_picks_3', 'p2_picks_4', 'p2_picks_5',),
    'postbans'  : ('postbans_1', 'postbans_2'),
    'scores'    : ('scores_1', 'scores_2'),
    'grades'    : ('grades_1', 'grades_2')
}


class Battle:
    
    __slots__ = 'time', 'seq_num', 'p1_id', 'p2_id', \
                'p1_picks', 'p2_picks', 'winner',    \
                'grades', 'scores', 'p1_preban',     \
                'p2_preban', 'postbans', 'firstpick'
                
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
    
    col_replace_dict = {
            "Win" : {1:"W", 2:"L"},
            "Firstpick" : {1:True, 2:False},
        }
    
    df = df.replace(col_replace_dict)
    return df

def to_raw_dataframe(df: pd.DataFrame, HM: HeroManager):
    col_replace_dict = {
            "Win" : {"W":1, "L":2},
            "Firstpick" : {True:1, False:2, "True":1, "False":1},
        }
    
    df = df.replace(HM.name_str_map)
    df = df.replace(col_replace_dict)
    df["scores_2"] = -1
    
    df = df.rename(columns=PRETTY_COLUMN_DICT)
    df = df[RAW_COL_ORDER]
    return df
    
    
class BattleManager:
    
    def __init__(self, battles=None):
        self.df = None
        self.pretty_replace_hero_dict = None
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
    
    @property
    def raw_battle_dict(self):
        return {seq_num : battle.to_dict() for seq_num, battle in self.battles.items()}
    
    def __contains__(self, battle: Battle):
        return battle in self.battles
    
    def __iter__(self):
        yield from self.battles

    def filter_battles(self, conditions) -> Self:
        filtered = []
        for battle in self.battles.values():
            if not all(condition(battle) for condition in conditions):
                continue
            else:
                filtered.append(battle)
        return BattleManager(filtered)
    
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
            
    def query_stats(self, conditions: list[callable]) -> float:
        if len(self.battles) == 0:
            return None
        filtered = []
        for battle in self.battles.values():
            if not all(condition(battle) for condition in conditions):
                continue
            else:
                filtered.append(battle)
                
        games_won = sum(b.winner == 1 for b in filtered)
        games_appeared = len(filtered)
        appearance_rate = len(filtered) / len(self.battles)
        winrate = games_won / len(filtered) if len(filtered) != 0 else 0

        
        return {
            'games_won'       : games_won,
            'games_appeared'  : games_appeared,
            'total_games'     : len(self.battles),
            'appearance_rate' : to_percent(appearance_rate),
            'win_rate'        : to_percent(winrate),
            '+/-'             : 2 * games_won - games_appeared
            }
                        

        
        
        
        

    
            
        
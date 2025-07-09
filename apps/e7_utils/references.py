# -*- coding: utf-8 -*-
"""
Created on Sun Apr  7 13:06:09 2024

@author: Grant
"""
import numpy as np

WORLD_CODES = frozenset({"world_kor", "world_global", "world_jpn", "world_asia", "world_eu"})

TO_INDEX = [f"p{i1}_pick{i2}" for i1 in (1,2) for i2 in (1,2,3,4,5)] + ["p1_preban1", "p1_preban2", "p2_preban1", "p2_preban2", "p1_postban", "p1_grade", "p2_grade"]

LEAGUES = {'master': 10, 'champion': 14, 'bronze': 4, 'gold': 8, 'silver': 6, 'challenger': 12, 'warlord': 16, 'emperor': 18, 'legend': 20}

PRETTY_COLUMN_DICT = {
    "Date/Time" : "time",
    "Seq Num" : "seq_num",
    "P1 ID" : "p1_id",
    "P2 ID" : "p2_id",
    "P1 League" : "grades_1",
    "P2 League" : "grades_2",
    "P1 Points" : "scores_1",
    "Win" : "winner",
    "First Pick" : "first_pick",
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
    "first_pick" : int,
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

PERFORMANT_TYPE_DICT = {
    "time" : str,
    "seq_num" : np.int64,
    "p1_id" : np.int64,
    "p2_id" : np.int64,
    "grades_1" : np.int8,
    "grades_2" : np.int8,
    "scores_1" : np.int16,
    "scores_2" : np.int16,
    "winner" : np.int8,
    "first_pick" : np.int8,
    "p1_preban_1" : np.int32,
    "p1_preban_2" : np.int32,
    "p2_preban_1" : np.int32,
    "p2_preban_2" : np.int32,
    "p1_picks_1" : np.int16,
    "p1_picks_2" : np.int16,
    "p1_picks_3" : np.int16,
    "p1_picks_4" : np.int16,
    "p1_picks_5" : np.int16,
    "p2_picks_1" : np.int16,
    "p2_picks_2" : np.int16,
    "p2_picks_3" : np.int16,
    "p2_picks_4" : np.int16,
    "p2_picks_5" : np.int16,
    "postbans_1" : np.int16,
    "postbans_2" : np.int16,
    "p1_picks" : object,
    "p2_picks" : object,
    "p1_prebans" : np.int64,
    "p2_prebans" : np.int64,
    }

COL_CONSOLIDATION_MAP = {
    'p1_prebans' : ('p1_preban_1', 'p1_preban_2'),
    'p2_prebans' : ( 'p2_preban_1', 'p2_preban_2'),
    'p1_picks'  : ('p1_picks_1', 'p1_picks_2', 'p1_picks_3', 'p1_picks_4', 'p1_picks_5',),
    'p2_picks'  : ('p2_picks_1', 'p2_picks_2', 'p2_picks_3', 'p2_picks_4', 'p2_picks_5',),
    'postbans'  : ('postbans_1', 'postbans_2'),
    'scores'    : ('scores_1', 'scores_2'),
    'grades'    : ('grades_1', 'grades_2')
}

HERO_COLS = [col for col in RAW_TYPE_DICT if "picks" in col or "ban" in col]
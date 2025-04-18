# -*- coding: utf-8 -*-
"""
Created on Sun Apr  7 13:06:09 2024

@author: Grant
"""

WORLD_CODES = frozenset({"world_kor", "world_global", "world_jpn", "world_asia", "world_eu"})


TO_INDEX = [f"p{i1}_pick{i2}" for i1 in (1,2) for i2 in (1,2,3,4,5)] + ["p1_preban1", "p1_preban2", "p2_preban1", "p2_preban2", "p1_postban", "p1_grade", "p2_grade"]

GRADE_TO_NUM_MAP = {"bronze":1, "silver":2, "gold":3, "master":4, "challenger":5, "champion":6, "emperor":7, "legend":8}



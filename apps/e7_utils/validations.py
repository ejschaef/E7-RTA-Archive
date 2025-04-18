# -*- coding: utf-8 -*-
"""
Created on Sun Apr  7 13:03:19 2024

@author: Grant
"""

import pandas as pd
from apps.e7_utils.battle_manager import RAW_COL_ORDER, PRETTY_COLUMN_DICT
from apps.e7_utils.user_manager import UserManager
from apps.exceptions.exception import DataValidationException
import re


def validate_battle_df(df: pd.DataFrame, UM=None) -> bool | str:
    if UM is None:
        UM = UserManager()

    #make sure columns match expected format
    if list(df.columns) != list(PRETTY_COLUMN_DICT):
        for i, (c1, c2) in enumerate(zip(df.columns, PRETTY_COLUMN_DICT)):
            if c1 != c2:
                msg = f"Unexpected column in file at index: {i}, '{c1}' Received, '{c2}' expected. Please check csv format."
                raise DataValidationException(msg)
        msg = f"Num columns do not match expected structure: {len(df.columns)} passed, {len(PRETTY_COLUMN_DICT)} expected. Please check csv format."
        raise DataValidationException(msg)
    
    #The file should only have one player ID as P1 (battles should all be fore one user)
    p1_users = list(df["P1 ID"].unique())
    if len(p1_users) != 1:
        msg = f"Uploaded battles should only be for one user (exactly one value in 'P1 ID' column); Got: {[str(elt) for elt in p1_users]}"
        raise DataValidationException(msg)
    
    user_id = p1_users[0]

    #validate user format:
    if not re.match("^[0-9]*$", str(user_id)):
        msg = f"User ID in 'P1 ID' column must only contain numerical digits; Got: {user_id}"
        raise DataValidationException(msg)

    return True


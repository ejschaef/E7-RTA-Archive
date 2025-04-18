import pandas as pd
import os
from flask import sessions, current_app
from apps.exceptions.exception import DataValidationException
from apps.e7_utils.validations import validate_battle_df
from apps.e7_utils.user_manager import UserManager

def read_battle_csv(csv_file, user_manager: UserManager):
    try:
        df = pd.read_csv(csv_file)
    except Exception as e:
        msg = "Could not read csv file as dataframe: {e}"
        raise DataValidationException(msg)
    print("Passed first check")

    #check format and contents are same as what can be downloaded from website
    
    validate_battle_df(df, user_manager) #will throw DataValidationException
    
    return df
    

    




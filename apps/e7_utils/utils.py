# -*- coding: utf-8 -*-
"""
Created on Sun Apr  7 13:03:19 2024

@author: Grant
"""

import json
import pickle
import pandas as pd
import requests
import sys
from types import ModuleType, FunctionType
from gc import get_referents


# Custom objects know their class.
# Function objects seem to know way too much, including modules.
# Exclude modules as well.
BLACKLIST = type, ModuleType, FunctionType


def getsize(obj):
    """sum size of object & members."""
    if isinstance(obj, BLACKLIST):
        raise TypeError('getsize() does not take argument of type: '+ str(type(obj)))
    seen_ids = set()
    size = 0
    objects = [obj]
    while objects:
        need_referents = []
        for obj in objects:
            if not isinstance(obj, BLACKLIST) and id(obj) not in seen_ids:
                seen_ids.add(id(obj))
                size += sys.getsizeof(obj)
                need_referents.append(obj)
        objects = get_referents(*need_referents)
    return size
    
def load_json_from_url(url):
    response = requests.get(url)
    if response.ok:
        json_data = json.loads(response.text)
        return json_data
    else:
        raise Exception(f"Failed to fetch JSON data from {url}. Status code: {response.status_code}")


def list_of_dicts_to_dataframe(data, index_key=None):
    """
    Converts a list of dictionaries to a pandas DataFrame, using a specified key as the index.
    
    Args:
      data: A list of dictionaries, where each dictionary represents a row.
      index_key: The key in the dictionaries to use as the DataFrame index.
    
    Returns:
      A pandas DataFrame.
    """
    if not data:
      return pd.DataFrame()
  
    if index_key is not None:
        index_values = [d.pop(index_key) for d in data]
        df = pd.DataFrame(data, index=index_values)
    else:
        df = pd.DataFrame(data)
    
    return df

def dict_to_dataframe(data_dict, index=False) -> pd.DataFrame:
    """
    Converts a dictionary mapping indices to dictionaries of rows into a pandas DataFrame.
    Also, for any list or tuple in the row, converts them into multiple columns.

    Args:
        data_dict (dict): A dictionary where keys are indices and values are dictionaries representing rows.

    Returns:
        pandas.DataFrame: A DataFrame constructed from the input dictionary.
    """

    rows = []
    for index, row_dict in data_dict.items():
        row = row_dict.copy()  # Create a copy to avoid modifying the original dict
        if index:
            row['index'] = index  # Add the index as a column
        rows.append(row)

    df = pd.DataFrame(rows)

    # Handle lists and tuples in columns
    
    #Get list of list/tuple columns and the num of columns they need to be split into
    new_cols = {}
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, (list, tuple))).any():
            max_len = df[col].apply(lambda x: len(x) if isinstance(x, (list, tuple)) else 0).max()
            if max_len > 0:
                new_cols[col] = max_len

    for col, max_len in new_cols.items():
        new_col_names = [f"{col}_{i+1}" for i in range(max_len)]
        df[new_col_names] = pd.DataFrame(df[col].tolist(), index=df.index)
        df = df.drop(col, axis=1)

    return df


def load_pickle(file):
    with open(file, 'rb') as f:
        return pickle.load(f)
    
def save_pickle(data, file):
    with open(file, 'wb') as f:
        pickle.dump(data, f)
        
        
if __name__ == "__main__":
    pass
        
    
    
    
        
    
        



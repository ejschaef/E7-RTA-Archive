# -*- coding: utf-8 -*-
"""
Created on Sun Apr  7 13:03:19 2024

@author: Grant
"""

import os
import datetime
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

def is_created_today(file_path):
    # Get the creation time of the file
    create_time = datetime.datetime.fromtimestamp(os.path.getctime(file_path))

    # Get today's date
    today = datetime.datetime.now().date()

    # Check if the creation date is today
    return create_time.date() == today


def save_json(data, file):
    with open(file, 'w') as f:
        json.dump(data, f)
        
def load_json(file):
    with open(file, 'r') as f:
        return json.load(f)
    
def save_pickle(data, file):
    with open(file, 'wb') as f:
        pickle.dump(data, f)
        
def load_pickle(file):
    with open(file, 'rb') as f:
        return pickle.load(f)
    
def load_json_from_url(url):
    response = requests.get(url)
    json_data = json.loads(response.text)
    return json_data


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
    
    #Get list of list/tuple columsn and the num of columns they need to be split into
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


def one_hot_encode(df, column_name, prefix=None):
    """
    Perform one-hot encoding on a categorical column in a DataFrame.
    
    Parameters:
        df (DataFrame): The input DataFrame.
        column_name (str): The name of the categorical column to one-hot encode.
        
    Returns:
        DataFrame: The DataFrame with the specified column one-hot encoded.
    """
    # Perform one-hot encoding
    if prefix is None:
        prefix = f"{column_name}"
    encoded_df = pd.get_dummies(df, columns=[column_name], prefix=prefix)
    return encoded_df


DEFAULT_SAVER_DIRECTORY = "Dynamically Saved Files"


class InfoSaver:
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, records = None):
        self.directory = directory
        self.fname = fname if '.pickle' in fname else fname + '.pickle'
        self.path = os.path.join(self.directory, self.fname)
        self.archive_path = os.path.join(self.directory, "archive " + self.fname)
        self.records = records
        
    @property
    def name(self):
        return os.path.basename(self.path)
        
    def save(self):
        os.makedirs(self.directory, exist_ok=True)
        save_pickle(self, os.path.join(self.path))
        
    def archive(self):
        print(f"Overwriting archive for {self.name}")
        os.makedirs(self.directory, exist_ok=True)
        save_pickle(self, os.path.join(self.archive_path))
        
    def scrub(self):
        self.records = type(self.records)()
        self.save()
        print(f"Scrubbed data from {self.name}")
    
    def new(fname, directory = DEFAULT_SAVER_DIRECTORY, records=None, new=False):
        instance = InfoSaver(fname, directory, records=records)
        if os.path.exists(instance.path) and new is False:
            print(f"Loaded instance: {instance.name} from memory")
            return load_pickle(instance.path)
        else:
            print(f"Loaded new instance: {instance.name}")
            return instance
        
    def __len__(self):
        return len(self.records)
        
    def __iter__(self):
        yield from self.records
        
    def __contains__(self, item):
        return item in self.records
    
    def insert(self, item):
        raise NotImplementedError("Insert not implemented for base InfoSaver class; Please use a more specific InfoSaver type such as ListSaver or SetSaver")
    
    def insert_many(self, new_records):
        for item in new_records:
            self.insert(item)
            
    def overwrite(self, new_records):
        self.scrub()
        self.insert_many(new_records)
        self.save()
                    
    def fix_records_bug(self):
        self.records = self.record
        delattr(self, 'record')
        self.save()
                 
class ListSaver(InfoSaver):
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=[], new=new)
        vars(self).update(vars(instance))
       
    def insert(self, item):
        self.records.append(item)
        
class SetSaver(InfoSaver):
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=set(), new=new)
        vars(self).update(vars(instance))
       
    def insert(self, item):
        self.records.add(item)

class DictSaver(InfoSaver):
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=dict(), new=new)
        vars(self).update(vars(instance))
        
    def __getitem__(self, key):
        return self.records[key]
    
    def __setitem__(self, key, val):
        self.insert(key, val)
       
    def insert(self, key, value):
        self.records[key] = value
        
        
        
if __name__ == "__main__":
    saver = ListSaver("test", new=True)
    # saver.insert("p")
    # saver.insert("g")
    # saver.insert("x")
    # saver.save()
    pass
        
    
    
    
        
    
        



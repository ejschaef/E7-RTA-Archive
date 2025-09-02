import os
from apps.config import Config
from apps.e7_utils.utils import load_pickle, save_pickle

DEFAULT_SAVER_DIRECTORY = os.path.join(Config.APP_DATA_PATH, "Info Savers")


class InfoSaver:
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, records = None):
        self.directory = directory
        self.fname = fname if '.pickle' in fname else fname + '.pickle'
        self.path = os.path.join(self.directory, self.fname)
        self.records = records
        
    @property
    def name(self):
        return os.path.basename(self.path)
        
    def save(self):
        os.makedirs(self.directory, exist_ok=True)
        save_pickle(self, os.path.join(self.path))
        
    def scrub(self):
        self.records = type(self.records)()
        self.save()
        print(f"Scrubbed data from {self.name}")
    
    @classmethod
    def new(cls, fname, directory = DEFAULT_SAVER_DIRECTORY, records=None, new=False):
        instance = InfoSaver(fname, directory, records=records)
        if os.path.exists(instance.path) and new is False:
            print(f"Loaded instance: {instance.name} from memory")
            obj = load_pickle(instance.path)
            assert isinstance(obj, InfoSaver), "Pickle did not decode to an InfoSaver"
            return obj
        else:
            print(f"Loaded new instance: {instance.name}")
            return instance
        
    def length(self):
        return len(self.records)
        
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
                 
class ListSaver(InfoSaver):
    records: list
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=[], new=new)
        vars(self).update(vars(instance))
       
    def insert(self, item):
        self.records.append(item)

    def remove(self, item):
        self.records.remove(item)
        
class SetSaver(InfoSaver):
    records: set
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=set(), new=new)
        vars(self).update(vars(instance))
       
    def insert(self, item):
        self.records.add(item)

    def remove(self, item):
        self.records.remove(item)

class DictSaver(InfoSaver):
    records: dict
    
    def __init__(self, fname, directory = DEFAULT_SAVER_DIRECTORY, new=False):
        instance = InfoSaver.new(fname, directory, records=dict(), new=new)
        vars(self).update(vars(instance))
        
    def __getitem__(self, key):
        return self.records[key]
    
    def __setitem__(self, key, val):
        self.insert(key, val)
       
    def insert(self, key, value):
        self.records[key] = value

    def remove(self, key):
        del self.records[key]
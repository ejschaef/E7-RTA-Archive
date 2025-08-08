# -*- coding: utf-8 -*-
"""
Created on Sun Mar 30 13:54:07 2025

@author: Grant
"""

import apps.e7_utils.references as refs
import apps.e7_utils.utils as utils

def get_all_user_data(world_code: str) -> list:
    """
    Gets the json containing all users for the given world code (ie server)
    """
    if not world_code in refs.WORLD_CODES:
        print(f"No Data returned: code {world_code} not in {refs.WORLD_CODES}")
        return
    world_code = world_code.replace("world_", "")
    api_url = f"https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_{world_code}.json"
    result = utils.load_json_from_url(api_url)
    if result is None:
        print(f"No User Data returned: code {world_code} not in {refs.WORLD_CODES}")
        return None
    return result['users']

class User:
    __slots__ = 'id', 'name', 'level', 'world_code'
    
    def __init__(self, user_json_instance, world_code):
        self.id = int(user_json_instance["nick_no"])
        self.name = user_json_instance["nick_nm"]
        self.level = int(user_json_instance['rank'])
        self.world_code = world_code

    def to_dict(self):
        
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level,
            "world_code": self.world_code
        }

class UserManager:
    
    def __init__(self, load_all=False):
        self.world_code_dict = {}
        self.id_dict = {}
        self.name_server_dict = {}
        self.name_duplicates = 0
        if load_all:
            self.load_all()
        
    def __iter__(self):
        for user_list in self.world_code_dict.values():
            for user in user_list:
                yield user
        
    def load_server_users(self, world_code) -> list[User]:
        user_data = get_all_user_data(world_code)
        if user_data is None:
            raise Exception(f"No User Data returned: code {world_code} not in {refs.WORLD_CODES}")
        id_dict = {}
        name_server_dict = {}
        user_objs = []
        for user in user_data:
            user_obj = User(user, world_code)
            user_objs.append(user_obj)
            id_dict[user_obj.id] = user_obj
            name_server_dict[(user_obj.name.lower(), world_code)] = user_obj
            # assert user_obj.id not in self.id_dict, f"Duplicate user id: {user_obj.id}"
            if (user_obj.name.lower(), world_code) in self.name_server_dict:
                self.name_duplicates += 1
                print(f"\tDuplicate name: {user_obj.name} on server {world_code}")
        self.id_dict.update(id_dict)
        self.name_server_dict.update(name_server_dict)
        self.world_code_dict[world_code] = user_objs
        return user_objs
        
    def load_all(self, skip_dupicates=False):
        for world_code in refs.WORLD_CODES:
            if skip_dupicates is True and world_code in self.world_code_dict:
                continue
            print(f"Loading user from server: {world_code}...")
            self.load_server_users(world_code)
            print(f"   Loaded {len(self.world_code_dict[world_code])} users from server: {world_code}")
    
    def get_user_from_name(self, user_name, world_code=None, all_servers=True) -> User | None:
        if world_code is None:
            if all_servers is True:
                self.load_all(skip_dupicates=True)
            for world_code in self.world_code_dict.keys():
                if (user_name.lower(), world_code) in self.name_server_dict:
                    return self.name_server_dict[(user_name.lower(), world_code)]
        else:
            if world_code not in self.world_code_dict:
                self.load_server_users(world_code)
            return self.name_server_dict.get((user_name.lower(), world_code))
                
    def get_user_from_id(self, id) -> User | None:
        self.load_all(skip_dupicates=True)
        return self.id_dict.get(id)
    


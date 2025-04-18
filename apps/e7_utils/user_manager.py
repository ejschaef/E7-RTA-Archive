# -*- coding: utf-8 -*-
"""
Created on Sun Mar 30 13:54:07 2025

@author: Grant
"""

import apps.e7_utils.references as refs
import apps.e7_utils.utils as utils
import os

def get_all_user_data(world_code: str):
    """
    Gets the json containing all users for the given world code (ie server)
    """
    if not world_code in refs.WORLD_CODES:
        print(f"No Data returned: code {world_code} not in {refs.WORLD_CODES}")
        return
    world_code = world_code.replace("world_", "")
    api_url = f"https://static.smilegatemegaport.com/gameRecord/epic7/epic7_user_world_{world_code}.json"
    return utils.load_json_from_url(api_url)["users"]

class User:
    __slots__ = 'id', 'name', 'level', 'world_code'
    
    def __init__(self, user_json_instance, world_code):
        self.id = int(user_json_instance["nick_no"])
        self.name = user_json_instance["nick_nm"]
        self.level = int(user_json_instance['rank'])
        self.world_code = world_code
        
def get_lvl_70_users(world_code, load=False):
    for code in refs.WORLD_CODES:
        if world_code in code:
            world_code = code
            break
    file = refs.USER_FILES[world_code]
    if os.path.exists(file) and utils.is_created_today(file) and load:
        return utils.load_pickle(file)
    else:
        users =  get_all_user_data(world_code)
    users = [User(user, world_code) for user in users]
    utils.save_pickle(users, file)
    return [u for u in users if u.level == 70]


class UserManager:
    
    def __init__(self):
        self.world_code_dict = {}
        
    def __iter__(self):
        for user_list in self.world_code_dict.values():
            for user in user_list:
                yield user
        
    def load_server_users(self, world_code):
        user_data = get_all_user_data(world_code)
        users = [User(user, world_code) for user in user_data]
        self.world_code_dict[world_code] = users
        return users
        
    def load_all(self, skip_dupicates=False):
        for world_code in refs.WORLD_CODES:
            if world_code in self.world_code_dict and skip_dupicates is True:
                continue
            self.load_server_users(world_code)
    
    def get_user_from_name(self, user_name, world_code=None, all_servers=True) -> User | None:
        if world_code is None:
            if all_servers is True:
                self.load_all(skip_dupicates=True)
            for user in self:
                if user.name.lower() == user_name.lower():
                    return user
        else:
            if world_code not in self.world_code_dict:
                self.load_server_users(world_code)
            for user in self.world_code_dict[world_code]:
                if user.name.lower() == user_name.lower():
                    return user
                
    def get_user_from_id(self, id, world_code=None, all_servers=True) -> User | None:
        if world_code is None:
            if all_servers is True:
                self.load_all(skip_dupicates=True)
        if world_code is None:
            for user in self:
                if user.id == id:
                    return user
        else:
            if world_code not in self.world_code_dict:
                self.load_server_users(world_code)
            for user in self.world_code_dict[world_code]:
                if user.id == id:
                    return user
    


# -*- coding: utf-8 -*-
"""
Created on Sat Apr 12 18:17:13 2025

@author: Grant
"""

from apps.e7_utils.user_manager import User
from apps.e7_utils.battle_manager import BattleManager
from apps.e7_utils.hero_manager import HeroManager
import requests
import ast

def get_battle_data_for_user(user_obj: User):
    """
    returns the json of epic7.gg data for a specific user
    """
    user_id = user_obj.id
    world_code = user_obj.world_code
    api_url = f"https://epic7.gg.onstove.com/gameApi/getBattleList?nick_no={user_id}&world_code={world_code}&lang=en&season_code=recent"
    response = requests.post(api_url)
    return response.json()

def transform_battle_data(raw_battle_data):
    """
    Ingests one battle from the query of battle data for a particular user and returns
    the data transformed into more usable format
    """
    data = raw_battle_data
 
    p1_team_info = ast.literal_eval(data['teamBettleInfo'].replace('"my_team":', ""))
    p2_team_info = ast.literal_eval(data['teamBettleInfoenemy'].replace('"my_team":', ""))
    
    p1_preban = ast.literal_eval(data["prebanList"][14:])
    p2_preban = ast.literal_eval(data["prebanListEnemy"][14:])
    # prebans = [ban for ban in set(p1_preban + p2_preban) if ban != '']
    
    #indicates which hero from the players side got postbanned (ie p1_postbanned is p1's hero that was postbanned by p2)
    p1_postbanned = next(filter(lambda l: l['ban'] == 1, data['my_deck']['hero_list']), None)
    p1_postbanned = p1_postbanned['hero_code'] if p1_postbanned is not None else None
    p2_postbanned = next(filter(lambda l: l['ban'] == 1, data['enemy_deck']['hero_list']), None)
    p2_postbanned = p2_postbanned['hero_code'] if p2_postbanned is not None else None
    
    check_first_pick = lambda: 1 if any(l['first_pick'] == 1 for l in data['my_deck']['hero_list']) else 2
    
    output = {
            'time'     : data['battle_day'],
            'seq_num'  : data['battle_seq'],
            'p1_id'    : data['nicknameno'],
            'p2_id'    : data['matchPlayerNicknameno'],
            'p1_picks' : tuple(hero['hero_code'] for hero in p1_team_info), #these picks will be in correct order
            'p2_picks' : tuple(hero['hero_code'] for hero in p2_team_info),
            'winner'   : data['iswin'], #will be 1 or 2 corresponding to p1, p2
            'grades'   : (data["grade_code"], data["enemy_grade_code"]),
            'scores'   : (data["winScore"], -1),
            'p1_preban': p1_preban,
            'p2_preban': p2_preban,
            'postbans' : (p2_postbanned, p1_postbanned), #we invert to indicate the choice each player made.
            'firstpick': check_first_pick() #1 if p1 got firstpick else 2
            }
    
    return output

def get_battles(user: User) -> BattleManager:
    """
    Queries last 100 battles for user, then returns the result as transformed usable data
    as list
    """
    data = get_battle_data_for_user(user)['result_body']
    battles = [transform_battle_data(battle) for battle in data["battle_list"]]
    return BattleManager.from_raw_battles_list(battles)


def build_hero_stats(battles: BattleManager, HM: HeroManager):
    
    #get stats dataframe for user game statistics when hero is on user's team
    player_hero_stats = []
    
    for hero in HM.heroes:
        
        conditions = [
            lambda battle: hero.str_id in battle.p1_picks
            ]
        
        stats = battles.query_stats(conditions)
        stats['hero'] = hero.name
        if stats['appearance_rate'] == 0:
            continue
        player_hero_stats.append(stats)
    
    
    #get stats dataframe for user game statistics when hero is on opponents team
    enemy_hero_stats = []
    
    for hero in HM.heroes:
        
        conditions = [
            lambda battle: hero.str_id in battle.p2_picks
            ]
        
        stats = battles.query_stats(conditions)
        stats['hero'] = hero.name
        if stats['appearance_rate'] == 0:
            continue
        enemy_hero_stats.append(stats)
    
    
    return player_hero_stats, enemy_hero_stats

def get_hero_stats(user: User, HM: HeroManager):
    battles = get_battles(user)
    return build_hero_stats(battles, HM)
    

if __name__ == "__main__":
    
    from user_manager import UserManager
    from hero_manager import HeroHanager
    
    UM = UserManager()
    
    user = UM.get_user_from_name('octothorpe', world_code='world_global')
    
    battles = get_battles(user)
    
    stats = build_hero_stats(battles)
    

    






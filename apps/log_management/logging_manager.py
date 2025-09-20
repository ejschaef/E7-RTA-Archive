import os
from dotenv import load_dotenv
import requests
import ast
import datetime as dt
from typing import Generator
from enum import Enum

# THIS FILE IS MEANT TO BE RUN INDEPENDENTLY FROM THE APP WITHIN ITS OWN DIRECTORY

os.chdir("../../")

from apps.services.request_headers import generate_services_headers
from apps.services.api_key_names import ApiKeyNames

load_dotenv()

DEV = False

if DEV:
    URL = "http://localhost"
else:
    URL = "https://E7-RTA-Archive.cc"
    
GET_LOGS_URL = f"{URL}/services/dump_logs"
DELETE_LOGS_URL = f"{URL}/services/delete_logs"

BATTLE_QUERY_API_FN = "rs_get_battle_data"

API_KEY_ID = ApiKeyNames.SERVICES_KEY_ID

STATIC_HEADERS = {
    "User-Agent"  : "log-getter",
    }

create_headers = lambda: STATIC_HEADERS | generate_services_headers(API_KEY_ID)

def get_logs() -> dict[str, list[dict]]:
    """
    Fetches logs from the specified logging service endpoint.

    Returns:
        dict: A dictionary containing the logs grouped by filename if the request is successful

    Raises:
        Exception: If the request to fetch logs fails, an exception is raised
        with the status code of the failed request.
    """
    response = requests.get(GET_LOGS_URL, headers=create_headers())
    if response.ok:
        data = response.json()
        return data['logs']
    else:
        raise Exception(f"Failed to fetch logs from {GET_LOGS_URL}. Status Code: {response.status_code}")

def delete_logs() -> bool:
    """
    Deletes the logs from the server; server will be left with one log entry of the deletion.

    Returns:
        bool: A boolean indicating the success of the request
    """
    response = requests.get(DELETE_LOGS_URL, headers=create_headers())
    return response.ok

class LOG_KEYS:
    IP   = "ip"
    URL  = "url"
    TIME = "timestamp"
    MSG  = "msg"
    

class LogManager:

    def __init__(self):
        self.logs: dict = None
        self.stats: dict = {}
        self.users = set()
        self.total_unique_users = 0
        self.min_time_utc = None

    def delete_logs(self) -> None:
        result = delete_logs()
        if result is True:
            print("Logs Deleted")
        else:
            print("Failed to delete logs")
            
    def iter_logs(self) -> Generator[dict, None, None]:
        for log_file_logs in self.logs.values():
            yield from log_file_logs

    def get_logs(self) -> dict[str, list]:
        self.logs = get_logs()
        return self.logs
    
    def compute_stats(self) -> None:
        if self.logs is None:
            raise Warning("No logs found")
        self.__compute_ip_stats()
        self.__compute_queried_users_stats()
        self.__compute_min_time()
        self.total_unique_users = len(self.users)
        
        
    def __compute_ip_stats(self) -> None:
        results_dict = {}
        for log in self.iter_logs():
            if not LOG_KEYS.IP in log:
                continue
            ip = log[LOG_KEYS.IP]
            url = log[LOG_KEYS.URL].replace("www.", "")
            results_dict.setdefault(url, {})
            results_dict[url][ip] = results_dict[url].get(ip, 0) + 1
            self.users.add(ip)
        self.stats["IP Stats"] = results_dict
        
    def __compute_queried_users_stats(self) -> None:
        results_dict = {}
        for log in self.iter_logs():
            if not log["fnName"] == BATTLE_QUERY_API_FN:
                continue
            call_info = ast.literal_eval(log[LOG_KEYS.MSG])
            user_id = call_info.get("id", "ERROR")
            server = call_info.get("world", "ERROR")
            key = (user_id, server)
            results_dict[key] = results_dict.get(key, 0) + 1
        self.stats["Queried Users Stats"] = results_dict
        
    def __compute_min_time(self) -> None:
        times = []
        for log in self.iter_logs():
            times.append(
                dt.datetime.fromisoformat(log[LOG_KEYS.TIME])
            )
        if len(times) == 0:
            self.min_time = "N/A"
        else:
            self.min_time_utc = min(times)
        
repeat_num = 80
bar = lambda: print(f"{'='*repeat_num}\n")
small_bar = lambda: print("-"*repeat_num)
newline = lambda: print("")

class COMMANDS(str, Enum):
    VIEW_LOGS = "view logs"
    VIEW_MSGS = "view log msgs"
    IP_STATS = "view ip stats"
    QUERIED_USERS = "view queried users"
    DELETE_LOGS = "delete logs"
    REFRESH = "refresh"
    EXIT = "exit"


PREFIX = "\t"
            
def greet():
    bar()
    print("Welcome to the Log Manager CLI")  
    bar()
    print("Available commands:")      
    for command in COMMANDS:
        print(PREFIX + command)
        
def process_input(inp: str, log_manager: LogManager):
    bar()
    command = inp.lower().strip()
    if command not in (cmd.value for cmd in COMMANDS):
        print("Command invalid; please refer to valid commands.")
    elif command == COMMANDS.EXIT.value:
        return True
    else:
        fn_name = f"handle_{command.replace(' ', '_')}"
        if not fn_name in globals():
            print("Command not implemented")
        else:  
            globals()[fn_name](log_manager)

def handle_view_logs(log_manager: LogManager):
    print("Logs:")
    for file, logs in log_manager.logs.items():
        small_bar()
        print(PREFIX + file)
        small_bar()
        for log in logs:
            print(PREFIX*2 + str(log))

def handle_view_log_msgs(log_manager: LogManager):
    print("Logs:")
    for file, logs in log_manager.logs.items():
        small_bar()
        print(PREFIX + file)
        small_bar()
        for log in logs:
            log = f"Log: {log.get('msg', 'No Message Found')}"
            print(PREFIX*2 + str(log))

def handle_view_ip_stats(log_manager: LogManager):
    print("IP Stats:")
    small_bar()
    newline()
    total_users = log_manager.total_unique_users
    print(PREFIX + f"Total Unique IPs: {total_users}")
    stats = log_manager.stats["IP Stats"]
    for endpoint, stats_map in stats.items():
        newline()
        print(PREFIX + endpoint)
        newline()
        for ip, count in stats_map.items():
            print(PREFIX*2 + f"IP: {ip[:20]} made {count} total API calls")
        small_bar()
        
def handle_refresh(log_manager: LogManager):
    log_manager.get_logs()
    log_manager.compute_stats()
    print("Logs refreshed.")

def handle_view_queried_users(log_manager: LogManager):
    print("Queried User Stats:")
    small_bar()
    stats = log_manager.stats["Queried Users Stats"]
    stats = list(stats.items())
    stats.sort(reverse=True, key= lambda t: t[1])
    newline()
    for (uid, server), n_queries in stats:
        print(PREFIX + f"<UID: {uid}, Server: {server}> was queried {n_queries} times")
       
def handle_delete_logs(log_manager: LogManager):
    confirmation = input("Confirm Deletion Y/N: ")
    if confirmation.lower() == "y":
        log_manager.delete_logs()
    else:
        print("Skipping deletion.")
            

def run_log_repl(log_manager: LogManager):
    log_manager.get_logs()
    log_manager.compute_stats()
    greet()
    bar()
    done = False
    while not done:
        inp = input("Input Command: ")
        done = process_input(inp, log_manager)
        bar()
                
        
if __name__ == "__main__":
    log_manager = LogManager()
    run_log_repl(log_manager)
    

    
import os
from dotenv import load_dotenv
import requests
import ast
import datetime as dt

# THIS FILE IS MEANT TO BE RUN INDEPENDENTLY FROM THE APP WITHIN ITS OWN DIRECTORY

os.chdir("../../")

from apps.services.request_headers import generate_services_headers
from apps.services.api_key_names import ApiKeyNames

load_dotenv()

DEV = True

if DEV:
    URL = "http://localhost"
else:
    URL = "https://Ventus-Archive.org"
    
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
        print("Got Logs")
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

    def delete_logs(self):
        result = delete_logs()
        if result is True:
            print("Logs Deleted")
        else:
            print("Failed to delete logs")
            
    def iter_logs(self):
        for log_file_logs in self.logs.values():
            yield from log_file_logs

    def get_logs(self):
        self.logs = get_logs()
        return self.logs
    
    def compute_stats(self):
        if self.logs is None:
            raise Warning("No logs found")
        self.__compute_ip_stats()
        self.__compute_queried_users_stats()
        self.__compute_min_time()
        self.total_unique_users = len(self.users)
        
        
    def __compute_ip_stats(self):
        results_dict = {}
        for log in self.iter_logs():
            if not LOG_KEYS.IP in log:
                continue
            ip = log[LOG_KEYS.IP]
            url = log[LOG_KEYS.URL]
            results_dict.setdefault(url, {})
            results_dict[url][ip] = results_dict[url].get(ip, 0) + 1
            self.users.add(ip)
        self.stats["IP Stats"] = results_dict
        print("Computed IP Stats")
        
    def __compute_queried_users_stats(self):
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
        print("Computed Queried Users Stats")
        
    def __compute_min_time(self):
        times = []
        for log in self.iter_logs():
            times.append(
                dt.datetime.fromisoformat(log[LOG_KEYS.TIME])
            )
        self.min_time = min(times)
                
        
if __name__ == "__main__":
    log_manager = LogManager()
    logs = log_manager.get_logs()
    log_manager.compute_stats()
    

    
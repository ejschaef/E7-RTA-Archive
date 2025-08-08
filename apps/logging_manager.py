import os
from dotenv import load_dotenv
import requests

# THIS FILE IS MEANT TO BE RUN INDEPENDENTLY FROM THE APP WITHIN ITS OWN DIRECTORY

os.chdir("..")

from apps.services.signature import generate_services_headers

load_dotenv()

DEV = True

if DEV:
    URL = "http://localhost"
else:
    URL = "https://Ventus-Archive.org"
    
GET_LOGS_URL = f"{URL}/services/dump_logs"
DELETE_LOGS_URL = f"{URL}/services/delete_logs"

API_KEY = "SERVICES_KEY"

HEADERS = {
    "User-Agent"  : "log-getter",
    }

create_headers = lambda: {} | HEADERS | generate_services_headers(API_KEY)

def get_logs() -> dict:
    response = requests.get(GET_LOGS_URL, headers=create_headers())
    if response.ok:
        data = response.json()
        print("Got Logs")
        return data['logs']
    else:
        raise Exception(f"Failed to fetch logs from {GET_LOGS_URL}. Status Code: {response.status_code}")

def delete_logs() -> bool:
    response = requests.get(DELETE_LOGS_URL, headers=create_headers())
    return response.ok

class LogManager:

    def __init__(self):
        self.logs: dict = None
        self.stats: dict = {}

    def delete_logs(self):
        result = delete_logs()
        if result is True:
            print("Logs Deleted")
        else:
            print("Failed to delete logs")

    def get_logs(self):
        self.logs = get_logs()
        return self.logs
    
    def compute_stats(self):
        if self.logs is None:
            raise Warning("No logs found")
            return
        raise NotImplementedError
        
if __name__ == "__main__":
    log_manager = LogManager()
    log_manager.delete_logs()
    logs = log_manager.get_logs()
    

    
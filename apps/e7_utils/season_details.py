import requests
import pandas as pd

def get_rta_seasons_df():
        url = "https://epic7.onstove.com/gg/gameApi/getSeasonList?lang=en"

        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "*/*",
            "Content-Type": "application/json;charset=UTF-8",
            "Origin": "https://epic7.onstove.com",
            "Referer": "https://epic7.onstove.com/en/gg/herorecord",
        }
        
        # No payload required, but still must use POST
        response = requests.post(url, headers=headers)
        if not response.ok:
             raise Exception(f"Failed to fetch season data from {url}. Status code: {response.status_code}")
        
        df = pd.DataFrame(response.json()['result_body'])
        
        for col in df.columns:
            if "Date" in col:
                df[col] = pd.to_datetime(df[col]).dt.strftime("%Y-%m-%d")
        
        rename = {
            'startDate'     : "Start", 
            'endDate'       : "End",
            'season_code'   : "Code", 
            'name'          : "Season", 
            'is_now_season' : "Status"
            }
        
        df = df.rename(columns=rename)
        
        replace = {
            "Status" : {0 : "Complete", 1 : "Active"},
            }
        
        df = df.replace(replace)
        
        df['Season Number'] = [i + 1 for i in list(df.index)[::-1]]

        return df
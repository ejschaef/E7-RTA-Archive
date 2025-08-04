import requests

ARTIFACT_URL = "https://static.smilegatemegaport.com/gameRecord/epic7/epic7_artifact.json"

filter_null = lambda artiDict: artiDict.get('name') is not None
filter_list = lambda artiList: [elt for elt in artiList if filter_null(elt)]

def get_artifacts(lang="en"):
    response = requests.get(ARTIFACT_URL)
    if response.ok:
        json_data = response.json()
        if lang is None:
            return {key : filter_list(artiList) for key, artiList in json_data.items()}
        else:
            return filter_list(json_data[lang])
    else:
        raise Exception(f"Failed to fetch artifact data from {ARTIFACT_URL}. Status code: {response.status_code}")
    
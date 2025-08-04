# [E7-Ventus-Archive](https://not_implemented_8482398710238)

Open-source **Flask** project utilizing **Datta Able Dashboard** as a base, an open-source `Bootstrap` design.
The web app is designed to provide Epic 7 players the ability to maintain their RTA History past 100 battles,
view additional stats that the official website doesn't provide, and easily filter to a specific subset of battles.
<br/>
The web app is not meant to be viewed in portrait mode. The site will work, but the html components may not be properly sized or easily accessible.
<br/>

## Features

- RTA history plot
- Various RTA KPIs and tables
- Export and upload options to maintain history or allow users to conduct custom analytics
- Robust filter syntax allowing users to calculate statistics for specific matches
- Search feature allowing users to find player names


## Tech Stack

- compression                 : gzip (nginx)
- server routing              : Flask
- server backend              : redis
- server multi-threading      : celery
- server job scheduling       : celery beat
- interactive plots           : plotly
- interactive code panels     : CodeMirror
- containerization            : docker
- version control             : github
- server proxy                : nginx
- JS bundling                 : webpack
- front end framework         : vanilla JS
- Domain hosting              : cloudflare
- instance hosting            : lightsail

## Design

The web app mainly operates through front end JS. The only API calls that must run through the flask server
are the latest battle lookups. These api calls are made through Rust and logged. All other content will be primarily
served through client-side calls and cached whenever possible. 

The app does not utilize a JS framework. All functionality related to page and state management is implemented in with
Vanilla JS and Index DB. 

## Running Locally
- **Option 1**: 
install docker then run the docker-compose.prod.yaml file found in this repo
- **Option 2** (use if want to make custom changes to the app): 
locally install the repository to a directory, install docker, then run the docker-compose.dev.yaml 
file within the directory
- **Option 3** (use if want to make custom changes and don't want to use docker): 
    - locally install the repository
    - install all requirements of Node and Python (see requirements.txt and package.json)
    - install rust and cargo with rust up
    - install maturin and develop the rust package to install into the desired Python environment.
    - run npx webpack to build JS if any changes are made to existing JS
    - make necessary changes to config files to remove docker specific dependencies
    - run the commands for the celery, celery beat, redis, and nginx services locally (to mimick the docker services)
    - use Python to run run.py
<br />

---
[Flask Datta Able](https://app-generator.dev/product/datta-able/flask/) - Open-Source **Flask** Starter provided by [App Generator](https://app-generator.dev)

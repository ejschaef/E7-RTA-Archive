# [E7-Ventus-Archive](https://not_implemented_8482398710238)

Open-source **Flask** project utilizing **Datta Able Dashboard** as a base, an open-source `Bootstrap` design.
The web app is designed to provide Epic 7 players the ability to maintain their RTA History past 100 battles,
view additional stats that the official website doesn't provide, and easily filter to a specific subset of battles.

<br />

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

## Design

The web app mainly operates through front end JS. The only API calls that must run through the flask server
are the latest battle lookups. These api calls are made through Rust and logged. All other content will be primarily
served through client-side calls and cached whenever possible. 

The app does not utilize a JS framework. All functionality related to page and state management is implemented in with
Vanilla JS and Index DB. 

## Running
- Option 1: install docker then run the docker-compose.prod.yaml file found in this repo
- Option 2: locally install the repository to a directory, install docker, then run the docker-compose.dev.yaml file within the directory

<br />

---
[Flask Datta Able](https://app-generator.dev/product/datta-able/flask/) - Open-Source **Flask** Starter provided by [App Generator](https://app-generator.dev)

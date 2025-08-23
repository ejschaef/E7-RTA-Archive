# [E7-RTA-Archive](https://E7-RTA-Archive.cc)

Open-source **Flask** project utilizing **Datta Able Dashboard** as a base, an open-source `Bootstrap` design.
The web app is designed to provide Epic 7 players the ability to maintain their RTA History past 100 battles,
view additional stats that the official website doesn't provide, and easily filter to a specific subset of battles.
<br/>
The web app is not meant to be viewed in portrait mode. The site will work, but the html components may not be properly sized or easily accessible.
<br/>

## Features

- RTA history plot
- Export and upload options to maintain history or allow users to conduct custom analytics
- Various RTA KPIs and tables
- Filter syntax allowing users to calculate statistics for specific matches
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
- JS/CSS bundling             : webpack
- front end framework         : vanilla JS
- domain hosting              : cloudflare
- instance hosting            : lightsail

## Client-Server Design

The web app mainly operates through front end JS. The only E7 related API calls that must run through the flask server
are the latest battle lookups. These api calls are made through Rust and logged. All other content will be primarily
served through client-side calls and cached whenever possible. Only when the client-side API calls fall will the client
make a call to the flask server.

The app does not utilize a JS framework. All functionality related to page and state management is implemented with
Vanilla JS and Index DB. 

## Running Locally
**Option 1** (install docker and run remotely): 
Install docker, download the docker-compose.release.yaml file from this repository then run while docker is running. For Windows you must first install [Docker for Windows](https://docs.docker.com/desktop/setup/install/windows-install/); for Mac you must first install [Docker for Mac](https://docs.docker.com/desktop/setup/install/mac-install/). Navigate to [localhost](http://localhost) once the server is running.

  - Linux
      ```sh
      # Install Docker
      apt update && sudo apt install -y docker.io

      # Enable and start Docker
      systemctl enable docker
      systemctl start docker

      # Install Docker Compose v2
      curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      sudo chmod +x /usr/local/bin/docker-compose

      # Test it
      docker-compose version

      # pull the images and run after downloading the yaml file
      docker-compose -f docker-compose.release.yaml pull
      docker-compose -f docker-compose.release.yaml up
      ```
  - Mac/Windows
      ```sh
      # First download docker desktop and run it

      # Verify docker is running
      docker --version
      docker-compose --version


      # pull the images and run after downloading the yaml file
      docker-compose -f docker-compose.release.yaml pull
      docker-compose -f docker-compose.release.yaml up
      ```

**Option 2** (clone repo and run; sets up local development environement to make custom changes): 
install docker, locally install the repository to a directory, then run the docker-compose.dev.yaml 
file within the directory. For Windows you must first install [Docker for Windows](https://docs.docker.com/desktop/setup/install/windows-install/); for Mac you must first install [Docker for Mac](https://docs.docker.com/desktop/setup/install/mac-install/). Navigate to [localhost](http://localhost) once the server is running.

- Linux
    ```sh
    # Install Docker
    apt update && sudo apt install -y docker.io

    # Enable and start Docker
    systemctl enable docker
    systemctl start docker

    # Install Docker Compose v2
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose

    # Test it
    docker-compose version

    # Clone the repository
    git clone https://github.com/ejschaef/E7-RTA-Archive

    cd E7-RTA-Archive

    # pull the images and run
    docker-compose -f docker-compose.dev.yaml up
    ```
- Mac/Windows
    ```sh
    # First download docker desktop and run it

    # Verify docker is running
    docker --version
    docker-compose --version

    # Clone the repository
    git clone https://github.com/ejschaef/E7-RTA-Archive

    cd E7-RTA-Archive

    # pull the images and run
    docker-compose -f docker-compose.dev.yaml up
    ```

<br />

---
[Flask Datta Able](https://app-generator.dev/product/datta-able/flask/) - Open-Source **Flask** Starter provided by [App Generator](https://app-generator.dev)

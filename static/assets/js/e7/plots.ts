import { BattleType, COLUMNS_MAP } from "./references";

export const PLOT_REFS = {
    markerMaxWidth : 16,
	lineMaxWidth : 8,
    minMarkerSize : 2,
    minLineWidth : 1
}

export function getSizes(numBattles: number): {markerSize: number, lineWidth: number} {
    const length = numBattles;
    const markerSize = Math.max(PLOT_REFS.minMarkerSize, 6 - Math.log10(length) * 0.5);
    const lineWidth = Math.max(PLOT_REFS.minLineWidth, 3 - Math.log10(length) * 0.5);
    return {markerSize, lineWidth};
}

type ZoomConfig = {
    startX: number | null;
    endX: number | null;
    startY: number | null;
    endY: number | null;
}

export function getZoom(battlesList: BattleType[], filteredBattlesList: {[key: string] : BattleType}): ZoomConfig {
    const zoom: ZoomConfig = {
        startX: null,
        endX: null,
        startY: null,
        endY: null
    }

    const zoomYPadding = 50;
    const zoomXPadding = 0.5;

    for (const [idx, battle] of battlesList.entries()) {
        if (battle["Seq Num"] in filteredBattlesList) {
            zoom.startX = (zoom.startX === null || idx < zoom.startX) ? idx - zoomXPadding : zoom.startX;
                zoom.startY = (zoom.startY === null || battle["P1 Points"] < zoom.startY + zoomYPadding) ? battle["P1 Points"] - zoomYPadding : zoom.startY;
                zoom.endX = (zoom.endX === null || idx > zoom.endX)  ? idx + zoomXPadding : zoom.endX;
                zoom.endY = (zoom.endY === null || battle["P1 Points"] > zoom.endY - zoomYPadding) ? battle["P1 Points"] + zoomYPadding : zoom.endY;
        }
    }
    return zoom;
}


export function generateRankPlot(container: HTMLElement, battles: BattleType[], user: {name: string}, filteredBattles = null): HTMLElement {

    // Sort battles chronologically by time
    battles.sort((a, b) => a["Date/Time"].localeCompare(b["Date/Time"]));

    // if the user is not passed, default the username to the ID of the player
    if (!user) {
        user = {name: `UID: ${battles[0]["P1 ID"]}`}
    }

    const markerDefaultColor = '#0df8fd';
    const markerFilteredColor = '#ff9900';

    const x = battles.map((_, i) => i);
    const y = battles.map(b => b["P1 Points"]);

    const markerMask = [];

    // iterate through battles and build list to color filtered battles distinctly 
    // and determine the area to zoom on if needed
    for (let [idx, battle] of battles.entries()) {
        if (filteredBattles && battle["Seq Num"] in filteredBattles) {
            markerMask.push(markerFilteredColor);
        } else {
            markerMask.push(markerDefaultColor);
        }
    };

    const customdata = battles.map(b => [
        b[COLUMNS_MAP.DATE_TIME].slice(0,10), // date only
        b[COLUMNS_MAP.SEASON],
        b[COLUMNS_MAP.P1_LEAGUE],
    ]);

    const sizes = getSizes(battles.length);

    const trace = {
        x: x,
        y: y,
        mode: 'lines+markers',
        line: {
            color: '#4f9293',
            width: sizes.lineWidth
        },
        marker: {
            symbol: 'circle',
            size: sizes.markerSize,
            color: markerMask
        },
        customdata: customdata,
        hovertemplate:
            'Points: %{y}<br>' +
            'Date: %{customdata[0]}<br>' +
            'Season: %{customdata[1]}<br>' +
            'League: %{customdata[2]}<extra></extra>'
    };

    const layout = {
        autosize: true,
        font: {
            family: 'Roboto, Open Sans'
        },
        hoverlabel: {
            bgcolor: "rgba(0, 0, 0, 0.5)",   // background
            font: { color: "white" },
            bordercolor: "rgba(0, 0, 0, 0.5)"
        },
        hovermode: 'x unified',
        title: {
            text: `${user.name}'s RTA Point Plot`,
            font: { size: 24, color: '#dddddd' },
            xanchor: 'center',
            yanchor: 'top',
            y: 0.95,
            x: 0.5
        },
        xaxis: {
            title: {
                text: 'Battle Number (Chronological)',
                font: { size: 18, color: '#dddddd' }
            },
            showgrid: true,
            gridcolor: '#8d8d8d',
            zeroline: false,
            tickfont: { size: 12, color: '#dddddd' },
            range: null
        },
        yaxis: {
            title: {
                text: 'Victory Points',
                font: { size: 18, color: '#dddddd' }
            },
            showgrid: true,
            gridcolor: '#8d8d8d',
            zeroline: true,
            zerolinecolor: '#dddddd',
            zerolinewidth: 2,
            tickfont: { size: 12, color: '#dddddd' },
            range: null
        },
        plot_bgcolor: '#1e222d',
        paper_bgcolor: '#1e222d'
    };

    const config = {
        responsive: true
    };

    let plotDiv;
    let plotDivExists = true;
    plotDiv = document.getElementById("rank-plot");
    if (!plotDiv) {
        plotDivExists = false;
        plotDiv = document.createElement("div");
        plotDiv.id = "rank-plot"; // or use a dynamic ID if needed
        container.appendChild(plotDiv);
    }
	plotDiv.style.width = "100%";
	plotDiv.style.height = "100%";
    if (plotDivExists) {
        console.log("updating plot");
        // @ts-ignore
        Plotly.react(plotDiv, [trace], layout, config);
    } else {
        console.log("creating plot");
        // @ts-ignore
        Plotly.newPlot(plotDiv, [trace], layout, config);
    }
    return plotDiv;
}
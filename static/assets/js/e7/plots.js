export function generateRankPlot(battles, user, filteredBattles = null, zoomFiltered = false) {
    // Sort battles chronologically by time
    // console.log("Creating plot HTML for:", JSON.stringify(battles));
    // console.log("received Filtered Battles:", JSON.stringify(filteredBattles));
    battles.sort((a, b) => a["Date/Time"].slice(0,10).localeCompare(b["Date/Time"].slice(0,10)));

    // if the user is not passed, default the username to the ID of the player
    if (!user) {
        user = {name: `UID: ${battles[0]["P1 ID"]}`}
    }

    const markerDefaultColor = '#0df8fd';
    const markerFilteredColor = '#ff9900';

    const x = battles.map((_, i) => i);
    const y = battles.map(b => b["P1 Points"]);

    const markerMask = [];
    const zoom = {
        startX: null,
        endX: null,
        startY: null,
        endY: null
    }

    const zoomYPadding = 50;
    const zoomXPadding = 0.5;

    // iterate through battles and build list to color filtered battles distinctly 
    // and determine the area to zoom on if needed
    for (let [idx, battle] of battles.entries()) {
        if (filteredBattles && battle["Seq Num"] in filteredBattles) {
            if (zoomFiltered === true) {
                zoom.startX = idx < zoom.startX || zoom.startX === null ? idx - zoomXPadding : zoom.startX;
                zoom.startY = battle["P1 Points"] < zoom.startY + zoomYPadding || zoom.startY === null ? battle["P1 Points"] - zoomYPadding : zoom.startY;
                zoom.endX = idx > zoom.endX || zoom.endX === null ? idx + zoomXPadding : zoom.endX;
                zoom.endY = battle["P1 Points"] > zoom.endY - zoomYPadding || zoom.endY === null ? battle["P1 Points"] + zoomYPadding : zoom.endY;
            }
            markerMask.push(markerFilteredColor);
        } else {
            markerMask.push(markerDefaultColor);
        }
    };

    const customdata = battles.map(b => [
        b["Date/Time"].slice(0,10), // date
        b["P1 League"]              // league
    ]);

    const trace = {
        x: x,
        y: y,
        mode: 'lines+markers',
        line: {
            color: '#4f9293',
            width: 2
        },
        marker: {
            symbol: 'circle',
            size: 4,
            color: markerMask
        },
        customdata: customdata,
        hovertemplate:
            'Points: %{y}<br>' +
            'Date: %{customdata[0]}<br>' +
            'League: %{customdata[1]}<extra></extra>'
    };

    const layout = {
        autosize: true,
        font: {
            family: 'Roboto, Open Sans'
        },
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
            range: zoom.startX ? [zoom.startX, zoom.endX] : null
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
            range: zoom.startY ? [zoom.startY, zoom.endY] : null
        },
        plot_bgcolor: '#1e222d',
        paper_bgcolor: '#1e222d'
    };

    const config = {
        responsive: true
    };

    // Generate HTML string
    const divId = `plot-${Math.random().toString(36).substr(2, 9)}`;
    const containerDiv = `<div id="${divId}"></div>`;
    const plotScript = `
<script>
    Plotly.newPlot('${divId}', [${JSON.stringify(trace)}], ${JSON.stringify(layout)}, ${JSON.stringify(config)});
</script>
`;

    return containerDiv + plotScript;
}
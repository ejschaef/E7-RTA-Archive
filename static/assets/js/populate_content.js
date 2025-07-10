let Tables =  {};


function convertPercentToColorClass(str) {
    const num =Number(str.replace("%", ""));
    if (num > 50) {
        return "text-over50"
    } else if (num < 50) {
        return "text-below50"
    } else {
        return ""
    }
}


Tables.functions = {
    populateHeroStatsTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item.hero}</td>
            <td>${item.games_won}</td>
            <td>${item.games_appeared}</td>
            <td>${item.appearance_rate}</td>
            <td>${item.win_rate}</td>
            <td>${item["+/-"]}</td>
            `;

            tbody.appendChild(row);
        });

        const person = (tableid.includes("Player")) ? "Player" : "Enemy";

        var table = $('#'+tableid).DataTable({
                layout: {
                    topStart: 'buttons'
                },
                language: {
                    info: 'Total rows: _TOTAL_'
                },
                order: [[3, 'desc']], // order by pick rate desc
                buttons: {
                    name: 'primary',
                    buttons: ['copy',
                        {
                            extend: 'csv',
                            text: 'CSV',
                            filename: person + " Hero Stats",
                        },
                        {
                            extend: 'excel',
                            text: 'Excel',
                            filename: person + " Hero Stats",
                        }
                    ]
                },
                columnDefs: [
                    { 
                        targets: '_all', className: 'nowrap' 
                    },
                    {
                        targets: 4, // "win_rate" column
                        createdCell: function(td, cellData) {
                            const num = Number(cellData.replace("%", ""));
                            if (num < 50) {
                                td.style.color = 'red';
                            } else if (num > 50) {
                                td.style.color = 'mediumspringgreen';
                            }
                        }
                    },
                ],
                pageLength: 50,
                scrollY: '300px',
                deferRender: true,
                scroller: true,
                scrollCollapse: false,
            }
            );
    },


    populateSeasonDetailsTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['Season Number']}</td>
            <td>${item['Season']}</td>
            <td>${item['Start']}</td>
            <td>${item['End']}</td>
            <td>${item['Status']}</td>
            `;
            tbody.appendChild(row);
        });
    },

    populateServerStatsTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}-body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['server']}</td>
            <td>${item['count']}</td>
            <td>${item['frequency']}</td>
            <td>${item['wins']}</td>
            <td class="${convertPercentToColorClass(item['win_rate'])}">${item['win_rate']}</td>
            <td>${item['+/-']}</td>
            <td class="${convertPercentToColorClass(item['fp_wr'])}">${item['fp_wr']}</td>
            <td class="${convertPercentToColorClass(item['sp_wr'])}">${item['sp_wr']}</td>
            `;
            tbody.appendChild(row);
        });
    },

    populatePlayerPrebansTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['preban']}</td>
            <td>${item['appearances']}</td>
            <td>${item['appearance_rate']}</td>
            <td class="${convertPercentToColorClass(item['win_rate'])}">${item['win_rate']}</td>
            <td>${item['+/-']}</td>
            `;

            tbody.appendChild(row);
        });
    },

    populatePlayerFirstPickTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['hero']}</td>
            <td>${item['appearances']}</td>
            <td>${item['appearance_rate']}</td>
            <td class="${convertPercentToColorClass(item['win_rate'])}">${item['win_rate']}</td>
            <td>${item['+/-']}</td>
            `;

            tbody.appendChild(row);
        });
    },

    populateFullBattlesTable: function(tableid, data, user) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        let name;
        if (user) {
            name = user.name;
        } else {
            name = data.length === 0 ? "Empty" : `UID(${data[0]['P1 ID']})`;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['Date/Time']}</td>
            <td>${item['Seq Num']}</td>
            <td>${item['P1 ID']}</td>
            <td>${item['P1 Server']}</td>
            <td>${item['P1 League']}</td>
            <td>${item['P1 Points']}</td>
            <td>${item['P2 ID']}</td>
            <td>${item['P2 Server']}</td>
            <td>${item['P2 League']}</td>
            <td>${item['Win']}</td>
            <td>${item['First Pick']}</td>
            <td>${item['P1 Preban 1']}</td>
            <td>${item['P1 Preban 2']}</td>
            <td>${item['P2 Preban 1']}</td>
            <td>${item['P2 Preban 2']}</td>
            <td>${item['P1 Pick 1']}</td>
            <td>${item['P1 Pick 2']}</td>
            <td>${item['P1 Pick 3']}</td>
            <td>${item['P1 Pick 4']}</td>
            <td>${item['P1 Pick 5']}</td>
            <td>${item['P2 Pick 1']}</td>
            <td>${item['P2 Pick 2']}</td>
            <td>${item['P2 Pick 3']}</td>
            <td>${item['P2 Pick 4']}</td>
            <td>${item['P2 Pick 5']}</td>
            <td>${item['P1 Postban']}</td>
            <td>${item['P2 Postban']}</td>
            `;

            tbody.appendChild(row);
        });

        const fname = `${name} Battle Data`;

        var table = $('#BattlesTable').DataTable({
                layout: {
                    topStart: 'buttons'
                },
                language: {
                    info: 'Total rows: _TOTAL_'
                },
                order: [[0, 'desc']], // Sort by Date/Time desc by default
                columnDefs: [
                    { 
                        targets: '_all', className: 'nowrap' 
                    },
                    {
                        targets: 9, // "Result" column
                        createdCell: function(td, cellData) {
                            if (cellData === 'W') {
                                td.style.color = 'mediumspringgreen';
                            } else if (cellData === 'L') {
                                td.style.color = 'red';
                            }
                        }
                    },
                    {
                        targets: 10, // "Result" column
                        createdCell: function(td, cellData) {
                            if (cellData === 'True') {
                                td.style.color = 'deepskyblue';
                            } 
                        }
                    },
                    
                ],
                buttons: {
                    name: 'primary',
                    buttons: ['copy', 
                        {
                            extend: 'csv',
                            text: 'CSV',
                            filename: fname,
                        },
                        {
                            extend: 'excel',
                            text: 'Excel',
                            filename: fname,
                        }
                    ]
                },
                pageLength: 50,
                scrollY: '300px',
                deferRender: true,
                scroller: true,
                scrollCollapse: false,
                columns: [
                    { data: 'Date/Time' },
                    { data: 'Seq Num' },
                    { data: 'P1 ID' },
                    { data: 'P1 Server' },
                    { data: 'P1 League' },
                    { data: 'P1 Points' },
                    { data: 'P2 ID' },
                    { data: 'P2 Server' },
                    { data: 'P2 League' },
                    { data: 'Win' },
                    { data: 'First Pick' },
                    { data: 'P1 Preban 1' },
                    { data: 'P1 Preban 2' },
                    { data: 'P2 Preban 1' },
                    { data: 'P2 Preban 2' },
                    { data: 'P1 Pick 1' },
                    { data: 'P1 Pick 2' },
                    { data: 'P1 Pick 3' },
                    { data: 'P1 Pick 4' },
                    { data: 'P1 Pick 5' },
                    { data: 'P2 Pick 1' },
                    { data: 'P2 Pick 2' },
                    { data: 'P2 Pick 3' },
                    { data: 'P2 Pick 4' },
                    { data: 'P2 Pick 5' },
                    { data: 'P1 Postban' },
                    { data: 'P2 Postban' },
                ],
            }
        );
        return table;
    },

    replaceDatatableData(datatableReference, data) {
        datatableReference.clear().rows.add(data).draw();
    }

};

let CardContent =  {};

CardContent.functions = {

    populateGeneralStats: function(general_stats) {
        document.getElementById("total-battles").textContent = general_stats.total_battles;
        document.getElementById("first-pick-count").textContent = general_stats.first_pick_count;
        document.getElementById("first-pick-rate").textContent = ` (${general_stats.first_pick_rate})`;
        document.getElementById("second-pick-count").textContent = general_stats.second_pick_count;
        document.getElementById("second-pick-rate").textContent = ` (${general_stats.second_pick_rate})`; 

        document.getElementById("total-winrate").textContent = general_stats.total_winrate;
        document.getElementById("first-pick-winrate").textContent = general_stats.first_pick_winrate;
        document.getElementById("second-pick-winrate").textContent = general_stats.second_pick_winrate; 

        document.getElementById("total-wins").textContent = general_stats.total_wins;
        document.getElementById("max-win-streak").textContent = general_stats.max_win_streak;
        document.getElementById("max-loss-streak").textContent = general_stats.max_loss_streak; 
        document.getElementById("avg-ppg").textContent = general_stats.avg_ppg; 
    },

    populateRankPlot: function(rank_plot_html) {
        const container = document.getElementById("rank-plot-container");

        container.innerHTML = rank_plot_html;

        // Extract and re-execute any <script> in the injected HTML
        const scripts = container.querySelectorAll("script");
        scripts.forEach((script) => {
            const newScript = document.createElement("script");
            if (script.src) {
                newScript.src = script.src;
            } else {
                newScript.textContent = script.textContent;
            }
            document.body.appendChild(newScript); // or container.appendChild if it's inline
        });

        setTimeout(() => {
                    window.dispatchEvent(new Event('resize'));
        }, 10);
    },

}

export { Tables, CardContent };
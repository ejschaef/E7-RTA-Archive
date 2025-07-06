let Tables =  {};


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
            <td>${item['win_rate']}</td>
            <td>${item['+/-']}</td>
            `;

            tbody.appendChild(row);
        });
    },

    populatePlayerFirstpickTable: function(tableid, data) {
        const tbody = document.getElementById(`${tableid}Body`);
        tbody.innerHTML = '';  // Clear existing rows

        data.forEach(item => {
            const row = document.createElement('tr');

            // Populate each <td> in order
            row.innerHTML = `
            <td>${item['hero']}</td>
            <td>${item['appearances']}</td>
            <td>${item['appearance_rate']}</td>
            <td>${item['win_rate']}</td>
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
            <td>${item['P2 ID']}</td>
            <td>${item['P1 League']}</td>
            <td>${item['P2 League']}</td>
            <td>${item['P1 Points']}</td>
            <td>${item['Win']}</td>
            <td>${item['Firstpick']}</td>
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
                        targets: '_all', className: 'no-wrap' 
                    },
                    {
                        targets: 7, // "Result" column
                        createdCell: function(td, cellData) {
                            if (cellData === 'W') {
                                td.style.color = 'mediumspringgreen';
                            } else if (cellData === 'L') {
                                td.style.color = 'red';
                            }
                        }
                    },
                    {
                        targets: 8, // "Result" column
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
            }
        );
    },

};

let CardContent =  {};

CardContent.functions = {

    populateBattleCounts: function(general_stats) {
        document.getElementById("total-battles").textContent = general_stats.total_battles;
        document.getElementById("firstpick-count").textContent = general_stats.firstpick_count;
        document.getElementById("firstpick-rate").textContent = ` (${general_stats.firstpick_rate})`;
        document.getElementById("secondpick-count").textContent = general_stats.secondpick_count;
        document.getElementById("secondpick-rate").textContent = ` (${general_stats.secondpick_rate})`; 
    },

    populateBattlePercents: function(general_stats) {
        document.getElementById("total-winrate").textContent = general_stats.total_winrate;
        document.getElementById("firstpick-winrate").textContent = general_stats.firstpick_winrate;
        document.getElementById("secondpick-winrate").textContent = general_stats.secondpick_winrate; 
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
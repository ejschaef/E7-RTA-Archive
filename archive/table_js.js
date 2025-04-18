$(document).ready( function () {
    $('#OpponentTable').DataTable({
        layout: {
            //top2Start: 'pageLength',
            topStart: 'buttons'
        },
        buttons: {
            name: 'primary',
            buttons: ['copy', 'csv',
                {
                    extend: 'excel',
                    text: 'Excel',
                    filename: "Player Hero Stats",
                }
            ]
        },
        scrollY:        200,
        deferRender:    true,
        scroller:       true
        // lengthMenu: 
        //     [
        //     [100, 250, 500, -1],
        //     ['100 rows', '250 rows', '500 rows', 'Show all']
        // ],
    });
} );
"use strict"

$(document).ready(function () {

    let _btnInvia = $("#btnInvia");
    let _txtComment = $("#txtComment");

    returnComments();

    _btnInvia.on("click", invioCommento);

    function returnComments() {
        let request = inviaRichiesta("GET", "/api/returnComments");
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function (data) {
            $("#commenti").empty();
            let comm = [];
            for (let item of data[0]["comments"]) {
                comm = item.split("☺");
                $("<div>").css({ "text-align": "left" }).appendTo($("#commenti")).append($("<strong>").text(comm[0] + " ").addClass("comment")).append($("<p>").text(comm[1]).addClass("comment"));
            }
        });
    }

    function invioCommento() {
        if (_txtComment.val() != "") {
            let request = inviaRichiesta("GET", "/api/addComment", { "commento": _txtComment.val() });
            request.fail(function (jqXHR, testStatus, strError) {
                errore(jqXHR, testStatus, strError);
            });
            request.done(function (data) {
                _txtComment.val("");
                returnComments();
            });
        }
    }
})


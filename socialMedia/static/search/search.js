"use strict"

$(document).ready(function () {
    let input = $("#txtCerca");
    let search = $(".input-group-append");
    let divResults = $("#results");

    search.on("click", function (event) {
        ricercaUtenti();
    });

    input.on("keyup", function (event) {
        ricercaUtenti();
    });


    function visitaProfilo() {
        let request = inviaRichiesta("GET", "/api/idUtente", { "idUtente": $(this).prop("idUtente") });
        request.fail(errore);
        request.done(function (data) {
            window.location.href = "profile/profile.html";
        });
    }

    function ricercaUtenti() {
        let testo = input.val();

        if (testo != "") {
            let request = inviaRichiesta("GET", "/api/elencoUtenti", { "testo": testo });
            request.fail(errore);
            request.done(function (data) {
                divResults.removeClass("pos");
                divResults.empty();

                if (data.length == 0) {
                    divResults.addClass("pos");
                    $("<strong>").html("Nessun utente trovato.").appendTo(divResults);
                }
                else {
                    for (let i = 0; i < data.length; i++) {
                        let _wrapper = $("<div>").addClass("row dm chat").attr("roomName", data[i]["username"]).append(
                            $("<div>").addClass("col-sm-2").append($("<div>").addClass("littleImgProfile").css({
                                "background-image": "url(../../img/" + data[i]["fotoProfilo"],
                                "background-size": "cover"
                            }))
                        ).appendTo(divResults).on("click", visitaProfilo).prop("idUtente", data[i]["_id"]).css("background-color", i % 2 == 0 ? "whitesmoke" : "#DEDEDE").css({ "height": "6em" });
                        $("<div>").addClass("col-sm-10").appendTo(_wrapper).append($("<br>")).append(
                            $("<div>").append($("<strong>").text(data[i]["username"]).addClass("anaglyph")
                            ).append($("<br>")).append($("<p>").text("Coin totali del profilo: " + data[i]["totCoinProfilo"]))
                        )
                    }
                }
            });
        }
    }
})




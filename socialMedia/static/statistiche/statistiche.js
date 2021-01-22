"use strict"

$(document).ready(function () {

    let wrapper = $("#wrapper");

    $(".row").eq(0).on("click", s1);
    //$(".row").eq(1).on("click", s2);

    function s1() {
        let request = inviaRichiesta("GET", "/api/stat1");
        request.fail(errore);
        request.done(function (data) {
            wrapper.empty();
            if (data["one"].length == 0) {
                $("<h1>").css("text-align", "center").html("Nessun post a cui hai messo like").appendTo(wrapper);
            }
            else {
                $("<h1>").css("text-align", "center").html("Post a cui hai messo like").appendTo(wrapper);
                let div, divS;
                for (let i = 0; i < data["two"].length; i++) {
                    if ((i % 3) == 0) {
                        div = $("<div>").addClass("row").appendTo(wrapper);
                        $("<br>").appendTo("#foto");
                    }
                    divS = $("<div>").addClass("col-sm-4 allFoto").appendTo(div);
                    $("<div>").appendTo(divS).css({ "background-image": `url(../../img/${data["two"][i]["link"]}` }).on("click", visualizzaFoto);
                }
            }
        });
    }

    function s2() {
        let request = inviaRichiesta("GET", "/api/stat2");
        request.fail(errore);
        request.done(function (data) {
            console.log(data);
        });
    }

    function visualizzaFoto() {
    }

    $("#btnLogout").on("click", function () {
        let request = inviaRichiesta("POST", "/api/logout");
        request.fail(errore);
        request.done(function (data) {
            window.location.href = "login.html";
        })
    })
})
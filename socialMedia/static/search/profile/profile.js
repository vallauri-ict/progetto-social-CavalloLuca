"use strict"

$(document).ready(function () {

    let _username = $("#username");
    let _totCoins = $("#totCoin");
    let _nFollowers = $("#nFollowers");
    let _nFollowed = $("#nFollowed");
    let _imgProfilo = $("#imgProfilo");
    let _spanBio = $("#spanBio");
    let _btnSegui = $("#segui");
    let followers;

    let myUsername;

    let request = inviaRichiesta("GET", "/api/returnProfile");
    request.fail(function (jqXHR, testStatus, strError) {
        errore(jqXHR, testStatus, strError);
    });
    request.done(function (data) {
        
        followers=data["one"]["followers"].length;

        // one
        _username.html(data["one"]["username"]).css({ "font-weight": "bold" });
        _totCoins.html((data["one"]["totCoinProfilo"]).toString());
        _nFollowers.html(data["one"]["followers"].length);
        _nFollowed.html(data["one"]["followed"].length);
        _imgProfilo.css({ "background-image": `url(../../img/${data["one"]["fotoProfilo"]}` });
        _spanBio.text(data["one"]["biografia"]);

        // two
        let div, divS;
        for (let i = 0; i < data["two"].length; i++) {
            if ((i % 3) == 0) {
                div = $("<div>").addClass("row").appendTo("#foto");
                $("<br>").appendTo("#foto");
            }
            divS = $("<div>").addClass("col-sm-4 allFoto").appendTo(div);
            $("<div>").appendTo(divS).css({ "background-image": `url(../../img/${data["two"][i]["link"]}` }).on("click", visualizzaFoto);
        }

        myUsername = data["three"];
        if (data["one"]["followers"].includes(myUsername))
            _btnSegui.text("Smetti di seguire").on("click", smetti);
        else
            _btnSegui.text("Inizia a seguire").on("click", inizia);

        function inizia() {
            let request = inviaRichiesta("GET", "/api/inizia",
                { "myUsername": myUsername, "yourUsername": data["one"]["username"] });
            request.fail(errore);
            request.done(function (data) {
                followers++;
                _nFollowers.html(followers);
                _btnSegui.off("click");
                _btnSegui.text("Smetti di seguire").on("click", smetti);
            });
        }

        function smetti() {
            let request = inviaRichiesta("GET", "/api/smetti",
                { "myUsername": myUsername, "yourUsername": data["one"]["username"] });
            request.fail(errore);
            request.done(function (data) {
                followers--;
                _nFollowers.html(followers);
                _btnSegui.off("click");
                _btnSegui.text("Inizia a seguire").on("click", inizia);
            });
        }
    });

    function visualizzaFoto() {
        console.log($(this));
    }


})
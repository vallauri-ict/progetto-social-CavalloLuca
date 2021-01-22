"use strict"

$(document).ready(function () {

    let _bodyPhotos = $("#bodyPhotos");
    let listalike = [];
    let listaCoin = [];
    let myUsername;

    let requestUsername = inviaRichiesta("GET", "/api/returnUsername");
    requestUsername.fail(function (jqXHR, testStatus, strError) {
        errore(jqXHR, testStatus, strError);
    });
    requestUsername.done(function (data) {
        myUsername = data["username"];
    });

    let request = inviaRichiesta("GET", "/api/elencoPost");
    request.fail(function (jqXHR, testStatus, strError) {
        //Errore generico
        errore(jqXHR, testStatus, strError);
    });
    request.done(function (data) {
        let datas = data["two"];
        for (let item of datas) {
            let y;
            for (y = 0; item["utente"] != data["three"][y]["username"]; y++);
            let profilePhoto = data["three"][y]["fotoProfilo"];
            let _containerFoto = $("<div>").addClass("containerFoto").appendTo(_bodyPhotos);
            $("<div>").addClass("row").addClass("rowHead").appendTo(_containerFoto).append($("<div>").addClass("col-sm-3").prop("align", "left").append($("<div>").addClass("littleImgProfile").css({
                "background-image": "url(../../img/" + profilePhoto,
                "background-size": "cover"
            }))).append(
                $("<div>").addClass("col-sm-6").prop("align", "left").append($("<br>")).append(
                    $("<strong>").text(item["utente"]).css("font-size", "2em").addClass("anaglyph")
                )
            ).append($("<div>").addClass("col-sm-3").prop("align", "center").append($("<img>").prop("src", "../../img/coin.png").addClass("miniCoin")).append($("<p>").addClass("anaglyph").text(data["three"][y]["totCoinProfilo"])));
            $("<div>").addClass("row").appendTo(_containerFoto).append(
                $("<img>").prop("src", "../../img/" + item["link"])
            );

            let _rowCoins = $("<div>").addClass("row").addClass("rowCoins").prop("id","row"+item["_id"]).prop("show","false").appendTo(_containerFoto).hide();
            $("<div>").addClass("col-sm-6").appendTo(_rowCoins).append(
                $("<p>").text("Inserisci coin da donare:").addClass("firstP")
            )
            $("<div>").addClass("col-sm-3").appendTo(_rowCoins).append(
                $("<input>").attr("id", "txtCoins" + item["link"]).attr("type", "text").attr("maxLength","1").addClass("form-control").attr("aria-label", "Recipient's username").prop("id","txtCoin"+item["_id"]).attr("aria-describedby", "basic-addon2").css({
                    "background-color": "#CCC",
                    "font-size": "1.2em",
                    "text-align":"center"
                }).on("keyup",controlloSoloNum)
            )
            $("<div>").addClass("col-sm-3").appendTo(_rowCoins).append(
                $("<button>").attr("idFoto",item["_id"]).addClass("btn").text("Invia").on("click",inviaCoin).addClass("btn-secondary").addClass("btnCoins")
            )

            let _riga = $("<div>").addClass("row").addClass("rowButtons").appendTo(_containerFoto);
            let _mezzaRigaSx = $("<div>").addClass("col-sm-4").appendTo(_riga);
            let _mezzaRigaDx = $("<div>").addClass("col-sm-8").appendTo(_riga);

            let divLike = $("<div>").addClass("divMiniButtons").prop("id", "divLike" + item["_id"]).appendTo(_mezzaRigaSx);
            let likefoto = $("<img>").addClass("miniButtons").prop("idFoto", item["_id"]).appendTo(divLike);
            $("<span>").appendTo(divLike);

            let divCoin = $("<div>").addClass("divMiniButtons").prop("id", "divCoin" + item["_id"]).appendTo(_mezzaRigaSx);
            let coinfoto = $("<img>").addClass("miniButtons").prop("idFoto", item["_id"]).prop("id","coin"+item["_id"]).prop("src", "../../img/nocoin.png").on("click", coin).appendTo(divCoin);
            $("<span>").appendTo(divCoin);

            aggiornaLikesNumber(likefoto);
            aggiornaCoinsNumber(coinfoto);

            let divCommenti = $("<div>").prop("id", "divCommenti" + item["_id"]).css({ "vertical-align": "middle" }).appendTo(_mezzaRigaDx);
            $("<p>").css({ "position": "relative", "top": "30%", "left": "0%" }).text("Visualizza tutti i commenti e/o scrivine uno").prop("id", item["_id"]).appendTo(divCommenti).on("click", visualizzaCommenti);
            let _sezCommenti = $("<div>").appendTo(divCommenti);

            let cont = 0;
            let comm = [];

            for (let comment of item["comments"]) {
                comm = comment.split("☺");
                if ((comm[0].length + comm[1].length) > 41) {
                    let n = 41 - comm[0].length;
                    let str = comm[1].slice(0, n);
                    $("<div>").css({ "text-align": "left" }).appendTo(_sezCommenti).append($("<strong>").text(comm[0] + " ").addClass("comment")).append($("<p>").text(str + " ...").addClass("comment"));
                }
                else
                    $("<div>").css({ "text-align": "left" }).appendTo(_sezCommenti).append($("<strong>").text(comm[0] + " ").addClass("comment")).append($("<p>").text(comm[1]).addClass("comment"));

                if (cont == 2)
                    break;
                cont++;
            }
            $("<br>").appendTo(_bodyPhotos);
        }
    });

    function like() {
        let _foto = $(this);
        if (_foto.prop("like") == "false") {
            _foto.prop("src", "../../img/like.png");
            _foto.prop("like", "true");

            let requestAddLike = inviaRichiesta("GET", "/api/addLike",
                { "idFoto": _foto.prop("idFoto") });
            requestAddLike.fail(function (jqXHR, testStatus, strError) {
                errore(jqXHR, testStatus, strError);
            });
            requestAddLike.done(function (data) {
                aggiornaLikesNumber(_foto);
            });
        }
        else if (_foto.prop("like") == "true") {
            _foto.prop("src", "../../img/nolike.png");
            _foto.prop("like", "false");

            let requestRemoveLike = inviaRichiesta("GET", "/api/removeLike",
                { "idFoto": _foto.prop("idFoto") });
            requestRemoveLike.fail(function (jqXHR, testStatus, strError) {
                errore(jqXHR, testStatus, strError);
            });
            requestRemoveLike.done(function (data) {
                aggiornaLikesNumber(_foto);
            });
        }
    }

    function coin() {
        let idFoto=$(this).prop("idFoto");
        if($(this).prop("coin")=="false"){
            if($("#row"+idFoto).prop("show")=="false")
                $("#row"+idFoto).prop("show","true").show(300,"linear");
            else
                $("#row"+idFoto).prop("show","false").hide(300,"linear");
        }
    }
    function inviaCoin(){
        let idFoto = $(this).attr("idFoto");
        $("#row"+idFoto).prop("show","false").hide(300,"linear");
        $("#coin"+idFoto).prop("src", "../../img/coin.png").prop("coin","true");

        let requestAddCoin = inviaRichiesta("GET", "/api/addCoin",
            { "nCoins": $("#txtCoin"+idFoto).val(), "idFoto":idFoto });
        requestAddCoin.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        requestAddCoin.done(function (data) {
            console.log(data);
            aggiornaCoinsNumber($("#coin"+idFoto));
        });
    }
    function aggiornaLikesNumber(_foto) {
        let requestLikesNumber = inviaRichiesta("GET", "/api/likesNumber",
            { "idFoto": _foto.prop("idFoto") });
        requestLikesNumber.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        requestLikesNumber.done(function (data) {
            listalike = data[0]["likes"];
            controllaLike(_foto);
            $("#divLike" + _foto.prop("idFoto")).children("span").html(data[0]["likes"].length + " smiles");
        });
    }
    function aggiornaCoinsNumber(_foto) {
        let requestCoinsNumber = inviaRichiesta("GET", "/api/coinsNumber",
            { "idFoto": _foto.prop("idFoto") });
        requestCoinsNumber.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        requestCoinsNumber.done(function (data) {
            console.log(data);
            listaCoin=[];
            let totCoin=0;
            console.log(data[0]["coins"]);
            for(let item in data[0]["coins"]){
                let datas=data[0]["coins"][item].split("/");
                listaCoin.push(datas[0]);
                totCoin+=parseInt(datas[1]);
            }
            controllaCoin(_foto);
            $("#divCoin" + _foto.prop("idFoto")).children("span").html(totCoin + " coin");
        });
    }
    function visualizzaCommenti() {
        let request = inviaRichiesta("GET", "/api/idComments",
            { "idFoto": $(this).prop("id") });
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function (data) {
            window.location.href = "comments/comments.html";
        });
    }

    function controllaLike(_foto) {
        if (listalike.includes(myUsername))
            _foto.prop("like", "true").prop("src", "../../img/like.png").on("click", like);
        else
            _foto.prop("like", "false").prop("src", "../../img/nolike.png").on("click", like);
    }
    
    function controllaCoin(_foto) {
        if (listaCoin.includes(myUsername))
            _foto.prop("coin", "true").prop("src", "../../img/coin.png").on("click", like);
        else
            _foto.prop("coin", "false").prop("src", "../../img/nocoin.png").on("click", like);
    }
    function controlloSoloNum(){
        let num=$(this).val();
        if(num.charCodeAt(0)<49 || num.charCodeAt(0)>53){
            $(this).val("");
        }
    }
})


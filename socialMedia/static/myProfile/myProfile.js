"use strict"

$(document).ready(function(){
    
    let _username=$("#username");
    let _totCoins=$("#totCoin");
    let _nFollowers=$("#nFollowers");
    let _nFollowed=$("#nFollowed");
    let _imgProfilo=$("#imgProfilo");
    let _spanBio=$("#spanBio");
    let _btnAggiungiPost=$("#btns").children("div").eq(1).children("input");
    let _btnModificaProfilo=$("#btns").children("div").eq(2).children("button");

    let request = inviaRichiesta("GET", "/api/mioProfilo");
    request.fail(function (jqXHR, testStatus, strError) {
            //Errore generico
            errore(jqXHR, testStatus, strError);
    });
    request.done(function(data){
        
        // one
        _username.html(data["one"]["username"]).css({"font-weight":"bold"});
        _totCoins.html((data["one"]["totCoinProfilo"]).toString());
        _nFollowers.html(data["one"]["followers"].length);
        _nFollowed.html(data["one"]["followed"].length);
        _imgProfilo.css({"background-image":`url(../../img/${data["one"]["fotoProfilo"]}`});
        _spanBio.text(data["one"]["biografia"]);

        // two
        caricaFoto(data);
    });

    _btnAggiungiPost.on("change",function(){
        let files=$("#inputFoto").prop("files");
        if(files!=null){
            let formData=new FormData();
            formData.append("elencoFiles",files[0]);
            let request=inviaRichiestaMultipart("POST","/api/upload",formData)
            request.fail(errore);
            request.done(function (data) {
                let request2 = inviaRichiesta("GET", "/api/mioProfilo");
                request2.fail(function (jqXHR, testStatus, strError) {
                        //Errore generico
                        errore(jqXHR, testStatus, strError);
                });
                request2.done(function(data2){
                    caricaFoto(data2);
                });
            })
        
        }
    });

    _btnModificaProfilo.on("click",function(){
        window.location.href = "modifica/modifica.html";
    });

    function visualizzaFoto(){
        console.log($(this));
    }

    function inviaRichiestaMultipart(method, url, parameters) {
        return $.ajax({
            url: url, //default: currentPage
            type: method,
            data: parameters,
            contentType: false, //deve trasmettere i dati così come sono
            processData:false,
            dataType: "json",
            timeout: 5000,
        });
    }
    function caricaFoto(data){
        $("#foto").empty();
        let div, divS;
        for(let i=0;i<data["two"].length;i++){
            if((i%3) == 0){
                div=$("<div>").addClass("row").appendTo("#foto");
                $("<br>").appendTo("#foto");
            }
            divS=$("<div>").addClass("col-sm-4 allFoto").appendTo(div);
            $("<div>").appendTo(divS).css({"background-image": `url(../../img/${data["two"][i]["link"]}`}).on("click",visualizzaFoto);
        }
    }

})
"use strict"

$(document).ready(function(){

    let _btnHome=$("#btnHome").css("color","white");
    let _btnSearch=$("#btnSearch");
    let _btnProfile=$("#btnProfile");
    let _btnSettings=$("#btnSettings");
    let _btnHeader=$("#btnHeader");
    let _title=$("#title");
    let _navButtons = $(".navBut");

    let request = inviaRichiesta("GET", "/api/test");
    request.fail(function (jqXHR, testStatus, strError) {
        if (jqXHR.status=="403") {
            //Token scaduto
            window.location.href="/login.html";
        } else {
            //Errore generico
            errore(jqXHR, testStatus, strError);
        }
    });
    _btnHome.on("click",function(){
        _title.html("Home");
        _btnHeader.show();
        _navButtons.css("color","black");
        _btnHome.css("color","#DDD")
    })
    _btnSearch.on("click",function(){
        _title.html("Cerca utenti");
        _btnHeader.show();
        _navButtons.css("color","black");
        _btnSearch.css("color","#DDD")
    })
    _btnProfile.on("click",function(){
        _title.html("Profilo");
        _btnHeader.show();
        _navButtons.css("color","black");
        _btnProfile.css("color","#DDD")
    })
    _btnSettings.on("click",function(){
        _title.html("Statistiche");
        _btnHeader.show();
        _navButtons.css("color","black");
        _btnSettings.css("color","#DDD")
    })
    _btnHeader.on("click",function(){
            _btnHeader.hide();
            _title.html("Chat");
            _navButtons.css("color","black");
    })
})
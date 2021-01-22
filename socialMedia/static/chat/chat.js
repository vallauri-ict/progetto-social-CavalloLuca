"use strict"
$(document).ready(function () {
    let _dropdown = $("#dropdownList");
    _dropdown.hide();
    let names="";

    let request = inviaRichiesta("GET", "/api/richiediRoom");
    request.fail(function (jqXHR, testStatus, strError) {
        errore(jqXHR, testStatus, strError);
    });
    request.done(function(data){
        for(let i=0; i<data.length; i++){
           let _wrapper = $("<div>").addClass("row dm chat").attr("roomName",data[i]["username"]).append(
               $("<div>").addClass("col-sm-2").append($("<div>").addClass("littleImgProfile").css({"background-image":"url(../../img/"+data[i]["fotoProfilo"],
                "background-size":"cover"}))
           ).appendTo($("#message")).on("click",apriChat).css("background-color",i%2==0?"whitesmoke":"#DEDEDE").css({"height":"6em"});
           $("<div>").addClass("col-sm-10").appendTo(_wrapper).append($("<br>")).append(
               $("<div>").append($("<strong>").text(data[i]["username"]).addClass("anaglyph")
               ).append($("<br>")).append($("<p>").text("Coin totali del profilo: "+data[i]["totCoinProfilo"]))
           ) 
        }
    })




    $("#btnNuovaChat").on("click",function(){
        _dropdown.show(500,"linear");
        
        let request = inviaRichiesta("GET", "/api/followed");
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function(data){
            let followed = data[0]["followed"];
            for(let i=0; i<followed.length; i++){
                $("<option>").addClass("dropdown-item").text(followed[i]).appendTo(_dropdown)
            };
            _dropdown.prop("selectedIndex",-1);
        })
    });

    function apriChat(){
        console.log($(this).attr("roomName"));
        let request = inviaRichiesta("GET", "/api/room", {"room":$(this).attr("roomName")});
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function(){
            window.location.href="singolChat/singolChat.html";
        })
    };

    _dropdown.on("change",function(){
        let request = inviaRichiesta("GET", "/api/newChat", {"friend":this.value});
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function(){
            window.location.href="singolChat/singolChat.html";
        }) 
    })
    

    
	
});

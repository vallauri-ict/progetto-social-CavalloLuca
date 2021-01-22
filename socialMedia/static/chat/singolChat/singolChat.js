"use strict"
$(document).ready(function () {
	
	let user;
	// io.connect() è sincrono: l'esecuzione rimane bloccata finchè non arriva la risposta dal server
	let socket = io.connect();  // richiesta di connessione TCP al server
	// let socket = io.connect("",{"parametro":"ciao"});
	// client apre una connessione web socket verso il server:
	// in corrispondenza, sul server io.on("connection")
	
	//console.log("socket: " + socket); 
	
	// evento che si verifica in corrispondenza della connessione
	socket.on('connect', function(){				
		// 1) invio username
		//socket.emit() : 
		//metodo standard che può usare sia client che server per inviare richieste/dati alla controparte
	});
	socket.on("yourName", function(name){
		user=name;
	});
	// 2) invio mesaggio
	$("#btnInvia").click(function () {
		let msg = $("#txtMessage").val();
		socket.emit("message", msg);
	});
	
	socket.on('notify_message', function(data){
		// ricezione di un messaggio dal server			
		data = JSON.parse(data); 
		visualizza(data.from, data.message, data.date);	
	});
	
	socket.on('messaggiDaCaricare', function(data){
		let messaggi=[];
		if(data[0]["rooms"]!=null)
			messaggi = data[0]["rooms"][0]["messages"];
		let item;
		for(let i=0; i<messaggi.length; i++){
			item=messaggi[i].split('/');
			visualizza(item[1],item[2], item[0]);
		}
	});


	
	function visualizza (username, message, date) {
		let wrapper = $("#wrapper");
		let container;
		if(username==user)
			container = $("<div class='message-container-user'></div><br><br>");
		else
			container = $("<div class='message-container-friend'></div><br><br>");

		container.appendTo(wrapper);
		
		// date
		date = new Date(date); 				
		let mittente = $("<small class='message-from'>" +date.toLocaleString() + "</small>");
		mittente.appendTo(container);
	
        // messaggio
        let strong=$("<strong>").appendTo(container);
		message = $("<p class='message-data'>" + message + "</p>");
		message.appendTo(strong);
		$("#txtMessage").val("");
		
		
		// auto-scroll dei messaggi
		/* la proprietà html scrollHeight rappresenta l'altezza di wrapper oppure
		   l'altezza del testo interno qualora questo ecceda l'altezza di wrapper */ 
		let h = wrapper.prop("scrollHeight"); 
		// fa scorrere il teso verso l'alto
		wrapper.animate({scrollTop: h}, 500);
	}
});

//metodo sincrono: non va avanti finchè il metodo non è finito

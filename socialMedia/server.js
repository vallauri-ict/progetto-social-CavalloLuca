"use strict";

const http = require("http");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fileupload = require("express-fileupload");
const { ESRCH } = require("constants");
const PORT = process.env.PORT || 1337;
const TTL_Token = 600;
const mongo = require("mongodb");
const mongoClient = mongo.MongoClient;
const DBNAME = "socialMediaCamosciniCavallo"
const CONNECTIONSTRING = "mongodb+srv://socialMedia5B:socialMedia5B@cluster0.k5zzr.mongodb.net/socialMediaCamosciniCavallo?retryWrites=true&w=majority";
const CONNECTIONOPTIONS = { useNewUrlParser: true, useUnifiedTopology: true };
const async = require("async");
let privateKey;
const colors = require("colors");
const { stringify } = require("querystring");
const { connect } = require("http2");
const server = http.createServer(app);
const io = require("socket.io")(server);
let currentUser;
let roomName;
let friend;
let idUtente;
let currentFoto;

server.listen(PORT, function () { /*Tra PORT  la fun di callback si potrebbe
                                specificare su quale interfaccia vogliamo che stia in ascolto, 
                                se viene omesso come in questo caso, si mette in ascolto su tutte*/
    console.log("Server in ascolto sulla porta " + PORT);
    init();
});

let paginaErrore = "";
function init() {
    fs.readFile("./static/error.html", function (err, data) {
        if (!err)
            paginaErrore = data.toString();
        else
            paginaErrore = "<h1>Risorsa non trovata</h1>";
    });
    fs.readFile("./keys/private.key", function (err, data) {
        if (!err) {
            privateKey = data.toString();
        }
        else {
            //Richiamo la route di gestione degli errori
            console.log("File mancante: private.key");
            server.close();
        }
    })
}

//#region LOG & DEBUG ROUTE

/*LOG DELLA RICHIESTA*/
app.use("/", function (req, res, next) { //Next --> Operatore che consente di far proseguire la scansione -> next();
    // originalUrl contiene la risorsa richiesta
    console.log("----> " + req.method + ": " + req.originalUrl);
    next();
});
/*GESTIONE RISORSE STATICHE*/
app.use("/", express.static("./static")); //Il metodo express.static permette di gestire la richiesta di risorse statica
//Quali pagine o immagini. Se trova nella cartella specificata la risorsa la restituisce e si ferma, altrimenti esegue next()

/*LETTURA PARAMETRI NEL BODY DELLA RICHIESTA*/
app.use("/", bodyParser.urlencoded({ extended: true }));
app.use("/", bodyParser.json());

/*LOG DEI PARAMETRI*/
app.use("/", function (req, res, next) {
    if (req.query != {}) //.query -> parametri url-encoded
        console.log("parametri GET: " + JSON.stringify(req.query));

    if (req.body != {}) // .body -> parametri iniettati dal bodyParser (riga 42-43)
        console.log("parametri BODY: " + JSON.stringify(req.body));

    next();
})

/*ROUTE CHE PERMETTE LA RISPOSTA A QUALUNQUE RICHIESTA*/
app.use("/", function (req, res, next) {
    res.setHeader("Access-Control.Allow-Origin", "*");
    next();
})

//#endregion

//#region ROUTE SPECIFICI

app.post('/api/login', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            const collection = db.collection("Utenti");

            let username = req.body.username;
            collection.findOne({ "username": username }, function (err, dbUser) {
                if (err)
                    res.status(500).send("Internal Error in Query Execution");
                else {
                    if (dbUser == null)
                        res.status(401).send("Username e/o Password non validi");
                    else {
                        bcrypt.compare(req.body.password, dbUser.password, function (err, ok) {
                            if (err)
                                res.status(500).send("Internal Error in bcrypt compare");
                            else {
                                if (!ok)
                                    res.status(401).send("Username e/o Password non validi");
                                else {
                                    let token = createToken(dbUser);
                                    writeCookie(res, token);
                                    currentUser = username;
                                    res.send({ "ris": "ok" });
                                }
                            }
                        });
                    }
                }
                client.close();
            })
        }
    });
});

app.use("/api", function (req, res, next) {
    controllaToken(req, res, next);
});

app.get("/", function (req, res, next) {
    controllaToken(req, res, next);
});

app.get("/index.html", function (req, res, next) {
    controllaToken(req, res, next);
});

app.use("/api/", function (req, res, next) {
    controllaToken(req, res, next);
});

//La route delle risorse statiche DEVE essere eseguita DOPO controllaToken()
app.use('/', express.static("./static"));

/************* INIZIO SERVIZI ***************** */
app.get('/api/test', function (req, res, next) {
    res.send({ "ris": "ok" });
})

app.get("/api/elencoPost", function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            let _id = req.payload["_id"]; //id dell'utente loggato
            let photos = [];
            let people = [];
            async.series({
                "one": function findFollowed(callback) {
                    collection.findOne({ "_id": _id }, function (err, data) {
                        if (err)
                            res.status(500).send("Internal Error in Query Execution");
                        else {

                            collection.aggregate([
                                {
                                    "$match": { "followers": data["username"] }
                                },
                                {
                                    "$project": { "myFotos": 1, "username": 1 }
                                },
                                {
                                    "$unwind": "$myFotos"
                                }]).toArray(function (err, dataFinal) {
                                    if (err)
                                        res.status(500).send("Internal Error in Query Execution");
                                    else {
                                        for (let item of dataFinal) {
                                            photos.push(item["myFotos"]);
                                            people.push(item["username"]);
                                        }
                                        callback(err, data);
                                    }
                                })
                        }
                    })
                },
                "two": function searchPhotos(callback) {
                    collection = db.collection("Foto");
                    collection.find({ "_id": { "$in": photos } }).sort({ "date": -1 }).toArray(function (err, data) {
                        callback(err, data);
                    })
                },
                "three": function findProfiles(callback) {
                    console.log(people);
                    collection = db.collection("Utenti");
                    collection.find({ "username": { "$in": people } }).toArray(function (err, data) {
                        callback(err, data);
                    })
                }
            }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {

                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get("/api/room", function (req, res, next) {
    let user = currentUser;
    friend = req.query["room"];
    let roomNome = user + "/" + friend;
    let roomNome2 = friend + "/" + user;
    console.log(roomName);
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");
            collection.find({ "username": user }).project({ "rooms": { "$elemMatch": { "$or": [{ "name": roomNome }, { "name": roomNome2 }] } } }).toArray(function (err, data) {
                if (err)
                    res.status(503).send("Errore di connessione al database durante l'esecuzione della query");
                else {
                    console.log(data);
                    roomName = data[0]["rooms"][0]["name"];
                    console.log(roomName);
                    res.send({ "ris": "ok" });
                }
            })
        }
    });
})

app.get("/api/followed", function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");
            collection.find({ "username": currentUser }).project({ "followed": 1 }).toArray(function (err, data) {
                if (err)
                    res.status(503).send("Errore di connessione al database durante l'esecuzione della query");
                else {
                    res.send(data);
                }
            })
        }
    });
})

app.get("/api/newChat", function (req, res, next) {
    friend = req.query["friend"];
    let roomNome = currentUser + "/" + friend;
    let roomNome2 = friend + "/" + currentUser;
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");
            collection.find({ "username": currentUser }).project({ "rooms": { "$elemMatch": { "$or": [{ "name": roomNome }, { "name": roomNome2 }] } } }).toArray(function (err, data) {
                if (err)
                    res.status(503).send("Errore di connessione al database durante l'esecuzione della query");
                else {
                    let rooms = data[0]["rooms"];
                    if (rooms == null) {
                        collection.updateMany({ "$or": [{ "username": currentUser }, { "username": friend }] }, { "$push": { "rooms": { "name": roomNome, "messages": [] } } });
                        roomName = roomNome;
                    }
                    else {
                        roomName = rooms[0]["name"];
                    }
                    res.send({ "ris": "ok" });
                }
            })
        }
    });
})

app.get("/api/richiediRoom", function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");
            collection.find({ "username": currentUser }).project({ "rooms.name": 1, "username": 1 }).toArray(function (err, data) {
                if (err)
                    res.status(503).send("Errore di connessione al database durante l'esecuzione della query");
                else {
                    let names = [];
                    let user = data[0]["username"];
                    let rooms = data[0]["rooms"];
                    for (let i in rooms) {
                        let members = rooms[i]["name"].split('/');
                        if (members[0] == user)
                            names.push(members[1]);
                        else
                            names.push(members[0]);
                    }
                    collection.find({ "username": { "$in": names } }).project({ "fotoProfilo": 1, "totCoinProfilo": 1, "username": 1 }).toArray(function (err, data) {
                        if (err)
                            res.status(503).send("Errore di connessione al database durante l'esecuzione della query");
                        else {
                            res.send(data);
                        }
                    })
                }
            })
        }
    });
})

app.get('/api/mioProfilo', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            let _id = req.payload["_id"];
            let utente;
            let foto;
            async.series({
                "one": function mioProfiloUtente(callback) {
                    collection.findOne({ "_id": _id }, function (err, data) {
                        if (err)
                            res.status(500).send("Internal Error in Query Execution");
                        else {
                            utente = data;
                            callback(err, data);
                        }
                    })
                },
                "two": function mioProfiloFoto(callback) {
                    collection = db.collection("Foto");
                    collection.find({ "utente": utente["username"] })
                        .sort({ "date": -1 })
                        .project({ "link": 1 })
                        .toArray(function (err, data) {
                            foto = data;
                            callback(err, data);
                        })
                }
            }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get('/api/addLike', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collectionFoto = db.collection("Foto");

            let idFoto = req.query.idFoto;
            let username = req.payload["username"];

            console.log(idFoto);
            console.log(username);

            collectionFoto.updateOne({ "_id": idFoto }, { "$push": { "likes": username } }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    let collectionUtenti = db.collection("Utenti");

                    collectionUtenti.updateOne({ "username": username }, { "$push": { "myLikesPut": idFoto } }, function (err, data) {
                        if (err)
                            res.status(500).send(err.message);
                        else
                            res.send(JSON.stringify(data));
                        client.close();
                    });
                }
            });
        }
    });
});

app.get('/api/removeLike', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collectionFoto = db.collection("Foto");

            let idFoto = req.query.idFoto;
            let username = req.payload["username"];

            console.log(idFoto);
            console.log(username);

            collectionFoto.updateOne({ "_id": idFoto }, { "$pull": { "likes": username } }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    let collectionUtenti = db.collection("Utenti");

                    collectionUtenti.updateOne({ "username": username }, { "$pull": { "myLikesPut": idFoto } }, function (err, data) {
                        if (err)
                            res.status(500).send(err.message);
                        else
                            res.send(JSON.stringify(data));
                        client.close();
                    });
                }
            });
        }
    });
});

app.get('/api/addCoin', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Foto");

            let idFoto = req.query.idFoto;
            let nCoins = req.query.nCoins;
            let username = req.payload["username"];
            let dataToInsert = username + "/" + nCoins;

            collection.updateOne({ "_id": idFoto },
                { "$push": { "coins": dataToInsert } }, function (err, data) {
                    if (err)
                        res.status(500).send(err.message);
                    else
                        res.send(JSON.stringify(data));
                    client.close();
                })

        }
    });
});

app.get('/api/likesNumber', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Foto");

            let idFoto = req.query.idFoto;

            collection.aggregate([
                { "$match": { "_id": idFoto } },
                { "$project": { "likes": 1 } }
            ]).toArray(function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get('/api/coinsNumber', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Foto");

            let idFoto = req.query.idFoto;

            collection.aggregate([
                { "$match": { "_id": idFoto } },
                { "$project": { "coins": 1 } }
            ]).toArray(function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get('/api/elencoUtenti', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            let testo = req.query.testo;

            collection.find({ "username": { "$regex": "^" + testo } }).toArray(function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get('/api/idUtente', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            idUtente = req.query.idUtente;
            res.send({ "ris": "ok" });
        }
    });
});

app.get('/api/idComments', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Foto");

            currentFoto = req.query.idFoto;

            res.send({ "ris": "ok" });
        }
    });
});

app.get('/api/returnComments', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Foto");

            collection.aggregate([
                { "$match": { "_id": currentFoto } },
                { "$project": { "comments": 1 } }
            ]).toArray(function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(data);
                }
                client.close();
            });
        }
    });
});

app.get('/api/addComment', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Foto");

            let comm = req.query.commento;

            collection.updateOne({ "_id": currentFoto }, { "$push": { "comments": currentUser + ":☺" + comm } },
                function (err, data) {
                    if (err)
                        res.status(500).send(err.message);
                    else {
                        res.send(data);
                    }
                    client.close();
                });
        }
    });
});

app.get('/api/returnProfile', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            let utente;
            let foto;
            async.series({
                "one": function profiloUtente(callback) {
                    collection.findOne({ "_id": idUtente }, function (err, data) {
                        if (err)
                            res.status(500).send("Internal Error in Query Execution");
                        else {
                            utente = data;
                            callback(err, data);
                        }
                    })
                },
                "two": function profiloFoto(callback) {
                    collection = db.collection("Foto");
                    collection.find({ "utente": utente["username"] })
                        .sort({ "date": -1 })
                        .project({ "link": 1 })
                        .toArray(function (err, data) {
                            foto = data;
                            callback(err, data);
                        })
                },
                "three": function returnMyUsername(callback) {
                    callback(err, currentUser);
                }
            }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.get('/api/inizia', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            collection.updateOne({ "username": req.query.yourUsername },
                { "$push": { "followers": req.query.myUsername }, }, function (err, data) {
                    if (err)
                        res.status(500).send(err.message);
                    else {
                        collection.updateOne({ "username": req.query.myUsername },
                            { "$push": { "followed": req.query.yourUsername } }, function (err, data) {
                                if (err)
                                    res.status(500).send(err.message);
                                else
                                    res.send(JSON.stringify(data));
                                client.close();
                            });
                    }
                });
        }
    });
});

app.get('/api/smetti', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            collection.updateOne({ "username": req.query.yourUsername },
                { "$pull": { "followers": req.query.myUsername }, }, function (err, data) {
                    if (err)
                        res.status(500).send(err.message);
                    else {
                        collection.updateOne({ "username": req.query.myUsername },
                            { "$pull": { "followed": req.query.yourUsername } }, function (err, data) {
                                if (err)
                                    res.status(500).send(err.message);
                                else
                                    res.send(JSON.stringify(data));
                                client.close();
                            });
                    }
                });
        }
    });
});

app.get('/api/returnUsername', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            res.send({ "username": currentUser });
        }
    });
});

app.get('/api/stat1', function (req, res, next) {
    let listaFoto = [];
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            async.series({
                "one": function findIdFoto(callback) {
                    collection.aggregate([
                        { "$match": { "username": currentUser } },
                        { "$project": { "myLikesPut": 1 } },
                        { "$unwind": "$myLikesPut" }
                    ]).toArray(function (err, data) {
                        if (err)
                            res.status(500).send("Internal Error in Query Execution");
                        else {
                            for (let item of data) {
                                listaFoto.push(item["myLikesPut"]);
                            }
                            callback(err, data);
                        }
                    })
                },
                "two": function returnAllFoto(callback) {
                    collection = db.collection("Foto");
                    collection.find({ "_id": { "$in": listaFoto } }).toArray(function (err, data) {
                        callback(err, data);
                    })
                }
            }, function (err, data) {
                if (err)
                    res.status(500).send(err.message);
                else {
                    res.send(JSON.stringify(data));
                }
                client.close();
            });
        }
    });
});

app.use("/", fileupload({
    "limits": { "fileSize": (50 * 1024 * 1024) }  //50mb
}));

app.post("/api/upload", function (req, res, next) {
    let files = [];
    let file = req.files.elencoFiles;
    console.log(file);
    let extension = file["mimetype"].split("/");
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Foto");
            let collectionUtenti = db.collection("Utenti");
            let nome = "_";
            collection.aggregate([
                { "$group": { "_id": {}, "num": { "$sum": 1 } } },
                { "$project": { "_id": 0, "num": 1 } }]).toArray(function (err, data) {
                    if (err) {
                        res.status(500).send(err.message);
                    }
                    else {
                        if (data.length != 0)
                            nome += data[0]["num"] + 1;
                        else
                            nome += 1;
                        file.mv(__dirname + "/static/img/" + nome + "." + extension[1]);
                        async.parallel([
                            function (callback) {
                                collectionUtenti.updateOne({ "username": currentUser }, { "$push": { "myFotos": nome } }, function (err, data) {
                                    if (err) {
                                        res.status(500).send(err.message);
                                    }
                                    else
                                        callback(err, data);
                                })
                            },
                            function (callback) {
                                collection.insertOne({ "_id": nome, "link": nome + "." + extension[1], "utente": currentUser, "likes": [], "date": new Date(), "comments": [], "coins": [] }, function (err, data) {
                                    if (err)
                                        res.status(500).send(err.message);
                                    else
                                        callback(err, data);
                                })
                            }
                        ], function (err, data) {
                            if (err)
                                res.status(500).send(err.message);
                            else {
                                res.send({ "ris": "ok" });
                                client.close();
                            }
                        })

                    }
                })

        }
    });

});

app.post('/api/modificaProfilo', function (req, res, next) {
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err) {
            res.status(503).send("Errore di connessione al database");
        }
        else {
            let db = client.db(DBNAME);
            let collection = db.collection("Utenti");

            let _password = req.body.p;
            let _biografia = req.body.b;
            let _foto = req.body.f;
            let currentPassword = req.body.cp;

            if (_password != currentPassword) {
                let regex = new RegExp("^\\$2[ayb]\\$.{56}$");
                let pwd;
                if (!regex.test(_password))
                    pwd = bcrypt.hashSync(_password, 10);

                currentPassword = pwd;
            }

            collection.updateOne({ "username": currentUser },
                { "$set": { "password": currentPassword, "biografia": _biografia, "fotoProfilo": _foto } },
                function (err, data) {
                    if (err)
                        res.status(500).send(err.message);
                    else
                        res.send(JSON.stringify(data));
                    client.close();
                });
        }
    });
});

/*app.post('/api/logout', function(req, res, next) {
    res.set("Set-Cookie", "token=;max-age=-1;Path=/;httponly=true");
    res.send({"ris": "ok"});
});*/
//#endregion

//#region GESTIONE ERRORI

app.use("/", function (req, res, next) {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.json("Risorsa non trovata");
    }
    else
        res.send(paginaErrore);
});

app.use(function (err, req, res, next) {
    if (!err.codice) {
        console.log(err.stack);
        res.codice = 500;
        res.message = "Internal Server Error";
    }
    res.status(err.codice);
    res.send(err.message);
})

//#endregion

//#region FUNCTION
function controllaToken(req, res, next) {
    let token = readCookie(req);
    if (token == "") {
        inviaErrore(req, res, 403, "Token mancante");
    }
    else {
        jwt.verify(token, privateKey, function (err, payload) {
            if (err) {
                inviaErrore(req, res, 403, "Token scaduto o corrotto");
            }
            else {
                let newToken = createToken(payload);
                writeCookie(res, newToken);
                currentUser = payload["username"];
                req.payload = payload;
                next();
            }
        });
    }
}

function inviaErrore(req, res, code, errorMessage) {
    res.status(code).send(errorMessage);
}

function readCookie(req) {
    let valoreCookie = "";
    if (req.headers.cookie) {
        let cookies = req.headers.cookie.split(';');
        for (let item of cookies) {
            item = item.split('=');
            if (item[0].includes("token")) {
                valoreCookie = item[1];
                break;
            }
        }
    }
    return valoreCookie;
}

//data --> record dell'utente
function createToken(data) {
    //sign() --> si aspetta come parametro un json con i parametri che si vogliono mettere nel token
    let json = {
        "_id": data["_id"],
        "username": data["username"],
        "iat": data["iat"] || Math.floor((Date.now() / 1000)),
        "exp": (Math.floor((Date.now() / 1000)) + TTL_Token)
    }
    let token = jwt.sign(json, privateKey);
    console.log(token);
    return token;

}

function writeCookie(res, token) {
    //set() --> metodo di express che consente di impostare una o più intestazioni nella risposta HTTP
    res.set("Set-Cookie", `token=${token};max-age=${TTL_Token};path=/;httponly=true`);
}
//#endregion

//#region CHAT

let users = [];
io.on('connection', function (socket) {
    let user = {}; // contiene le info dell'utente corrente
    mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
        if (err)
            res.status(503).send("Errore di connessione al database");
        else {
            const db = client.db(DBNAME);
            let collection = db.collection("Utenti");
            collection.find({ "username": currentUser }).project({ "rooms": { "$elemMatch": { "name": roomName } } }).toArray(function (err, data) {
                if (err)
                    res.status(500).send("Internal Error in Query Execution");
                else {
                    if (data.length > 0)
                        socket.emit("messaggiDaCaricare", data);
                    socket.join(roomName);
                }
            })
        }
        user.username = currentUser;
        user.socket = socket;
        users.push(user);
        socket.emit("yourName", currentUser);
        log(' User ' + colors.yellow(user.username) + ' (SocketID ' + colors.green(user.socket.id) + ')  connected!');

    });

    // 2) ricezione di un messaggio	 
    socket.on('message', function (data) {
        log('User ' + colors.yellow(user.username) + "-" + colors.white(user.socket.id) + ' sent ' + colors.green(data));
        let date = new Date();
        let response = JSON.stringify({
            'from': user.username,
            'message': data,
            'date': date
        });
        mongoClient.connect(CONNECTIONSTRING, CONNECTIONOPTIONS, function (err, client) {
            if (err)
                res.status(503).send("Errore di connessione al database");
            else {
                const db = client.db(DBNAME);
                let collection = db.collection("Utenti");
                let aus = (user.username);
                collection.updateMany({ "rooms.name": roomName }, { "$push": { "rooms.$.messages": date + "/" + aus + "/" + data } });
            }
        });
        io.to(roomName).emit('notify_message', response);
        // notifico a tutti i socket (compreso il mittente) il messaggio appena ricevuto 
        //io.sockets.emit('notify_message', response);
    });

});

// stampa i log con data e ora
function log(data) {
    console.log(colors.cyan("[" + new Date().toLocaleTimeString() + "]") + ": " + data);
}


//#endregion


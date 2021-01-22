"use strict"

$(document).ready(function () {
    let txtPassword = $("#txtPassword");
    let txtBiografia = $("#txtBiografia");
    let txtFoto = $("#txtFotoProfilo");

    let password, bio, foto;
    let currentPassword;

    let request = inviaRichiesta("GET", "/api/mioProfilo");
    request.fail(function (jqXHR, testStatus, strError) {
        errore(jqXHR, testStatus, strError);
    });
    request.done(function (data) {
        password = data["one"]["password"];
        bio = data["one"]["biografia"];
        foto = data["one"]["fotoProfilo"];
        currentPassword=data["one"]["password"];
    });

    $("#btnModifica").on("click", modifica);

    function modifica() {
        if (txtPassword.val() != "")
            password = txtPassword.val();
        if (txtBiografia.val() != "")
            bio = txtBiografia.val();
        if (txtFoto.val() != "")
            foto = txtFoto.val();
        let request = inviaRichiesta("POST", "/api/modificaProfilo",
            {"p": password, "b": bio, "f": foto, "cp":currentPassword});
        request.fail(function (jqXHR, testStatus, strError) {
            errore(jqXHR, testStatus, strError);
        });
        request.done(function (data) {
            console.log(data);
            txtPassword.val("");
            txtBiografia.val("");
            txtFoto.val("");
            window.location.href = "../myProfile.html";
        });
    }

})
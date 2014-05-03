window.onload = function() {
    document.getElementById("handle").focus();                                 //Focus on the handle box
}

function valHandleFct() {
    var handle = document.getElementById("handle").value;                      //Get the handle you typed in
    var valhandle = /^[a-z0-9]*[A-Z][a-z0-9]*$/.test(handle);                  //Validate the handle
    var override = handle.substr(0,9) === "override_";                         //Override prefix
    if(valhandle || override) {                                                //If validation was successful or the override prefix was used
        window.location.href="./chat?nick=" + handle;                          //Go to the main page
    } else {
        //Rejection alert
        alert("That is not a valid chumhandle.\nA chumhandle must not start with a capital letter, have a single capital letter, and contain only alphanumeric characters.")
    }

    return false;                                                              //Prevent the form's default action
}
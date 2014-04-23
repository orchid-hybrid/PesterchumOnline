var client = {};                                                               //Client object
var forcequit = false;                                                         //Forcequit variable

window.onload = function() {
    if(Modernizr.sessionstorage) {                                             //Check for HTML5 sessionStorage support
        var nick = sessionStorage.getItem("handle");                           //Get the handle you put in
        sessionStorage.removeItem("handle");                                   //Empty the sessionStorage variable
    } else {                                                                   //If no sessionStorage support
        var nick = window.name;                                                //Use window.name
        window.name = "";                                                      //Clear window.name
    }

    if(!nick || /^[a-z][a-z0-9]*[A-Z][a-z0-9]*$/.test(nick)===false) {         //If you went straight to the page or the handle doesn't validate
        forcequit=true;                                                        //Force quit
        window.location.replace("./");                                         //Back to index
    }

    $("#mynick").html("You are "+nick+".");                                    //Your current nick
    $.post('./znewclient', {nick:nick}, function(data){                        //Request a new client from the server
        client = data;                                                         //Fill the returned client details into the client object
    });
    
    var updateInterval = setInterval(function(){                               //Automatic update
        ircUpdateFct();                                                        //Update
    },750);                                                                    //.75 seconds
    
    $("#joinsend").click(function() {                                          //Join button
        joinMemoFct($("#joinfield").val());                                    //Join the memo
        $("#joinfield").val("");                                               //Empty the join input
    });
    
    $("#send").click(function() {                                              //Send button
        var curchan = "#PesterchumOnline";
        sendMessageFct(curchan,$("#field").val());                             //Send the message
        $("#field").val("");                                                   //Empty the message input
    });
}

window.onbeforeunload = function() {                                           //Catch closing the page
    if(forcequit==false) {                                                     //If we're not forcing a quit
        return "If you leave this page, you will disconnect from the server and close all memos/pesters."; //Request confirmation
    }
};

function ircUpdateFct() {
    $.post('./zupdate', {id:client.id}, function(data){                        //Request an update from the server
        $('#content').html(data.join("<br>"));                                 //Load in this client's log
    }).error(function() {                                                      //If the server isn't responding
        forcequit = true;                                                      //Force a quit
        location.reload();                                                     //Reload to try and request the page again
    });
    var histel = document.getElementById('content');                           //Chat log
    histel.scrollTop = histel.scrollHeight;                                    //Scroll to the bottom
}

function joinMemoFct(memo) {
    if(client.channels.indexOf(memo)===-1) {                                   //Make sure you're not already in the requested memo
        $.post('./zjoinmemo', {id:client.id, memo:memo}, function(data){       //Request a memo join from the server
            console.log("Joined "+memo);                                       //Success
        });
    }
}

function sendMessageFct(memo,message) {
    $.post('./zsendmessage', {id:client.id, memo:memo, message:message}, function(data){ //Request a message send from the server
        console.log("Sent message "+message+" to "+memo);                      //Success
    });
}
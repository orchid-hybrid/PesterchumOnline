var client = {};                                                               //Client object
var forcequit = false;                                                         //Forcequit variable
var curchan = "#PesterchumOnline";                                             //Selected channel

window.onload = function() {
    "use strict";
    var nick = document.URL.split("?nick=")[1];
    if(nick.substr(0,9) === "override_") {
        nick = nick.substr(9);
    }

    $("#mynick").html("You are "+nick+".");                                    //Your current nick
    $.post('./znewclient', {nick:nick}, function(data){                        //Request a new client from the server
        client = data;                                                         //Fill the returned client details into the client object
        ircUpdateFct();                                                        //Update
    });
    
    var updateInterval = setInterval(function(){                               //Automatic update
        ircUpdateFct();                                                        //Update
    },750);                                                                    //.75 seconds
    
    $("#joinsend").click(function() {                                          //Join button
        joinMemoFct($("#joinfield").val());                                    //Join the memo
        $("#joinfield").val("");                                               //Empty the join input
    });
    
    $("#send").click(function() {                                              //Send button
        sendMessageFct(curchan,$("#field").val());                             //Send the message
        $("#field").val("");                                                   //Empty the message input
    });

    $("#memoselect").change(function() {
        curchan = $("#memoselect").val();                                      //Get the selected memo from the dropdown
    });
};

window.onbeforeunload = function() {                                           //Catch closing the page
    "use strict";
    if(forcequit === false) {                                                  //If we're not forcing a quit
        return "If you leave this page, you will disconnect from the server and close all memos/pesters."; //Request confirmation
    }
};

function ircUpdateFct() {
    "use strict";
    $.post('./zupdate', {id:client.id}, function(data){                        //Request an update from the server
        $('#content').html(data[0].join("<br>"));                              //Load in this client's log
        client = data[1];                                                      //Load in this client's object
        var memolist = "";                                                     //String to hold dropdown HTML
        for(var i = 0; i < client.channels.length; i++) {                      //Loop through all channels
            if(client.channels[i] === "#pesterchum") { continue; }             //Skip #pesterchum
            if(client.channels[i] === curchan) {
                memolist += "<option selected>" + client.channels[i] + "</option>"; //Option tag for the current channel (selected)
            } else {
                memolist += "<option>" + client.channels[i] + "</option>";     //Option tag for the other channels
            }
        };
        $("#memoselect").html(memolist);                                       //Put option tag HTML into the dropdown
    }).error(function() {                                                      //If the server isn't responding
        forcequit = true;                                                      //Force a quit
        location.reload();                                                     //Reload to try and request the page again
    });
    var histel = document.getElementById('content');                           //Chat log
    histel.scrollTop = histel.scrollHeight;                                    //Scroll to the bottom
}

function joinMemoFct(memo) {
    "use strict";
    if(client.channels.indexOf(memo)===-1) {                                   //Make sure you're not already in the requested memo
        $.post('./zjoinmemo', {id:client.id, memo:memo}, function(data){       //Request a memo join from the server
            console.log("Joined "+memo);                                       //Success
        });
    }
}

function sendMessageFct(memo,message) {
    "use strict";
    $.post('./zsendmessage', {id:client.id, memo:memo, message:message}, function(data){ //Request a message send from the server
        console.log("Sent message "+message+" to "+memo);                      //Success
    });
}
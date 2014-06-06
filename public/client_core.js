var client = {},                                                               //Client object
    forcequit = false,                                                         //Forcequit variable
    curchan = "#PesterchumOnline";                                             //Selected channel

function ircUpdateFct() {
    "use strict";
    var histel, memolist;
    $.post('./zupdate', {id:client.id}, function(data){                        //Request an update from the server
        $('#content').html(data[0].join("<br>"));                              //Load in this client's log
        client = data[1];                                                      //Load in this client's object
        memolist = "";                                                         //String to hold dropdown HTML
        for(var i = 0; i < client.channels.length; i++) {                      //Loop through all channels
            if(client.channels[i] === "#pesterchum") { continue; }             //Skip #pesterchum
            if(client.channels[i] === curchan) {
                memolist += "<option selected>" + client.channels[i] + "</option>"; //Option tag for the current channel (selected)
            } else {
                memolist += "<option>" + client.channels[i] + "</option>";     //Option tag for the other channels
            }
        }
        $("#memoselect").html(memolist);                                       //Put option tag HTML into the dropdown
        $("#colorsquare").css("background-color", "rgb(" + client.color + ")"); //Text color
        $("#mynick").html(client.nick);                                        //Nick
    }).error(function() {                                                      //If the server isn't responding
        forcequit = true;                                                      //Force a quit
        location.reload();                                                     //Reload to try and request the page again
    });
    histel = document.getElementById('content');                               //Chat log
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

window.onload = function() {
    "use strict";
    var nick = document.URL.split("?nick=")[1],
        updateInterval;
    if(nick.substr(0,9) === "override_") {
        nick = nick.substr(9);
    }

    $("#mynick").html(nick);                                                   //Your current nick
    $.post('./znewclient', {                                                   //Request a new client from the server
        nick: nick,
        color: "255,0,0"                                                       //Hardcoded color for now
    }, function(data){
        var rgb, r, g, b, hex;
        client = data;                                                         //Fill the returned client details into the client object
        ircUpdateFct();                                                        //Update

        //Convert RGB text color to hex
        rgb = client.color.split(",");                                         //Split commas
        r = parseInt(rgb[0], 10);                                              //Convert to integer
        g = parseInt(rgb[1], 10);                                              //Convert to integer
        b = parseInt(rgb[2], 10);                                              //Convert to integer
        hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); //Bitwise ops and hash prefix
        $("#colorsquare").css("background-color", hex); //Set colorsquare
        
        $("#colorsquare").ColorPicker({
            color: hex,
            onShow: function (colpkr) {
                $(colpkr).fadeIn(150);
                return false;
            },
            onHide: function(colpkr) {
                $(colpkr).fadeOut(150);
                return false;
            },
            onSubmit: function(hsb, hex, rgb, obj, colpkr) {
                var rgb = rgb.r + "," + rgb.g + "," + rgb.b;
                $("#colorsquare").css("background-color", "rgb(" + rgb + ")");
                $(colpkr).fadeOut(150);
                $.post('./zchangecolor', {
                    id: client.id,
                    color: rgb
                });
                ircUpdateFct();                                                //Force update
                return false;
            }
        });

        $("#mynick").click(function() {
            var newnick = prompt("New nick:");                                 //Change this to a floaty div thing at some point
            if(!newnick) { return false; }                                     //Stop if you clicked cancel
            var valhandle = /^[a-z0-9]*[A-Z][a-z0-9]*$/.test(newnick),         //Validate the new nick
                override = newnick.substr(0,9) === "override_";                //Override prefix
            
            if(valhandle || override) {
                $.post('./zchangenick', {
                    id: client.id,
                    nick: newnick
                }, function(success) {
                    if(success) {
                        ircUpdateFct();
                    } else {
                        //Rejection alert
                        alert("That is not a valid chumhandle.\nA chumhandle must not start with a capital letter, have a single capital letter, and contain only alphanumeric characters.");
                    }
                });
            } else {
                //Rejection alert
                alert("That is not a valid chumhandle.\nA chumhandle must not start with a capital letter, have a single capital letter, and contain only alphanumeric characters.");
            }
        });
    });
    
    updateInterval = setInterval(function(){                                   //Automatic update
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
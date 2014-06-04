//Environment setup
var port = +process.env.PORT || 612,                                           //Use :612 if we're testing locally; environment port if we're live
    express = require("express"),
    irc = require("irc"),
    bodyParser = require("body-parser"),
    ejs = require('ejs'),
    pjson = require("./package.json"),
    app = express(),

//Declare some global variables
    clientstotal = 0,                                                          //Client ID counter
    clients = [null],                                                          //Client data objects (start with a null entry so the client counter lines up with the index of each client)
    connections = [],                                                          //IRC client objects
    clientlogs = [],                                                           //Client message logs
    pingchecks = [],                                                           //Ping update intervals
    Pesterchum = {                                                             //Pesterchum helper object
        Messages: {}                                                           //Message emitters
    },
    debug = {
        airplane: false,
        suppressed: false
    },
    ip;

function applog(text) {
    "use strict";
    if(!debug.suppressed) { console.log("  " + text) };
}

function killClientFct(id, reason) {
    "use strict";
    if(reason===undefined) { reason = "Quit"; }                                //If you didn't specify a reason, assume it was a normal quit
    if(!debug.airplane) { connections[id].disconnect(reason); }                //Disconnect the client with the specified reason
    applog("Killed client " + id + " (" + clients[id].nick + ") for reason " + reason + "."); //Log
}

function htmlFormatFct(message) {
    "use strict";
    var urlregex = /((?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s<]*)?)/i;
    return message.replace(/<[cC]=(\d{1,3},\d{1,3},\d{1,3})>/g,"<c=rgb($1)>")  //Convert RGB color codes to CSS RGB syntax
                  .replace(/<[cC]=([^>]*)>/g,"<span style='color: $1'>")       //Convert all color tags to spans
                  .replace(/<\/c>/g,"</span>")                                 //Convert closing color tags to closing spans
                  .replace(/\s{2,}/g," ")                                      //Remove extra spaces
                  .replace(urlregex, "<a href='$1'>$1</a>");                   //Replace URls with links
}

function getIPFct(req) {
    "use strict";
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

function denyRequestFct(reason) {
    "use strict";
    applog("Request denied (" + reason + ")");
}

function pad(num, len) {
    "use strict";
    return ("000000000000000" + num).slice(-len);                              //Add a bunch of zeroes to the front and slice from the end
}

Pesterchum.getPrefixFct = function(handle) {
    "use strict";
    return handle[0].toUpperCase() + /[A-Z]/.exec(handle)[0];                  //Return the handle's prefix
};

Pesterchum.validateHandleFct = function(handle) {
    "use strict";
    return (/^[a-z0-9]*[A-Z][a-z0-9]*$/).test(handle);
};

Pesterchum.Messages.time = function(time) {
    "use strict";
    time = time || "?";                                                        //Default to ??:??

    if(time === 0) {
        return "PESTERCHUM:TIME>i";                                            //Current time
    }

    if(time > 0) {
        time = pad(time, 4);                                                   //Pad to four digits
        time = time.substr(0, 2) + ":" + time.substr(2);                       //Insert a colon into the middle
        return "PESTERCHUM:TIME>F" + time;                                     //Future time
    }

    if(time < 0) {
        time = pad(-time, 4);                                                  //Flip from negative to positive and pad to four digits
        time = time.substr(0, 2) + ":" + time.substr(2);                       //Insert a colon into the middle
        return "PESTERCHUM:TIME>P" + time;                                     //Past time
    }

    return "PESTERCHUM:TIME>?";                                                //Unknown time
};

Pesterchum.Messages.mood = function(mood) {
    "use strict";
    mood = mood || "chummy";                                                   //Default to chummy
    //Taken directly from Pesterchum's mood.py file
    var moods = ["chummy", "rancorous", "offline", "pleasant", "distraught",
                 "pranky", "smooth", "ecstatic", "relaxed", "discontent",
                 "devious", "sleek", "detestful", "mirthful", "manipulative",
                 "vigorous", "perky", "acceptant", "protective", "mystified",
                 "amazed", "insolent", "bemused" ],
                 moodnum = moods.indexOf(mood.toLowerCase());                  //Get the index of the requested mood

    if(moodnum !== -1) {                                                       //If the requested mood matched
        return "MOOD >" + moodnum;                                             //Return the mood message with the requested mood's index
    }

    //If the requested mood did not match
    applog("Requested mood " + mood + " not found; defaulting to chummy.");    //Log the mistake
    return "MOOD >0";                                                          //Default to chummy
};

if(!debug.suppressed) {
    console.log("PCO v" + pjson.version + " started.");                            //Log startup
}

//Setting stuff up
app.engine('htm', ejs.renderFile);
    applog("Configured HTML engine using EJS.");
app.set('view engine', "html");
    applog("Using HTML as view engine.");
app.use(bodyParser());
    applog("Loaded bodyParser.");
app.set('views', __dirname + '/views');
    applog("Serving views on /views.");
app.use(express.static(__dirname + '/public'));
    applog("Serving resources on /public.");
app.listen(port);
    applog("Listening on port " + port + ".");

//Listeners
app.get("/", function(req, res){                                               //Index
    "use strict";
    res.render("index.htm");                                                   //Render index.htm
    ip = getIPFct(req);                                                        //Client IP address
    applog("Rendered index.htm for " + ip + ".");                              //Log
});
app.get("/chat", function(req, res){                                           //Chat page
    "use strict";
    var nick = req.param("nick"),                                              //Get the requested nick
        override = nick.substr(0,9) === "override_";                           //Override prefix

    if(!Pesterchum.validateHandleFct(nick) && !override) {                     //Check to see if the handle fails validation
        ip = getIPFct(req);                                                    //Client IP address
        applog("Rejected invalid handle request from " + ip + ".");            //Log rejection
        res.redirect("/");                                                     //HTTP 502 back to the index page
        return false;                                                          //Stop processing
    }

    res.render("chat.htm");                                                    //Render chat.htm
    ip = getIPFct(req);                                                        //Client IP address
    applog("Rendered chat.htm for " + ip + ".");                               //Log
});

app.post("/zupdate", function(req, res){                                       //Update interval
    "use strict";
    var clientid = req.body.id;                                                //Get the client's ID
    clients[clientid].missedpings = 0;                                         //Reset the client's missed pings to 0
    res.send([clientlogs[clientid], clients[clientid]]);                       //Give the client its chatlog and its object
});

app.post("/zjoinmemo", function(req, res){                                     //Joining a memo
    "use strict";
    var clientid = req.body.id,                                                //Get the client's ID
        memo;

    if(clients[clientid].ready) {
        if(req.body.memo[0] === "#") {                                         //If you prefixed the memo with a #
            memo = req.body.memo;                                              //Get the requested memo
        } else {                                                               //If you didn't prefix the memo with a #
            memo = "#" + req.body.memo;                                        //Get the requested memo and add the #
        }
        if(!debug.airplane) { connections[clientid].join(memo); }              //Join the requested memo
        clients[clientid].channels.push(memo);                                 //Add the requested memo the client object's channel list
        applog("Client " + clientid + " joined memo " + memo + ".");           //Log
    } else {
        applog("Client " + clientid + " attempted to join memo " + memo + "."); //Log
        denyRequestFct("client was not ready");
    }
});

app.post("/zsendmessage", function(req, res){                                  //Sending a message
    "use strict";
    var clientid = req.body.id,                                                //Get the client's ID
        targ = req.body.memo,                                                  //Get the requested target
        message = req.body.message,                                            //Get the message
        handle = clients[clientid].nick,                                       //Get the client's handle
        color = clients[clientid].color,                                       //Get the client's text color
        prefix;

    if(clients[clientid].ready) {
        prefix = Pesterchum.getPrefixFct(handle);                              //Get the client's prefix
        message = "<c=" + color + ">" + prefix + ": " + message + "</c>";      //Compile actual message
        if(!debug.airplane) { connections[clientid].say(targ, message); }      //Send the message
        var htmlmsg = "<span style='font-weight:bold'>" + targ + ": </span>" + message; //HTML Channel prefix - to be removed in favor of tabs
        clientlogs[clientid].push(htmlFormatFct(htmlmsg));                     //Add the message to the client log

        applog("Client " + clientid + " sent message \"" + message + "\" to memo " + targ + "."); //Log
    } else {
        applog("Client " + clientid + " attempted to send message \"" + message + "\" to memo " + targ + "."); //Log
        denyRequestFct("client was not ready");
    }
});

app.post("/zchangecolor", function(req, res){                                  //Color change
    "use strict";
    var clientid = req.body.id;                                                //Get the client's ID
    var color = req.body.color;                                                //Get the requested color
    clients[clientid].color = color;                                           //Change the client's color
});

app.post("/zchangenick", function(req, res){                                   //Color change
    "use strict";
    var clientid = req.body.id;                                                //Get the client's ID
    var nick = req.body.nick,                                                  //Get the requested nick
        override = nick.substr(0,9) === "override_";                           //Override prefix

    if(!Pesterchum.validateHandleFct(nick) && !override) {                     //Check to see if the handle fails validation
        ip = getIPFct(req);                                                    //Client IP address
        applog("Rejected invalid handle request from " + ip + ".");            //Log rejection
        res.send(false);                                                       //Tell the client
        return false;                                                          //Stop processing
    }

    if(nick.substr(0,9) === "override_") {
        nick = nick.substr(9);
    }
    
    clients[clientid].nick = nick;                                             //Change the client's nick
    connections[clientid].send("NICK", nick);                                  //Send the nick change to the server
    res.send(true);                                                            //Tell the client
});

app.post("/znewclient", function(req, res){                                    //Initial new client request
    "use strict";
    var nick = req.body.nick,                                                  //Get the requested nick
        id, config;
    ip = getIPFct(req);                                                        //Client IP address
    applog("Responded to /znewclient request from " + ip + ".");               //Log response

    clientstotal += 1;                                                         //Increment the client counter
    id = clientstotal;                                                         //Put the client counter into an ID variable for readability
    config = {                                                                 //Create the new client
      "id": id,                                                                //Unique ID
      "nick": nick,                                                            //Handle
      "color": req.body.color,                                                 //Text color
//    "userName": "pco" + id,                                                  //Username using ID
      "userName": "pcc31",                                                     //Spoof Pesterchum client
      "realName": "pco" + id,                                                  //Realname using ID - to be removed in favor of IP address or hostmask
      "missedpings": 0,                                                        //Number of updates missed
      "channels": ["#pesterchum","#PesterchumOnline"],                         //Initial channels
      "ready": false                                                           //Connection ready boolean
    };
    clients.push(config);
    
    pingchecks[id] = setInterval(function(){                                   //Create a pingcheck interval for the new client
        clients[id].missedpings += 1;                                          //Increment the missed pings by one
        if(clients[id].missedpings >= 5) {                                     //If the client has missed five pings
            killClientFct(id,"Ping timeout");                                  //Kill the client
            clearInterval(pingchecks[id]);                                     //Clear the interval
        }
    }, 750);                                                                   //Checks for a ping every .75 seconds
    
    clientlogs[id] = [];                                                       //Create a log for the client
    
    if(!debug.airplane) {
        connections[id] = new irc.Client("irc.mindfang.org", nick, {           //Connect to the server
            channels: config.channels,
            userName: config.userName,
            realName: config.realName,
            autoRejoin: false
        });
        connections[id].addListener("message", function(from, to, text, message) {
            var channel = message.args[0],                                     //Set the channel
                msgtext = message.args[1],                                     //Set the message text
                lastchar;

            lastchar = msgtext.charAt(msgtext.length - 1);                     //Get the last character of the message
            if(lastchar !== " ") { msgtext += " "; }                           //If it's not a space, add a space. This solves IRC + chumdroid issues.
            
            msgtext = htmlFormatFct(msgtext);
            
            if(channel !== "#pesterchum" && msgtext.search("PESTERCHUM:TIME>")===-1) { //Ignore #pesterchum and PESTERCHUM:TIME messages
                clientlogs[id].push("<span style='font-weight:bold'>" + channel + ": </span>" + msgtext); //HTML Channel prefix - to be removed in favor of tabs
            }
        });
        connections[id].addListener("registered", function() {
            clients[id].ready = true;
        });
    }
    
    res.send(config);                                                          //Give the client its object
    applog("Created new client with ID of " + clientstotal + " and handle of " + nick + ".");
});
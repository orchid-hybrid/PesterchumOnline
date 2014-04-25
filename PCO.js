//Environment setup
var port = +process.env.PORT || 612;                                           //Use :612 if we're testing locally; environment port if we're live
var express = require("express"),
    irc = require("irc"),
    bodyParser = require("body-parser"),
    ejs = require('ejs');
var pjson = require("./package.json");
var app = express();

//Declare some global variables
var clientstotal = 0;                                                          //Client ID counter
var clients = [null];                                                          //Client data objects (start with a null entry so the client counter lines up with the index of each client)
var connections = [];                                                          //IRC client objects
var clientlogs = [];                                                           //Client message logs
var pingchecks = [];                                                           //Ping update intervals
var Pesterchum = {                                                             //Pesterchum helper object
    Messages: {}                                                               //Message emitters
};

function applog(text) {
    console.log("  "+text);
}

function killClientFct(id,reason) {
    if(reason===undefined) { reason = "Quit"; }                                //If you didn't specify a reason, assume it was a normal quit
    connections[id].disconnect(reason);                                        //Disconnect the client with the specified reason
    applog("Killed client "+id+" for reason "+reason+".");                     //Log
}

function htmlFormatFct(message) {
    var urlregex = /((?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s<]*)?)/i;
    return message.replace(/<[cC]=(\d{1,3},\d{1,3},\d{1,3})>/g,"<c=rgb($1)>")  //Convert RGB color codes to CSS RGB syntax
                  .replace(/<[cC]=([^>]*)>/g,"<span style='color: $1'>")       //Convert all color tags to spans
                  .replace(/<\/c>/g,"</span>")                                 //Convert closing color tags to closing spans
                  .replace(/\s{2,}/g," ")                                      //Remove extra spaces
                  .replace(urlregex, "<a href='$1'>$1</a>");                   //Replace URls with links
}

function getIPFct(req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
}

function pad(num,len) {
    return ("000000000000000" + num).slice(-len);                               //Add a bunch of zeroes to the front and slice from the end
}

Pesterchum.getPrefixFct = function(handle) {
    return handle[0].toUpperCase()+/[A-Z]/.exec(handle)[0];                     //Return the handle's prefix
}
Pesterchum.Messages.time = function(time) {
    time = time ? time : "?";                                                   //Default to ??:??
    if(time === 0) {
        return "PESTERCHUM:TIME>i";                                             //Current time
    } else if (time > 0) {
        time = pad(time,4);                                                     //Pad to four digits
        time = time.substr(0, 2) + ":" + time.substr(2);                        //Insert a colon into the middle
        return "PESTERCHUM:TIME>F" + time;                                      //Future time
    } else if (time < 0) {
        time = pad(-time,4);                                                    //Flip from negative to positive and pad to four digits
        time = time.substr(0, 2) + ":" + time.substr(2);                        //Insert a colon into the middle
        return "PESTERCHUM:TIME>P" + time;                                      //Past time
    } else {
        return "PESTERCHUM:TIME>?";                                             //Unknown time
    }
}
Pesterchum.Messages.mood = function(mood) {
    mood = mood ? mood : "chummy";                                              //Default to chummy
    //Taken directly from Pesterchum's mood.py file
    moods = ["chummy", "rancorous", "offline", "pleasant", "distraught",
             "pranky", "smooth", "ecstatic", "relaxed", "discontent",
             "devious", "sleek", "detestful", "mirthful", "manipulative",
             "vigorous", "perky", "acceptant", "protective", "mystified",
             "amazed", "insolent", "bemused" ];
    var moodnum = moods.indexOf(mood.toLowerCase());                            //Get the index of the requested mood

    if(moodnum != -1) {                                                         //If the requested mood matched
        return "MOOD >" + moodnum;                                              //Return the mood message with the requested mood's index
    } else {                                                                    //If the requested mood did not match
        applog("Requested mood " + mood + " not found; defaulting to chummy.")  //Log the mistake
        return "MOOD >0";                                                       //Default to chummy
    }
}

console.log("PCO v"+pjson.version+" started.");                                 //Log startup

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
    applog("Listening on port "+port+".");

//Listeners
app.get("/", function(req, res){                                               //Index
    res.render("index.htm");                                                   //Render index.htm
    var ip = getIPFct(req);                                                    //Client IP address
    applog("Rendered index.htm for "+ip+".");                                  //Log
});
app.get("/chat", function(req, res){                                           //Chat page
    res.render("chat.htm");                                                    //Render chat.htm
    var ip = getIPFct(req);                                                    //Client IP address
    applog("Rendered chat.htm for "+ip+".");                                   //Log
});

app.post("/zupdate", function(req, res){                                       //Update interval
    var clientid = req.body.id;                                                //Get the client's ID
    clients[clientid].missedpings = 0;                                         //Reset the client's missed pings to 0
    res.send([clientlogs[clientid],clients[clientid]]);                        //Give the client its chatlog and its object
});

app.post("/zjoinmemo", function(req, res){                                     //Joining a memo
    var clientid = req.body.id;                                                //Get the client's ID
    if(req.body.memo[0] === "#") {                                             //If you prefixed the memo with a #
        var memo = req.body.memo;                                              //Get the requested memo
    } else {                                                                   //If you didn't prefix the memo with a #
        var memo = "#"+req.body.memo;                                          //Get the requested memo and add the #
    }
    connections[clientid].join(memo);                                          //Join the requested memo
    clients[clientid].channels.push(memo);                                     //Add the requested memo the client object's channel list
    applog("Client "+clientid+" joined memo "+memo+".");                       //Log
});

app.post("/zsendmessage", function(req, res){                                  //Sending a message
    var clientid = req.body.id;                                                //Get the client's ID
    var targ = req.body.memo;                                                  //Get the requested target
    var message = req.body.message;                                            //Get the message
    var handle = clients[clientid].nick;                                       //Get the client's handle
    var prefix = Pesterchum.getPrefixFct(handle);                              //Get the client's prefix

    message = "<c=255,0,0>"+prefix+": "+message+"</c>";                        //Compile actual message
    connections[clientid].say(targ,message);                                   //Send the message
    var htmlmsg = "<span style='font-weight:bold'>"+targ+": </span>"+message;  //HTML Channel prefix - to be removed in favor of tabs
    clientlogs[clientid].push(htmlFormatFct(htmlmsg));                         //Add the message to the client log

    applog("Client "+clientid+" sent message \""+message+"\" to memo "+targ+"."); //Log
});

app.post("/znewclient", function(req, res){                                    //Initial new client request
    var ip = getIPFct(req);                                                    //Client IP address
    applog("Responded to /znewclient request from "+ip+".");                   //Log response
    var nick = req.body.nick;                                                  //Get the requested nick
    
    clientstotal++;                                                            //Increment the client counter
    var id = clientstotal;                                                     //Put the client counter into an ID variable for readability
    clients.push({                                                             //Create the new client
                  "id": id,                                                    //Unique ID
                  "nick": nick,                                                //Handle
//                "userName": "pco"+id,                                        //Username using ID
                  "userName": "pcc31",                                         //Spoof Pesterchum client
                  "realName": "pco"+id,                                        //Realname using ID - to be removed in favor of IP address or hostmask
                  "missedpings": 0,                                            //Number of updates missed
                  "channels": ["#pesterchum","#PesterchumOnline"]              //Initial channels
                 });
    var config = clients[id];
    
    pingchecks[id] = setInterval(function(){                                   //Create a pingcheck interval for the new client
        clients[id].missedpings += 1;                                          //Increment the missed pings by one
        if(clients[id].missedpings >= 5) {                                     //If the client has missed five pings
            killClientFct(id,"Ping timeout");                                  //Kill the client
            clearInterval(pingchecks[id]);                                     //Clear the interval
        }
    },750);                                                                    //Checks for a ping every .75 seconds
    
    clientlogs[id] = [];                                                       //Create a log for the client
    
    connections[id] = new irc.Client("irc.mindfang.org", nick, {               //Connect to the server
        channels: config.channels,
        userName: config.userName,
        realName: config.realName
    });
    connections[id].addListener("message", function(from, to, text, message) {
        var channel = message.args[0];                                         //Set the channel
        var msgtext = message.args[1];                                         //Set the message text
        
        var lastchar = msgtext.charAt(msgtext.length - 1);                     //Get the last character of the message
        if(lastchar != " ") { msgtext += " "; }                                //If it's not a space, add a space. This solves IRC+chumdroid issues.
        
        msgtext = htmlFormatFct(msgtext);
        
        if(channel!="#pesterchum" && msgtext.search("PESTERCHUM:TIME>")===-1) { //Ignore #pesterchum and PESTERCHUM:TIME messages
            clientlogs[id].push("<span style='font-weight:bold'>"+channel+": </span>"+msgtext); //HTML Channel prefix - to be removed in favor of tabs
        }
    });
    
    res.send(config);                                                          //Give the client its object
    applog("Created new client with ID of "+clientstotal+" and handle of "+nick+".");
});
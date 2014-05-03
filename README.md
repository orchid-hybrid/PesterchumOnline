Pesterchum Online
================
This is the repository for Pesterchum Online, a browser-based client for the Pesterchum IRC network. It runs off NodeJS, using the NodeIRC library. Express and EJS are used for serving pages.

##Getting started  
PCO uses NodeJS - if you haven't installed that yet, [do so](http://nodejs.org/download/).  
Run `npm install` in the root directory to get all the required modules down, then run `node PCO.js` to start the app. If everything went in right, you should see something like this:

```
PCO v0.1.0 started.
  Configured HTML engine using EJS.
  Using HTML as view engine.
  Loaded bodyParser.
  Serving views on /views.
  Serving resources on /public.
  Listening on port 612.
```

The app uses `process.env.PORT` if it exists (if you're using Heroku or Cloud9, for example) - if not, it defaults to `:612`. Open a browser to the logged port to see where everything starts.

##Technical overview  
###Basic functionality:  
The user starts on the index page and inputs a handle. This is checked against Pesterchum specifications using the RegEx `/[a-z0-9]*[A-Z][a-z0-9]*$/` (the handle must not start with a capital letter, have a single capital letter, and contain only alphanumeric characters). Prefixing the handle with override_ will allow overriding the handle validation. The handle is passed to the main page using a URL parameter (?nick=[handle]).

The client goes to the main page and gets the nick. The server double-checks the nick with the same RegEx and override validation and HTTP 502 redirects the client back to the index if the nick doesn't validate. If it does, the client removed the override_ prefix if it's there, then transmits the nick to the server in an HTTP `POST` to /znewclient. The server receives the request and does the following:

* Increments the `clientstotal` counter
* Pushes an object to the `clients` array containing the client's connection details
* Sets an interval corresponding to the new client's ID that increments the client's `missedpings` every 0.75 seconds
    * If five pings have been missed, the client is killed and the interval is cleared
* Creates an array for the client in the `clientlogs` array
* Initiates an IRC connection to `irc.mindfang.org` using the client's object in the `clients` array
* Adds a `message` listener to the connection
    * Adds a space at the end of the message if one doesn't exist already (this solves issues with IRC and Chumdroid)
    * Replaces color tags and special characters using `htmlFormatFct()`
    * Checks if the channel the message was sent from is `#pesterchum` or if the message is a `PESTERCHUM:TIME` message
        * If not, formatted message is pushed to the `clientlogs` array corresponding to the client
        * If so, **[WIP]**
* Sends the client its object from the `clients` array

The client sets its global `client` variable to the received object and moves on. It then sets an interval to run `ircUpdateFct()` every 0.75 seconds to match the server's ping frequency. That function does the following:

* Transmits the client's ID to the server in an HTTP `POST` to /zupdate
    * The server resets the client's `missedpings` to 0 and sends back its `clientlogs` array
* If the `POST` fails (i.e. the server is offline/not responding), the client kills itself and reloads the page
* If the `POST` is successful, it receives its message log and displays it by joining the array items with a `<br>`
* The message display div is scrolled to the bottom using `scrollTop` and `scrollHeight`

The client then prepares all UI content and event handlers.

###Active functionality:  
**Joining a memo:**  
The client checks to see if the memo already exists in its `channels` array (i.e. if it is already in the memo). If not, it transmits its ID and the requested memo to the server in an HTTP `POST` to /zjoinememo. The server uses the client's ID to have the corresponding IRC connection send a channel join request.

**Sending a message:**  
The client transmits its ID, the message, and the memo to which to send the message to the server in an HTTP `POST` to /zsendmessage. The server receives this and does the following:

* Uses `handle[0].toUpperCase()+/[A-Z]/.exec(handle)[0]` to get the client's two-letter prefix
* Adds the prefix to the message along with its color
* Uses the client's ID to have the corresponding IRC connection send the message to the memo
* Replaces color tags and special characters using `htmlFormatFct()`
* Pushes the formatted message to the `clientlogs` array corresponding to the client

####This readme is a WIP and will be updated as progress is made.
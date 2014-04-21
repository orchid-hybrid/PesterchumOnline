Pesterchum Online
================
This is the repository for Pesterchum Online, an online client for the Pesterchum IRC network. It runs off NodeJS, using the NodeIRC library. Express, EJS, and Stylus are used for serving pages.

##Getting started  
First run `npm install` in the root directory to get all the required modules down. Then run `node PCO.js` to start the app. If everything went in right, you should see something like this:  
    PCO v0.1.0 started.
      Configured HTML engine using EJS.
      Using HTML as view engine.
      Loaded bodyParser.
      Serving views on /views.
      Serving resources on /public.
      Listening on port 612.

The app uses `process.env.PORT` if one exists (if you're using Heroku or Cloud9, for example) - if not, it defaults to :612. Open a browser to the logged port to see where everything starts.

##Technical overview  
###Initial functionality:  
The user starts on the index page and inputs a handle. This is checked against Pesterchum specifications using the `/^[a-z][a-z0-9]*[A-Z][a-z0-9]*$/` RegEx (the handle must start with a lowercase letter, have exactly one uppercase letter, and contain only alphanumeric characters). Modernizr checks sessionStorage availability - if it's available, it's used to pass the handle to the next page. If not, `window.name` is used.

The client goes to the main page and gets the nick from either sessionStorage or `window.name`. It checks it again with the same RegEx, then transmits it to the server in an HTTP `POST` to /znewclient. If the RegEx fails validation, the client is bounced back to the index page. Otherwise, the server receives the request and does the following:

* Increments the `clientstotal` counter
* Pushes an object to the `clients` array containing the client's connection details
* Sets an interval corresponding to the new client's ID that increments the client's `missedpings` every 0.75 seconds
    * If five pings have been missed, the client is killed and the interval is cleared
* Creates an array for the client in the `clientlogs` array
* Initiates an IRC connection to `irc.mindfang.org` using the client's object in the `clients` array
* Adds a `message` listener to the connection
    * Adds a space at the end of the message if one doesn't exist already (this solves issues with IRC and Chumdroid)
    * Replaces color tags and special characters using `htmlFormatFct`
    * Checks if the channel the message was sent from is `#pesterchum`
        * If not, formatted message is pushed to the `clientlogs` array corresponding to the client
        * If so, **[WIP]**
* Sends the client its object from the `clients` array

The client sets its global `client` variable to the received object and moves on. It then sets an interval to run `ircUpdateFct` every 0.75 seconds to match the server's ping frequency. That function does the following:

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
The client transmits its ID, the message, and the memo to which to send the message to the server in an HTTP `POST` to /zsendmessage. The server receives this and doe the following:

* Uses `.toUpperCase()+/[A-Z]/.exec(handle)[0]` to get the clients two-letter prefix
* Adds the prefix to the message along with its color
* Uses the client's ID to have the corresponding IRC connection send the message to the memo
* Replaces color tags and special characters using `htmlFormatFct`
* Pushes the formatted message to the `clientlogs` array corresponding to the client

##This readme is a WIP and will be updated as progress is made.
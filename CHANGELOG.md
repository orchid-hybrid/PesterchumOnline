1.2.1 (05/06/2014)
==================
Features:

* Added messages for users joining and parting from memos

1.2.0 (05/06/2014)
==================
Features:

* Changing color and nick are now possible

Bugfixes:

* Fixed the client rejoining memos after being kicked

1.1.1 (21/05/2014)
==================
Features:

* Color square for indicating text color

Bugfixes:

* Fixed the server crashing when the client made calls too quickly

1.1.0 (05/05/2014)
==================
Features:

* Internal changes (cleaner CSS; general cleanup)
* Style overhaul of chat page
* Added license and changelog

1.0.0 (03/05/2014)
==================
Features:

* Client can enter a handle, join memos, and send messages to memos currently present in
* Client receives all messages sent to memos currently present in (PESTERCHUM:TIME and #pesterchum messages are squelched)
* Server creates new client connections on request and handles message logs for each one
* Client connections are terminated after 3.75 seconds of not requesting a ping update
* HTML formatting converts color code tags and text URLs into colored spans and clickable hyperlinks, respectively
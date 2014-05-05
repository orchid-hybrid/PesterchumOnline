1.0.0 (03/05/2014)
==================
Features:

* Client can enter a handle, join memos, and send messages to memos currently present in
* Client receives all messages sent to memos currently present in (PESTERCHUM:TIME and #pesterchum messages are squelched)
* Server creates new client connections on request and handles message logs for each one
* Client connections are terminated after 3.75 seconds of not requesting a ping update
* HTML formatting converts color code tags and text URLs into colored spans and clickable hyperlinks, respectively
window.onload = function() {
	document.getElementById("handle").focus();						//Focus on the handle box
}

function valHandleFct() {
	var handle = document.getElementById("handle").val();			//Get the handle you typed in
	var valhandle = /^[a-z][a-z0-9]*[A-Z][a-z0-9]*$/.test(handle);	//Validate the handle
	if(valhandle) {													//If validation was successful
		if(Modernizr.sessionstorage) {								//Check for HTML5 sessionStorage
			sessionStorage.setItem("handle",handle);				//Set a sessionStorage variable
		} else {													//If no sessionStorage support
			window.name=handle;										//Use window.name
		}
		window.location.href="./chat";								//Go to the main page
	} else {
		//Rejection alert
		alert("That is not a valid chumhandle.\nA chumhandle must start with a lowercase letter, have a single capital letter, and contain no non-alphanumeric characters.")
	}

	return false;													//Prevent the form's default action
}
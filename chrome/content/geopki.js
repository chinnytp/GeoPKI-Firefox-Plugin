/*
*   This file is part of the Geopki Firefox Client
*
*   This is beerware.  If you like it, get us a beer :-)
*/

var Geopki = {
	
	// Updates the status of the current page 
	updateStatus: function(win, is_forced){
		Geopki.printDebug("updateStatus called");
		
		var ti = Geopki.getCurrentTabInfo(win);
		
		/*if(ti.uri.scheme != "https"){
			var text = Perspectives.strbundle.
				getFormattedString("nonHTTPSError", [ ti.uri.host, ti.uri.scheme ]);
			Pers_statusbar.setStatus(ti.uri, Pers_statusbar.STATE_NEUT, text); 
			ti.reason_str = text;
			return;
		}*/
		
		ti.cert = Geopki.getCertificate(ti.browser);
		Geopki.printDebug("Certificate Common Name: " + ti.cert.commonName);

		// Print the SHA-1 Fingerprint of the Certificate object
		var certFingerprint = ti.cert.sha1Fingerprint;
		Geopki.printDebug("Certificate SHA1 Fingerprint: " + certFingerprint);

	},

	buildBase64DER: function(chars){
    	var result = "";
    	for (i=0; i < chars.length; i++)
        	result += String.fromCharCode(chars[i]);
    	return btoa(result);
	},
	
	get_invalid_cert_SSLStatus: function(uri){
		var recentCertsSvc = 
		Components.classes["@mozilla.org/security/recentbadcerts;1"]
			.getService(Components.interfaces.nsIRecentBadCertsService);
		if (!recentCertsSvc)
			return null;

		var port = (uri.port == -1) ? 443 : uri.port;  

		var hostWithPort = uri.host + ":" + port;
		var gSSLStatus = recentCertsSvc.getRecentBadCert(hostWithPort);
		if (!gSSLStatus)
			return null;
		return gSSLStatus;
	},

	// gets current certificate, if it FAILED the security check 
	psv_get_invalid_cert: function(uri) { 
		var gSSLStatus = Geopki.get_invalid_cert_SSLStatus(uri);
		if(!gSSLStatus){
			return null;
		}
		return gSSLStatus.QueryInterface(Components.interfaces.nsISSLStatus)
				.serverCert;
	}, 

	// gets current certificate, if it PASSED the browser check 
	psv_get_valid_cert: function(ui) { 
		try { 
			ui.QueryInterface(Components.interfaces.nsISSLStatusProvider); 
			if(!ui.SSLStatus) 
				return null; 
			return ui.SSLStatus.serverCert; 
		}
		catch (e) {
			Geopki.printDebug("GeoPKI Error: " + e); 
			return null;
		}
	}, 
	
	getCertificate: function(browser){
		var uri = browser.currentURI;
		var ui  = browser.securityUI;
		var cert = this.psv_get_valid_cert(ui);
		if(!cert){
			cert = this.psv_get_invalid_cert(uri);  
		}

		if(!cert) {
			return null;
		}
		return cert;
	},
	
	geopkiListener: {
		onSecurityChange:    function() {
			Geopki.printDebug("onSecurityChange called"); // DEBUG MESSAGE
			Geopki.updateStatus(window,false);
		}
	},
	
	initGeopki: function() {
		Geopki.printDebug("initGeopki Called"); // DEBUG MESSAGE
		getBrowser().addProgressListener(Geopki.geopkiListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
	},
	
	tab_info_cache : {},
	
	getCurrentTabInfo : function(win) { 
		var uri = win.gBrowser.currentURI; 
		var port = (uri.port == -1) ? 443 : uri.port;  
		var service_id = uri.host + ":" + port + ",2"; 

		var ti = Geopki.tab_info_cache[service_id]; 
		if(!ti) {
			ti = {};
			// defaults 
			ti.firstLook = true; 
			ti.override_used = false;
			ti.has_user_permission = false; 
			ti.last_banner_type = null; 
			Geopki.tab_info_cache[service_id] = ti; 
		}
		ti.uri = uri;
		ti.host = uri.host; 
		ti.service_id = service_id; 
		ti.browser = win.gBrowser; 
		ti.reason_str = "";
		return ti; 
	},

	printDebug: function(message)
	{
		try{
			Firebug.Console.log("GeoPKI: " + message);
		}
		catch(e){}

		try{
			console.log("GeoPKI: "+ message);
		}
		catch(e){}
	}

}
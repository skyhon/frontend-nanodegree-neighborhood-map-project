'use strict';
/* This method capitalizes first letter in each word of a string
 * Input:
 *      None
 */
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

/*
 * Yelp API Object
 * ---------------
 *  member constants/variables:
 *      this.URL - url of the Yelp API
 *      this.KEY - OAUTH key
 *      this.KEY_SECRET - key secret
 *      this.TOKEN - token
 *      this.TOKEN_SECRET - token secret
 *  member function:
 *      this.getData - gets Yelp data with the API  
*/
var YelpApi = function () {
    this.URL = 'http://api.yelp.com/v2/search';
    this.KEY = "HTf4MqVxgZY6wT5qkDpPUA";
    this.KEY_SECRET = "yz8Bk7B-nHp_s8GeNXSezHJp774";
    this.TOKEN = "1iWHzo9UhrVLIjSAjjtFQecns6kbVuQ6";
    this.TOKEN_SECRET = "sURrdZaujUSm22cIjmhnL-WnB-c";
};

YelpApi.prototype.getData = function (callback, that) {

    var parameters = {
        oauth_consumer_key: this.KEY,
        oauth_token: this.TOKEN,
        oauth_nonce: nonce_generate(),
        oauth_timestamp: Math.floor(Date.now()/1000),
        oauth_signature_method: "HMAC-SHA1",
        oauth_version : "1.0",
        callback: "cb",              // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
        location : that.address.replace(" ", "+"),
        term : that.name,
        limit: 1
    };

    var encodedSignature = oauthSignature.generate("GET",this.URL, parameters, this.KEY_SECRET, this.TOKEN_SECRET);
    parameters.oauth_signature = encodedSignature;

    // Ajax settings
    var settings = {
        url: this.URL,
        data: parameters,
        cache: true,                // This is crucial to include as well to prevent jQuery from adding on a cache-buster parameter "_=23489489749837", invalidating our oauth-signature
        dataType: "jsonp",
        success: function(results) {
            callback(results);
        },
        error: function(xhr, status, error) {
            // Do stuff on fail
            
            console.log ("xhr: ", xhr);
            
            viewModel.yelp.ajax.status(xhr.status);
            viewModel.yelp.ajax.readyState(xhr.readyState);
            viewModel.yelp.ajax.detail(xhr.statusText);
            
            infowindow.open(map, loc.marker);
            infowindow.setContent($("#infowindowData .error").html());
        },
        timeout: 3500           // 5 seconds timeout before error message
    };

    //Send AJAX query via jQuery library.
    $.ajax(settings);
};

/*
 * Location Object
 * ---------------
 *  member variables:
 *      name - name of the place
 *      address - address of the place
 *      phone - phone of the place
 *      locImgPath - path of location image of the place
 *      review - review of the place
 *      rating - rating of the place
 *      ratingImgPath - path to the icons for the star review images
 *  methods:
 *      setName - sets the name of the location
 *      resetMarker - clears all marker data
 *      resetAll - clears all member variables data
 *      updateMarker - searches and points to a specific marker
 *      animateMarker - animates a marker
 *      getYelpData - gets yelp data
 *      resetYelpData - removes all Yelp data in the view
 *      updateYelpData - updates all Yelp data in the view
 *      updateAddress - updates the address by the searching for the name of the place
*/
var Location = function (name) {
    // initialization
    this.name = "";
    this.address = "";
    this.phone = "";
    this.locImgPath = "";
    this.review = "";
    this.rating = "";
    this.ratingImgPath = "";

    this.marker = null;
    this.yelp = new YelpApi ();

    if (name !== undefined && name !== "") {
        this.setName (name);
    }
};

Location.prototype.setName = function (name) {
    if (name !== undefined || name == "") {
        this.name = name;
        this.updateAddress();
        this.updateMarker();
    }
};

Location.prototype.resetMarker = function () {
    this.marker = null;
    this.markerIndex = -1;
};

Location.prototype.resetAll = function () {
    this.name = "";
    this.address = "";
    this.phone = "";
    this.locImgPath = "";
    this.review = "";
    this.rating = "";
    this.ratingImgPath = "";
    this.resetMarker ();
};

Location.prototype.updateMarker = function () {

    var marker = null;
    for (var i = 0, len = markersArray.length; i < len; i++) {
        if (markersArray[i].title.trim() == this.name) {
            marker = markersArray[i];
            break;
        }
    }
    this.marker = (marker === null)? false:marker;
};

Location.prototype.animateMarker = function () {
    toggleBounce (this.marker);
};

Location.prototype.getYelpData = function (cb) {

    this.resetYelp();

    // for clarification purpose, "thatLoc" is equivalent to "this" instance of a Location obj
    //  for using it in following callback function 
    var thatLoc = this;
    
    this.yelp.getData(function (results) {
        
        // organizes results data and stores them in place object
        thatLoc.phone = results.businesses[0]["display_phone"];
        thatLoc.locImgPath = results.businesses[0]["image_url"];
        thatLoc.rating = results.businesses[0]["rating"];
        thatLoc.ratingImgPath = results.businesses[0]["rating_img_url_small"];
        thatLoc.review = results.businesses[0]["snippet_text"];

        thatLoc.updateYelp();

        if (cb !== undefined) {
            cb();
        }
    }, thatLoc);
};

Location.prototype.resetYelp = function () {
    viewModel.location.name ("");
    viewModel.location.address ("");
    viewModel.yelp.phone ("");
    viewModel.yelp.locImgPath ("");
    viewModel.yelp.rating ("");
    viewModel.yelp.ratingImgPath ("");
    viewModel.yelp.review ("");
};

Location.prototype.updateYelp = function () {
    viewModel.location.name (this.name);
    viewModel.location.address (this.address);
    viewModel.yelp.phone (this.phone);
    viewModel.yelp.locImgPath (this.locImgPath);
    viewModel.yelp.rating (this.rating);
    viewModel.yelp.ratingImgPath (this.ratingImgPath);
    viewModel.yelp.review (this.review);
};

Location.prototype.updateAddress = function () {
    var address = null;
    var name = this.name;
    var flatHayward = getFlattenArray(hayward);
    
    for (var i = 0, len = flatHayward.length; i < len; i++) {
        if (flatHayward[i].name.trim() == name.trim()) {
            address = flatHayward[i].address;
            break;
        }
    }
    this.address = address;
};

// Objects and variables initializations
var yelp = new YelpApi(),
    calcMainContainerHeightFull = (function () {
        var container = $("#container-body .main"),
            header = $(".container-fluid"),
            windowOuterHeight = $(window).outerHeight(),
            minHeight = 500,
            calcHeight = windowOuterHeight - (header.outerHeight() + container.outerHeight() - container.height());
            return (calcHeight > minHeight)? calcHeight:minHeight;
    }),
    calcMainContainerHeightSmall = (function () {
        var container = $("#container-body .main"),
            header = $(".container-fluid"),
            sidebar = $("#sidebar"),
            windowOuterHeight = $(window).outerHeight(),
            minHeight = 300,
            calcHeight = windowOuterHeight - (header.outerHeight() + sidebar.outerHeight());

            return (calcHeight > minHeight)? calcHeight:minHeight;
    }),
    adjContainers = (function() {

        var containerHeight = calcMainContainerHeightFull();

        if ($(window).innerWidth() < 769) {
            containerHeight = calcMainContainerHeightSmall();
            // no change is needed for #sidebar
        } else {
            $("#sidebar").height(containerHeight);
        }

        $("#container-body .main").height(containerHeight);

        // sets center
        map.setCenter(HAYWARDCENTER);
    }),
    HAYWARDCENTER = {lat: 37.6627788, lng: -122.0943489}, // coords for the center of Hayward
    markersArray = [],      // Google Map API Array of markers object
    map,                    // Google Map API map object
    infowindow = null;      // Google Map API infowindow object


var viewModel = null,     // stores view-model data
    loc = null;

/* This function toggles a bounce event for a Google Map API marker
 * Input:
 *      marker - Google Map marker
 */
function toggleBounce(marker) {
    var markerAnimation = marker.getAnimation();
    
    if (markerAnimation === undefined) {     // a little redundant but necessary in this case
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout (function () { marker.setAnimation(null); }, 3000);
    } else if (markerAnimation !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout (function () { marker.setAnimation(null); }, 3000);
    }
}

/* This function changes the format of an array
 * Input:
 *      placesObj - a list of places and its attributes:
 */
function getFlattenArray (placesObj) {
    var flattenArr = [];
    var businessTypes = Object.keys(placesObj);
    var count = 0;

    businessTypes.forEach (function (businessType) {

        var places = Object.keys(placesObj[businessType]);
        places.forEach (function (locationName) {
            var business = jQuery.extend ({}, placesObj[businessType][locationName]);
            business["name"] = locationName;
            business["type"] = businessType;
            business["index"] = count;
            count++;
            flattenArr.push (business);
        });
    });

    return flattenArr.slice (0);
}

/* This function creates all markers
 * Input:
 *      map - Google Map api Map object
 */
function createMarkers (map) {

    var businessTypes = Object.keys(hayward);
    
    businessTypes.forEach (function (businessType) {

        var names = Object.keys(hayward[businessType]);
        
        names.forEach (function (businessName) {
            var business = hayward[businessType][businessName];
            createMarker (map, businessName, business["icon"], business["address"], {lat: business["lat"], lng: business["lng"]});
        });
    });
}

/* This function converts from a string to a valid html-id
 * by removing special characters and white spaces
 * Input:
 *      str = a string variable
 */
function convertToId (str) {
    return (str.replace(/[^a-zA-Z ]/g, "")).replace(/ /g, "_");
}

/* This function opens an info-window and trigger a bounce effect on the marker
 * Input:
 *      1) marker - Google Map API marker object
 *      2) infowindow - Google Map API infowindow object
 */
function openInfowindow (name) {
    
    //loc.hideYelp ();
    loc.setName(name);
    
    infowindow.close();
    infowindow.setOptions ({
        maxWidth: 200,
        maxHeight: 150
    });

    infowindow.open(map, loc.marker);
    infowindow.setContent($("#infowindowData .loading").html());
    
    loc.animateMarker();
    
    loc.getYelpData (function () {
        infowindow.open(map, loc.marker);
        infowindow.setContent($("#infowindowData .content").html());
    });
}

/* This function creates a single marker
 * Input:
 *      map - Google Map API map object
 *      name - name of a business or POI
 *      icon - icon for the marker
 *      address - address of the busines or POI
 *      coords - geo-coordinates of the marker in
 *                  { "x": [float], "y": [float] } format
 *
*/
function createMarker (map, name, icon, address, coords) {

    var marker = new google.maps.Marker({
        position: coords,
        map: map,
        title: name
    });
    
    var addressArr = address.split(",");

    // click-event for the marker
    marker.addListener("click", function() {
        console.log ("clicked marker");
        openInfowindow (this.title);
    });

    marker.setMap (map);
    markersArray.push(marker);
}

/* This function clears or set all markers on the map
 * Input:
 *      map - Google Map API object
 */
function setMapOnAll(map) {
    for (var i = 0; i < markersArray.length; i++) {
        markersArray[i].setMap(map);
    }
}

/* This function clears all markers
 * Input:
 *      None
 */
function clearMarkers () {
    setMapOnAll(null);
    markersArray.length = 0;
}
/* This function initializes Google Map
 * Input:
 *      None
 */
function initMap() {

    // initializes map
    map = new google.maps.Map(document.getElementById("map"), {
        center: HAYWARDCENTER,
        zoom: 12
    });

    // creates all markers
    createMarkers(map);

    // sets center on window resize
    google.maps.event.addDomListener(window, 'resize', adjContainers);

    // creates infowindow
    infowindow = new google.maps.InfoWindow();

    // adjust the size of the map and sidemenu containers
    adjContainers();
}

/* This function initializes the search engine
 *  Input:
 *      None
 */
function initView() {
    var places = (function () {
        var businessArr = [];
        var businessTypes = Object.keys(hayward);
        businessTypes.forEach(function (businessType) {
            var names = Object.keys(hayward[businessType]);

            names.forEach(function (businessName) {
                var business = hayward[businessType][businessName];
                business["name"] = businessName;
                business["type"] = businessType;
                businessArr.push(business);
            });
        });
        return businessArr.slice(0);
    }());

    viewModel = {

        places: ko.observableArray(places.slice(0)),

        query: ko.observable(''),

        search: function (value) {
            viewModel.places.removeAll();
            clearMarkers();

            for (var x in places) {
                if (places[x].name.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
                    viewModel.places.push(places[x]);
                    createMarker (map, places[x].name, places[x].icon, places[x].address, {lat: places[x].lat, lng: places[x].lng});
                }
            }
        },

        activateMarker: function (item, event) {
            
            console.log ("sidemenu item clicked");
            
            var name = event.target.innerText;
            
            loc.setName (name);            
            
            openInfowindow (loc.name);
            
            return false;
        },

        id: ko.observable (""),

        location: {
            name: ko.observable (""),
            address: ko.observable (""),
            phone: ko.observable ("")
        }
    };

    viewModel.location.formattedAddress = {
        line1: ko.computed (function () {
            var addressArr = viewModel.location.address().split(",");
            var line1 = addressArr[0];
            return line1;
        }),
        line2: ko.computed (function () {
            var addressArr = viewModel.location.address().split(",");
            var line2 = "";
            if (addressArr.length > 1)
                line2 = addressArr[1] + " " + addressArr[2];
            return line2;
        })
    };

    viewModel.yelp = {
        id: ko.computed (function () {
            return ((viewModel.location.name() == "")? "": "iw_" + viewModel.location.name());
        }),
        phone: ko.observable (""),
        locImgPath: ko.observable (""),
        review: ko.observable (""),
        rating: ko.observable (""),
        ratingImgPath: ko.observable (""),
        ajax: {
            status: ko.observable (""),
            readyState: ko.observable (""),
            detail: ko.observable ("")
        }
    };
    
    viewModel.query.subscribe(viewModel.search);
    loc = new Location ();
    ko.applyBindings(viewModel);
}

/* This function generates a nonce used for oauth authorization
 *  Input:
 *      None
 */
function nonce_generate() {
    return (Math.floor(Math.random() * 1e12).toString());
}

function myErrorHandler () {
    // Displays Google Map API errors if something is wrong, else proceed with
    // initiating the map and the remaining scripts
    $("#container-body").html("<h4>Error: Google Map API cannot be initiated.</h4>");
}

function init () {
    initView();
}

init();
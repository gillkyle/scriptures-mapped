const Scriptures = (function() {
  "use strict";
  // CONSTANTS

  // PRIVATE VARS

  // PRIVATE METHOD DECLARATIONS
  let ajax;
  let init;

  // PRIVATE METHODS
  ajax = function(url, successCallback, failureCallback) {
    let request = new XMLHttpRequest();

    request.open("GET", url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        let data = JSON.parse(request.responseText);

        if (typeof successCallback === "function") {
          successCallback(data);
        }
      } else {
        if (typeof failureCallback === "function") {
          failureCallback(request);
        }
      }
    };

    request.onerror = failureCallback;
    request.send();
  };

  init = function(callback) {
    ajax("https://scriptures.byu.edu/mapscrip/model/books.php", data => {
      console.log(data);
    });
    ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php", data => {
      console.log(data);
    });
  };

  // PUBLIC API
  return {
    init: init
  };
})();

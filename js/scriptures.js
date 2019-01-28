const Scriptures = (function() {
  "use strict";
  // CONSTANTS

  // PRIVATE VARS
  let books;
  let volumes;

  // PRIVATE METHOD DECLARATIONS
  let ajax;
  let cacheBooks;
  let init;
  let navigateHome;
  let onHashChanged;

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

  cacheBooks = function(callback) {
    volumes.forEach(volume => {
      let volumeBooks = [];
      let bookId = volume.minBookId;

      while (bookId <= volume.maxBookId) {
        volumeBooks.push(books[bookId]);
        bookId += 1;
      }

      volume.books = volumeBooks;
    });

    if (typeof callback === "function") {
      callback();
    }
  };

  init = function(callback) {
    let booksLoaded = false;
    let volumesLoaded = false;

    ajax("https://scriptures.byu.edu/mapscrip/model/books.php", data => {
      books = data;
      booksLoaded = true;

      if (volumesLoaded) {
        cacheBooks(callback);
      }
    });
    ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php", data => {
      volumes = data;
      volumesLoaded = true;

      if (booksLoaded) {
        cacheBooks(callback);
      }
    });
  };

  navigateHome = function(volumeId) {
    document.getElementById("scriptures").innerHTML =
      "<div>The Old Testament</div><div>The New Testament</div><div>The Book of Mormon</div><div>D&C</div><div>The Pearl of Great Price</div>" +
      volumeId;
  };

  onHashChanged = function() {
    console.log("on hash change");
    let ids = [];
    if (location.hash !== "" && location.hash.length > 1) {
      ids = location.hash.substring(1).split(":");
    }

    if (ids.length <= 0) {
      navigateHome();
    } else if (ids.length === 1) {
      let volumeId = Number(ids[0]);
      if (volumeId < volumes[0].id || volumeId > volumes.slice(-1).id) {
        navigateHome();
      } else {
        navigateHome(volumeId);
      }
    } else if (ids.length === 2) {
      let bookId = Number(ids[1]);

      if (books[bookId] === undefined) {
        navigateHome();
      } else {
        navigateHome(bookId);
      }
    }
  };

  // PUBLIC API
  return {
    init: init,
    onHashChanged: onHashChanged
  };
})();

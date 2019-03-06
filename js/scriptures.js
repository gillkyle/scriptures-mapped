/*
File: scriptures.js
Author: Kyle Gill
Date: Winter 2019
*/
/*property
    books, bookChapterValid, forEach, fullName, getElementById, gridName, hash, id, init,
    innerHTML, length, log, maxBookId, minBookId, numChapters, onHashChanged,
    onerror, onload, open, parentBookId, parse, push, responseText, send, slice,
    split, status, substring
*/

/*global console*/
/*jslint
    browser: true
    long: true */

const Scriptures = (function() {
  "use strict";
  // CONSTANTS
  const CLASS_BOOKS = "books";
  const CLASS_VOLUME = "volume";
  const DIV_BREADCRUMBS = "crumbs";
  const DIV_SCRIPTURES = "scriptures";
  const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
  const INDEX_PLACENAME = 2;
  const INDEX_LATITUDE = 3;
  const INDEX_LONGITUDE = 4;
  const INDEX_PLACE_FLAG = 11;
  const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
  const MAX_RETRY_DELAY = 5000;
  const REQUEST_STATUS_OK = 200;
  const REQUEST_STATUS_ERORR = 400;
  const TAG_HEADER5 = "h5";
  const TAG_LIST_ITEM = "li";
  const TAG_UNORDERED_LIST = "ul";
  const TEXT_TOP_LEVEL = "The Scriptures";
  const URL_BOOKS = "https://scriptures.byu.edu/mapscrip/model/books.php";
  const URL_SCRIPTURES = "https://scriptures.byu.edu/mapscrip/mapgetscrip.php";
  const URL_VOLUMES = "https://scriptures.byu.edu/mapscrip/model/volumes.php";

  // PRIVATE VARS
  let books;
  let gmMarkers = [];
  let requestedBreadcrumbs;
  let retryDelay = 500;
  let volumes;

  // PRIVATE METHOD DECLARATIONS
  let addMarker;
  let ajax;
  let bookChapterValid;
  let booksGrid;
  let booksGridContent;
  let breadcrumbs;
  let cacheBooks;
  let changeHash;
  let clearMarkers;
  let encodedScriptureUrlParameters;
  let getScriptureCallback;
  let getLeftCallback;
  let getRightCallback;
  let getScriptureFailed;
  let htmlAnchor;
  let htmlDiv;
  let htmlElement;
  let htmlHashLink;
  let htmlLink;
  let init;
  let navigateBook;
  let navigateChapter;
  let navigateHome;
  let nextChapter;
  let onHashChanged;
  let previousChapter;
  let setupMarkers;
  let setupBounds;
  let showLocation;
  let titleForBookChapter;
  let volumeForId;
  let volumesGridContent;

  // PRIVATE METHODS
  addMarker = function(placename, latitude, longitude) {
    let marker = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: placename,
      label: placename,
      animation: google.maps.Animation.DROP
    });

    gmMarkers.push(marker);
  };

  ajax = function(url, successCallback, failureCallback, skipParse) {
    let request = new XMLHttpRequest();

    request.open("GET", url, true);

    request.onload = function() {
      if (
        request.status >= REQUEST_STATUS_OK &&
        request.status < REQUEST_STATUS_ERORR
      ) {
        let data;

        if (skipParse) {
          data = request.responseText;
        } else {
          data = JSON.parse(request.responseText);
        }

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

  bookChapterValid = function(bookId, chapter) {
    let book = books[bookId];

    if (book === undefined || chapter < 0 || chapter > book.numChapters) {
      return false;
    }

    if (chapter === 0 && book.numChapters > 0) {
      return false;
    }

    return true;
  };

  booksGrid = function(volume) {
    return htmlDiv({
      classKey: CLASS_BOOKS,
      content: booksGridContent(volume)
    });
  };

  booksGridContent = function(volume) {
    let gridContent = "";

    volume.books.forEach(function(book) {
      gridContent += htmlLink({
        classKey: "btn",
        id: book.id,
        href: `#${volume.id}:${book.id}`,
        content: book.gridName
      });
    });

    return gridContent;
  };

  breadcrumbs = function(volume, book, chapter) {
    let crumbs;

    if (volume === undefined) {
      crumbs = htmlElement(TAG_LIST_ITEM, TEXT_TOP_LEVEL);
    } else {
      crumbs = htmlElement(
        TAG_LIST_ITEM,
        htmlHashLink("", TEXT_TOP_LEVEL),
        "scrips"
      );

      if (book === undefined) {
        crumbs += htmlElement(TAG_LIST_ITEM, volume.fullName);
      } else {
        crumbs += htmlElement(
          TAG_LIST_ITEM,
          htmlHashLink(`${volume.id}`, volume.fullName)
        );

        if (chapter === undefined || chapter <= 0) {
          crumbs += htmlElement(TAG_LIST_ITEM, book.tocName);
        } else {
          crumbs += htmlElement(
            TAG_LIST_ITEM,
            htmlHashLink(`${volume.id},${book.id}`, book.tocName)
          );
          crumbs += htmlElement(TAG_LIST_ITEM, chapter);
        }
      }
    }

    return htmlElement(TAG_UNORDERED_LIST, crumbs, "bread");
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

  changeHash = function(volumeId, bookId, chapter) {
    let newHash = "";

    if (volumeId !== undefined) {
      newHash += volumeId;

      if (bookId !== undefined) {
        newHash += `:${bookId}`;

        if (chapter !== undefined) {
          newHash += `:${chapter}`;
        }
      }
    }
    location.hash = newHash;
  };

  clearMarkers = function() {
    gmMarkers.forEach(function(marker) {
      marker.setMap(null);
    });

    gmMarkers = [];
  };

  encodedScriptureUrlParameters = function(bookId, chapter, verses, isJst) {
    if (bookId !== undefined && chapter !== undefined) {
      let options = "";

      if (verses !== undefined) {
        options += verses;
      }

      if (isJst !== undefined && isJst) {
        options += "&jst=JST";
      }

      return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses=${options}`;
    }
  };

  getScriptureCallback = function(chapterHtml) {
    document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;
    document.getElementById(DIV_BREADCRUMBS).innerHTML = requestedBreadcrumbs;
    setupMarkers();
  };
  getLeftCallback = function(chapterHtml) {
    document.getElementById("left-pane").innerHTML = chapterHtml;
  };
  getRightCallback = function(chapterHtml) {
    document.getElementById("right-pane").innerHTML = chapterHtml;
  };

  getScriptureFailed = function() {
    console.warning("Unable to receive scripture content from server.");
  };

  htmlAnchor = function(volume) {
    return `<a name="v${volume.id}" />`;
  };

  htmlDiv = function(parameters) {
    let classString = "";
    let contentString = "";
    let idString = "";

    if (parameters.classKey !== undefined) {
      classString = ` class="${parameters.classKey}"`;
    }

    if (parameters.content !== undefined) {
      contentString = parameters.content;
    }

    if (parameters.id !== undefined) {
      idString = ` id="${parameters.id}"`;
    }

    return `<div${idString}${classString}>${contentString}</div>`;
  };

  htmlElement = function(tagName, content, className) {
    return `<${tagName} ${
      className ? `class=${className}` : ""
    } >${content}</${tagName}>`;
  };

  htmlHashLink = function(hashArguments, content) {
    return `<a href="javascript:void(0)" onclick="Scriptures.changeHash(${hashArguments})">${content}</a>`;
  };

  htmlLink = function(parameters) {
    let classString = "";
    let contentString = "";
    let hrefString = "";
    let idString = "";

    if (parameters.classKey !== undefined) {
      classString = ` class="${parameters.classKey}"`;
    }

    if (parameters.content !== undefined) {
      contentString = parameters.content;
    }

    if (parameters.href !== undefined) {
      hrefString = ` href="${parameters.href}"`;
    }

    if (parameters.id !== undefined) {
      idString = ` id="${parameters.id}"`;
    }

    return `<a${idString}${classString}${hrefString}>${contentString}</a>`;
  };

  init = function(callback) {
    let booksLoaded = false;
    let volumesLoaded = false;

    ajax(URL_BOOKS, data => {
      books = data;
      booksLoaded = true;

      if (volumesLoaded) {
        cacheBooks(callback);
      }
    });
    ajax(URL_VOLUMES, data => {
      volumes = data;
      volumesLoaded = true;

      if (booksLoaded) {
        cacheBooks(callback);
      }
    });
  };

  navigateBook = function(bookId) {
    let book = books[bookId];
    let volume;

    if (book !== undefined) {
      volume = volumes[book.parentBookId - 1];

      if (book.numChapters === 0) {
        navigateChapter(bookId, 0);
      } else if (book.numChapters === 1) {
        navigateChapter(bookId, 1);
      } else {
        let gridContent = `<div class=${CLASS_VOLUME}><${TAG_HEADER5}>${
          book.fullName
        }</${TAG_HEADER5}></div><div class=${CLASS_BOOKS}>`;

        for (let chapter = 1; chapter <= book.numChapters; chapter += 1) {
          gridContent += htmlLink({
            classKey: "btn chapter",
            id: chapter,
            href: `#${volume.id}:${book.id}:${chapter}`,
            content: `${chapter}`
          });
        }

        gridContent += `</div>`;
        document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
          content: gridContent
        });
      }
    }
    document.getElementById(DIV_BREADCRUMBS).innerHTML = breadcrumbs(
      volume,
      book
    );
    document.getElementById("buttons").style.display = "none";
  };

  navigateChapter = async function(bookId, chapter) {
    if (bookId !== undefined) {
      let book = books[bookId];
      let volume = volumes[book.parentBookId - 1];

      requestedBreadcrumbs = breadcrumbs(volume, book, chapter);

      document.getElementById("buttons").style.display = "flex";

      document.getElementById("prev-btn").addEventListener(
        "click",
        function() {
          let [v, b, c] = previousChapter(bookId, chapter);

          const left = $("#left-pane").first();
          const middle = $("#scriptures").first();
          const right = $("#right-pane").first();
          ajax(
            encodedScriptureUrlParameters(b, c),
            getLeftCallback,
            getScriptureFailed,
            true
          );
          left
            .css({ left: "-320px", transition: "0s all ease-in" })
            .show()
            .css({
              left: "0px",
              transition: "300ms all ease-in"
            })
            .delay(500)
            .fadeOut();
          document.getElementById("left-pane").innerHTML = "";

          if (v !== undefined) {
            changeHash(v, b, c);
          } else {
            changeHash(undefined);
            navigateHome();
          }
        },
        { once: true }
      );

      document.getElementById("next-btn").addEventListener(
        "click",
        function() {
          let [v, b, c] = nextChapter(bookId, chapter);

          const left = $("#left-pane").first();
          const middle = $("#scriptures").first();
          const right = $("#right-pane").first();
          ajax(
            encodedScriptureUrlParameters(b, c),
            getRightCallback,
            getScriptureFailed,
            true
          );
          right
            .css({ left: "320px", transition: "0s all ease-in" })
            .show()
            .css({
              left: "0px",
              transition: "300ms all ease-in"
            })
            .delay(500)
            .fadeOut();
          document.getElementById("right-pane").innerHTML = "";

          if (v !== undefined) {
            changeHash(v, b, c);
          } else {
            changeHash(undefined);
            navigateHome();
          }
        },
        { once: true }
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      ajax(
        encodedScriptureUrlParameters(bookId, chapter),
        getScriptureCallback,
        getScriptureFailed,
        true
      );
    }
  };

  navigateHome = function(volumeId) {
    document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
      id: DIV_SCRIPTURES_NAVIGATOR,
      content: volumesGridContent(volumeId)
    });

    document.getElementById(DIV_BREADCRUMBS).innerHTML = breadcrumbs(
      volumeForId(volumeId)
    );

    document.getElementById("buttons").style.display = "none";
  };

  nextChapter = function(bookId, chapter) {
    let book = books[bookId];
    let currentVolume = volumes[book.parentBookId - 1];

    if (book !== undefined) {
      if (chapter < book.numChapters) {
        return [currentVolume.id, bookId, chapter + 1];
      }

      let nextBook = books[bookId + 1];

      if (nextBook !== undefined) {
        let nextChapterValue = 0;
        let volume = volumes[nextBook.parentBookId - 1];

        if (nextBook.numChapters > 0) {
          nextChapterValue = 1;
        }

        return [volume.id, nextBook.id, nextChapterValue];
      }
    }
  };

  onHashChanged = function() {
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
    } else if (ids.length >= 2) {
      let bookId = Number(ids[1]);

      if (books[bookId] === undefined) {
        navigateHome();
      } else {
        if (ids.length === 2) {
          navigateBook(bookId);
        } else {
          let chapter = Number(ids[2]);

          if (bookChapterValid(bookId, chapter)) {
            navigateChapter(bookId, chapter);
          } else {
            navigateHome();
          }
        }
      }
    }
  };

  previousChapter = function(bookId, chapter) {
    let book = books[bookId];
    let currentVolume = volumes[book.parentBookId - 1];

    if (book !== undefined) {
      if (chapter > 1) {
        return [currentVolume.id, bookId, chapter - 1];
      }

      let prevBook = books[bookId - 1];

      if (prevBook !== undefined) {
        let prevChapterValue = 0;
        let volume = volumes[prevBook.parentBookId - 1];

        if (prevBook.numChapters > 0) {
          prevChapterValue = prevBook.numChapters;
        }

        return [volume.id, prevBook.id, prevChapterValue];
      }
    }
  };

  setupBounds = function() {
    if (gmMarkers.length === 0) {
      map.panTo({ lat: 31.777444, lng: 35.234935 });
    }

    if (gmMarkers.length === 1) {
      map.panTo(gmMarkers[0].position);
    }

    if (gmMarkers.length > 1) {
      let bounds = new google.maps.LatLngBounds();

      gmMarkers.forEach(function(marker) {
        bounds.extend(marker.getPosition());
      });

      map.fitBounds(bounds);
      // The code above was adapted by code from: https://stackoverflow.com/questions/19304574/center-set-zoom-of-map-to-cover-all-visible-markers
      // Submitted by user: https://stackoverflow.com/users/954940/adam
    }

    map.setZoom(7);
  };

  setupMarkers = function() {
    if (window.google === undefined) {
      // retry finding the global google object after delay
      let retryId = window.setTimeout(setupMarkers, retryDelay);

      retryDelay += retryDelay;

      if (retryDelay > MAX_RETRY_DELAY) {
        window.clearTimeout(retryId);
      }

      return;
    }

    if (gmMarkers.length > 0) {
      clearMarkers();
    }

    document
      .querySelectorAll('#scrip-pane a[onclick^="showLocation("]')
      .forEach(function(el) {
        let matches = LAT_LON_PARSER.exec(el.getAttribute("onclick"));

        if (matches) {
          // TODO verify not placing multiple pins
          let placename = matches[INDEX_PLACENAME];
          let latitude = parseFloat(matches[INDEX_LATITUDE]);
          let longitude = parseFloat(matches[INDEX_LONGITUDE]);
          let flag = matches[INDEX_PLACE_FLAG];

          if (flag !== "") {
            placename += " " + flag;
          }

          addMarker(placename, latitude, longitude);
        }
      });

    setupBounds();
  };

  showLocation = function(
    geotagId,
    placename,
    latitude,
    longitude,
    viewLatitude,
    viewLongitude,
    viewTilt,
    viewRoll,
    viewAltitude,
    viewHeading
  ) {
    let myLatLng = new google.maps.LatLng(latitude, longitude);

    gmMarkers.forEach(function(marker) {
      if (
        marker.position.lat() === myLatLng.lat() &&
        marker.position.lng() === myLatLng.lng()
      ) {
        let zoom = Math.round(Number(viewAltitude) / 450);
        if (zoom < 6) {
          zoom = 6;
        } else if (zoom > 18) {
          zoom = 18;
        }

        map.setZoom(zoom);
        map.panTo(marker.position);
      }
    });
  };

  titleForBookChapter = function(book, chapter) {
    if (chapter) {
      return book.tocName + " " + chapter;
    }

    return book.tocName;
  };

  volumeForId = function(volumeId) {
    if (volumeId !== undefined && volumeId > 0 && volumeId < volumes.length) {
      return volumes[volumeId - 1];
    }
  };

  volumesGridContent = function(volumeId) {
    let gridContent = "";

    volumes.forEach(function(volume) {
      if (volumeId === undefined || volumeId === volume.id) {
        gridContent += htmlDiv({
          classKey: CLASS_VOLUME,
          content:
            htmlAnchor(volume) + htmlElement(TAG_HEADER5, volume.fullName)
        });

        gridContent += booksGrid(volume);
      }
    });
    return gridContent;
  };

  // PUBLIC API
  return {
    changeHash: changeHash,
    init: init,
    onHashChanged: onHashChanged,
    showLocation: showLocation
  };
})();

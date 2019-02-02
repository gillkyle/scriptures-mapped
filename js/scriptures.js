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
  const SCRIPTURES_URL = "https://scriptures.byu.edu/mapscrip/mapgetscrip.php";

  // PRIVATE VARS
  let books;
  let volumes;

  // PRIVATE METHOD DECLARATIONS
  let ajax;
  let bookChapterValid;
  let cacheBooks;
  let encodedScriptureUrlParameters;
  let getScriptureCallback;
  let getScriptureFailed;
  let init;
  let navigateBook;
  let navigateChapter;
  let navigateHome;
  let nextChapter;
  let onHashChanged;
  let previousChapter;
  let titleForBookChapter;

  // PRIVATE METHODS
  ajax = function(url, successCallback, failureCallback, skipParse) {
    let request = new XMLHttpRequest();

    request.open("GET", url, true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
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

  encodedScriptureUrlParameters = function(bookId, chapter, verses, isJst) {
    if (bookId !== undefined && chapter !== undefined) {
      let options = "";

      if (verses !== undefined) {
        options += verses;
      }

      if (isJst !== undefined && isJst) {
        options += "&jst=JST";
      }

      return (
        SCRIPTURES_URL +
        "?book=" +
        bookId +
        "&chap=" +
        chapter +
        "&verses=" +
        options
      );
    }
  };

  getScriptureCallback = function(chapterHtml) {
    document.getElementById("scriptures").innerHTML = chapterHtml;

    // NEEDS WORK: SET UP THE MAP MARKERS
  };

  getScriptureFailed = function() {
    console.warning("Unable to receive scripture content from server.");
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

  navigateBook = function(bookId) {
    document.getElementById("scriptures").innerHTML =
      "<div>" + bookId + "</div>";
  };

  navigateChapter = function(bookId, chapter) {
    if (bookId !== undefined) {
      console.log(nextChapter(bookId, chapter));
      console.log(previousChapter(bookId, chapter));

      ajax(
        encodedScriptureUrlParameters(bookId, chapter),
        getScriptureCallback,
        getScriptureFailed,
        true
      );
    }
  };

  navigateHome = function(volumeId) {
    let navContents = '<div id="scriptnav">';

    volumes.forEach(function(volume) {
      if (volumeId === undefined || volumeId === volume.id) {
        // TODO clean up
        navContents +=
          '<div class="volume"><a name="v' +
          '"/><h5>' +
          volume.fullName +
          '</h5></div><div class="books">';

        volume.books.forEach(function(book) {
          navContents +=
            '<a class="btn" id"' +
            book.id +
            '" href="#' +
            volume.id +
            ":" +
            book.id +
            '">' +
            book.gridName +
            "</a>";
        });

        navContents += "</div>";
      }
    });

    navContents += "<br /><br /></div>";

    document.getElementById("scriptures").innerHTML = navContents;
  };

  nextChapter = function(bookId, chapter) {
    let book = books[bookId];

    if (book !== undefined) {
      if (chapter < book.numChapters) {
        return [bookId, chapter + 1, titleForBookChapter(book, chapter + 1)];
      }

      let nextBook = books[bookId + 1];

      if (nextBook !== undefined) {
        let nextChapterValue = 0;

        if (nextBook.numChapters > 0) {
          nextChapterValue = 1;
        }

        return [
          nextBook.id,
          nextChapterValue,
          titleForBookChapter(nextBook, nextChapterValue)
        ];
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

    if (book !== undefined) {
      if (chapter > 1) {
        return [bookId, chapter - 1, titleForBookChapter(book, chapter - 1)];
      }

      let prevBook = books[bookId - 1];

      if (prevBook !== undefined) {
        let prevChapterValue = 0;

        if (prevBook.numChapters > 0) {
          prevChapterValue = prevBook.numChapters;
        }

        return [
          prevBook.id,
          prevChapterValue,
          titleForBookChapter(prevBook, prevChapterValue)
        ];
      }
    }
  };

  titleForBookChapter = function(book, chapter) {
    if (chapter > 0) {
      return book.tocName + " " + chapter;
    }

    return book.tocName;
  };

  // PUBLIC API
  return {
    init: init,
    onHashChanged: onHashChanged
  };
})();

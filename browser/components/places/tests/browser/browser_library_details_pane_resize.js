/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that the Library details pane can be resized with its splitter, that
 * the new height is restored when the Library is opened again, that it fits
 * the details of history entries by default, and that the splitter is hidden
 * together with the details pane.
 */

const LIBRARY_URL = "chrome://browser/content/places/places.xhtml";

function getHeight(element) {
  return element.getBoundingClientRect().height;
}

function dragSplitter(library, deltaY) {
  let splitter = library.document.getElementById("detailsPaneSplitter");
  let rect = splitter.getBoundingClientRect();
  let x = rect.left + rect.width / 2;
  let y = rect.top + rect.height / 2;
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  EventUtils.synthesizeMouseAtPoint(x, y, { type: "mousedown" }, library);
  EventUtils.synthesizeMouseAtPoint(
    x,
    y + deltaY,
    { type: "mousemove" },
    library
  );
  EventUtils.synthesizeMouseAtPoint(
    x,
    y + deltaY,
    { type: "mouseup" },
    library
  );
  AccessibilityUtils.resetEnv();
}

add_setup(async function () {
  Services.xulStore.removeValue(LIBRARY_URL, "detailsPane", "style");
  registerCleanupFunction(() => {
    Services.xulStore.removeValue(LIBRARY_URL, "detailsPane", "style");
  });
});

add_task(async function test_resize_details_pane() {
  let library = await promiseLibrary("AllBookmarks");
  let detailsPane = library.document.getElementById("detailsPane");

  Assert.ok(
    BrowserTestUtils.isVisible(
      library.document.getElementById("detailsPaneSplitter")
    ),
    "The splitter is visible"
  );

  let initialHeight = getHeight(detailsPane);
  dragSplitter(library, 50);
  let shrunkHeight = getHeight(detailsPane);
  Assert.less(
    Math.abs(shrunkHeight - (initialHeight - 50)),
    1,
    "Dragging the splitter down shrinks the details pane"
  );

  dragSplitter(library, -20);
  let resizedHeight = getHeight(detailsPane);
  Assert.less(
    Math.abs(resizedHeight - (shrunkHeight + 20)),
    1,
    "Dragging the splitter up grows the details pane"
  );

  await promiseLibraryClosed(library);
  library = await promiseLibrary("AllBookmarks");
  Assert.less(
    Math.abs(
      getHeight(library.document.getElementById("detailsPane")) - resizedHeight
    ),
    1,
    "The details pane height is restored when the Library is reopened"
  );
  await promiseLibraryClosed(library);
});

add_task(async function test_resize_limits() {
  let library = await promiseLibrary("AllBookmarks");
  let detailsPane = library.document.getElementById("detailsPane");
  let placesViewsBox = library.document.getElementById("placesViewsBox");
  let minHeight = element =>
    parseFloat(library.getComputedStyle(element).minHeight);

  dragSplitter(library, library.innerHeight);
  Assert.less(
    Math.abs(getHeight(detailsPane) - minHeight(detailsPane)),
    1,
    "The details pane can't be shrunk below its minimum height"
  );

  dragSplitter(library, -library.innerHeight);
  Assert.less(
    Math.abs(getHeight(placesViewsBox) - minHeight(placesViewsBox)),
    1,
    "The details pane can't grow over the minimum height of the content view"
  );
  await promiseLibraryClosed(library);
});

add_task(async function test_history_view_fits_details() {
  Services.xulStore.removeValue(LIBRARY_URL, "detailsPane", "style");
  await PlacesTestUtils.addVisits("https://example.com/");
  registerCleanupFunction(() => PlacesUtils.history.clear());

  let library = await promiseLibrary("History");
  let doc = library.document;
  let detailsPane = doc.getElementById("detailsPane");
  library.ContentTree.view.focus();
  library.ContentTree.view.view.selection.select(0);
  await TestUtils.waitForCondition(
    () =>
      doc.getElementById("editBMPanel_locationField").value ==
      "https://example.com/",
    "Wait for the details of the history entry"
  );

  let defaultHeight =
    16 * parseFloat(library.getComputedStyle(detailsPane).fontSize);
  let historyHeight = getHeight(detailsPane);
  Assert.less(
    historyHeight,
    defaultHeight,
    "The details pane is smaller in the History view"
  );
  Assert.lessOrEqual(
    detailsPane.scrollHeight,
    detailsPane.clientHeight,
    "The details pane fits the details of the history entry"
  );

  dragSplitter(library, -20);
  let resizedHeight = getHeight(detailsPane);
  Assert.less(
    Math.abs(resizedHeight - (historyHeight + 20)),
    1,
    "The details pane can still be resized in the History view"
  );

  library.PlacesOrganizer.selectLeftPaneContainerByHierarchy("AllBookmarks");
  Assert.less(
    Math.abs(getHeight(detailsPane) - resizedHeight),
    1,
    "The resized height is used in the bookmarks views too"
  );
  await promiseLibraryClosed(library);
});

add_task(async function test_splitter_hidden_with_details_pane() {
  let library = await promiseLibrary("Downloads");
  let doc = library.document;
  Assert.ok(
    BrowserTestUtils.isHidden(doc.getElementById("detailsPane")),
    "The details pane is hidden in the Downloads view"
  );
  Assert.ok(
    BrowserTestUtils.isHidden(doc.getElementById("detailsPaneSplitter")),
    "The splitter is hidden in the Downloads view"
  );

  library.PlacesOrganizer.selectLeftPaneContainerByHierarchy("History");
  Assert.ok(
    BrowserTestUtils.isVisible(doc.getElementById("detailsPane")),
    "The details pane is visible in the History view"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(doc.getElementById("detailsPaneSplitter")),
    "The splitter is visible in the History view"
  );
  await promiseLibraryClosed(library);
});

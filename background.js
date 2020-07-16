"use strict";

let lunrIndex;
let bookmarkId_to_URL = {};
let URL_to_bookmarkId = {};
let extensionFolderId = 0;


// Create/Retrieve the main Archive folder

chrome.storage.local.get(["extensionFolderId"], function(result){
    if(result["extensionFolderId"]){
        extensionFolderId = result["extensionFolderId"];
    }
    else {
        chrome.bookmarks.create({
                'title': 'Your Sailboat Archive (Don\'t add/delete anything from here)'
            },
            function (newFolder) {
                extensionFolderId = newFolder.id
                console.log("added folder: " + newFolder.title);
                chrome.storage.local.set({"extensionFolderId": extensionFolderId});
            });
    }
});



chrome.storage.local.get(['bookmarkId_to_URL'], function(result){
    if(result['bookmarkId_to_URL']){
        bookmarkId_to_URL = result['bookmarkId_to_URL']
    }
});

chrome.storage.local.get(['URL_to_bookmarkId'], function(result){
    if(result['URL_to_bookmarkId']){
        URL_to_bookmarkId = result['URL_to_bookmarkId']
    }
})

// Get Archived Docs from local Storage and build index
chrome.storage.local.get(['serialisedIdx'], function (result) {

    if(result["serialisedIdx"]){
        lunrIndex = lunr.Index.load(JSON.parse(result["serialisedIdx"]))
    }
    else{
        lunrIndex = elasticlunr(function () {
            this.setRef('url');
            this.addField('title');
            this.addField('content');
            this.metadataWhitelist = ['position']
        });
    }
});

// When the browserAction is clicked archive/un-archive page
chrome.browserAction.onClicked.addListener(function(tab) { manage_archiving(tab)});

// When archive-me message received archive page.
chrome.runtime.onMessage.addListener(function (request, sender) {
    if (request.type === "archive-me") {
        archivePage(sender.tab)
    }
});
function manage_archiving(tab){
    let isArchived = URL_to_bookmarkId[tab.url]
    if(isArchived){
        un_archivePage(tab)
    }
    else{
        archivePage(tab)
    }
}

function archivePage(tab) {

    //Add page to archived pages bookmarks folder
    chrome.bookmarks.create({'parentId': extensionFolderId,
        'title': tab.title,
        'url': tab.url}, function(bookmark){
        bookmarkId_to_URL[bookmark.id] = tab.url;
        URL_to_bookmarkId[tab.url] = bookmark.id;
        chrome.storage.local.set({bookmarkId_to_URL: bookmarkId_to_URL})
        chrome.storage.local.set({URL_to_bookmarkId: URL_to_bookmarkId})
    })

    //Execute script on the page to send document
    let code_to_send_document = "chrome.runtime.sendMessage({\n" +
                                "    type: \"sending-page-content\",\n" +
                                "    doc: document.documentElement.innerHTML,\n" +
                                "});\n"

    chrome.tabs.executeScript(tab.id, {code: code_to_send_document}, function(){
        console.log("Injected Script successfully.")
    });

    //Receive document, convert it to readable version, add to lunrIndex
    chrome.runtime.onMessage.addListener(function (request, sender) {

        if (request.type === "sending-page-content") {
            let docObj = new DOMParser().parseFromString(request.doc, 'text/html');
            let article = new Readability(docObj).parse();
            let doc = {'url': sender.tab.url, 'title': sender.tab.title, 'content': article.textContent}
            lunrIndex.addDoc(doc);
            console.log("Added Doc:" + sender.tab.url)

            //Update lunrIndex in local Storage
            let serialisedIdx = JSON.stringify(lunrIndex)
            chrome.storage.local.set({serialisedIdx: serialisedIdx}, function() {
                console.log("Saved idx to local storage.");
            });
        }
    });

    //Change browserAction to green
    chrome.browserAction.setIcon({path: "/images/sailboat-search-green.png", tabId: tab.id});

}

function un_archivePage(tab){

    //Remove page from bookmarks folder
    chrome.bookmarks.remove(URL_to_bookmarkId[tab.url], function(){
        delete bookmarkId_to_URL[URL_to_bookmarkId[tab.url]]
        delete URL_to_bookmarkId[tab.url]
        chrome.storage.local.set({bookmarkId_to_URL: bookmarkId_to_URL})
        chrome.storage.local.set({URL_to_bookmarkId: URL_to_bookmarkId})
    })

    //Remove page from lunrIndex
    lunrIndex.removeDocByRef(tab.url);

    //Update lunrIndex in local Storage
    let serialisedIdx = JSON.stringify(lunrIndex)
    chrome.storage.local.set({serialisedIdx: serialisedIdx}, function() {
        console.log("Saved idx to local storage.");
    });

    console.log("Removed Doc:" + tab.url);

    //Change browserAction Icon
    chrome.browserAction.setIcon({path: "images/sailboat-search-black.png", tabId: tab.id});
}


// Create the listeners that listen to the archiveResults content scripts.
chrome.runtime.onMessage.addListener(function (request, sender) {

    if (request.type === "search-archive") {
        if (request.query != null) {
            searchArchive(request.query, sender.tab.id)
        }
    }

    else if (request.type === "get-search-results-from-history") {
        searchHistory({"text": request.query, 'startTime': 0}, sender.tab.id);
    }

    else if (request.type === "colour-me"){
        if(URL_to_bookmarkId[sender.tab.url]){
            //Change browserAction to green
            chrome.browserAction.setIcon({path: "/images/sailboat-search-green.png", tabId: sender.tab.id});
        }
        else{
            chrome.browserAction.setIcon({path: "images/sailboat-search-black.png", tabId: sender.tab.id});
        }
    }

});


function searchHistory(query, tabId) {

    const domainsToExclude = ["www.google.co.in", "www.google.com", "duckduckgo.com"];

    chrome.history.search(query, function (results) {
        let goodResults = results.filter(function (historyItem) {
            return domainsToExclude.indexOf(getDomainFromURL(historyItem.url)) < 0;
        });
        chrome.tabs.sendMessage(tabId, {"type": "set-search-results-from-history", "results": goodResults});
    });
}

function searchArchive(query, tabId) {
    console.log(query)
    query = query.toString()
    query = query.split("+").join(" ");
    console.log(query)
    console.log(lunrIndex)
    let results = lunrIndex.search(query, {
            fields: {
                title: {boost: 10},
                content: {boost: 1, bool: "AND"}
            }
        });
    let goodResults = results.filter(function (item) {
        return item.score > 0.01;
    });
    chrome.tabs.sendMessage(tabId, {"type": "show-archived-results-on-google-page", "results": goodResults});
}






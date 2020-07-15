const commonwords = ["the", "man", "good", "of", "and", "a", "to", "in", "is", "you", "that", "it", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if", "will", "up", "other", "about", "out", "many", "then", "them", "these", "so", "some", "her", "would", "make", "like", "him", "into", "time", "has", "look", "two", "more", "write", "go", "see", "number", "no", "way", "could", "people", "my", "than", "first", "been", "call", "who", "its", "now", "find", "long", "down", "day", "did", "get", "come", "made", "may", "part"];

console.log("Hellow")
const domainsToExclude = ["www.google.co.in", "www.google.co.in"];
const sailboatLogo = chrome.extension.getURL("images/logo_white_sails_no_text.png");

chrome.runtime.sendMessage({"type": "colour-me"});

$(document).ready(function () {

    if (getDomainFromURL(window.location.href).indexOf('.google.') > -1 && isGoogleResultsPage()) {
        const query = getUrlParameter('q', window.location.href);
        try {
            if (removeWordsFromString(commonwords, query)) { //Show results only if the query contains something except stopwords.
                const $resultsBox = $('<div id="sailboat-results" style="border: 1px solid lightblue;">');
                $resultsBox.css({'max-height': '330px', 'width': '454px', 'overflow': 'scroll'});
                $('#rhs').prepend($resultsBox);

                const $sailboatHeader = $("<div id ='sailboat-header' style='height:40px; display:inline-block; width:100%'><img src='" + sailboatLogo + "' style='height:40px; display:block; margin:auto;'/></div>");
                $sailboatHeader.css({'margin-bottom': '5px'});
                $resultsBox.append($sailboatHeader);

                const $resultsContentDiv = $('<div style="padding: 10px;" id="sailboat-results-content">');
                $resultsBox.append($resultsContentDiv);

                // searchArchivedPages(query);
                lunrSearch(query);
                getSearchResultsFromHistory(query);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    if (getDomainFromURL(window.location.href).indexOf("duckduckgo.com") > -1) {
        const query = getUrlParameter('q', window.location.href);
        try {
            if (removeWordsFromString(commonwords, query)) { //Show results only if the query contains something except stopwords.
                const $resultsBox = $('<div id="sailboat-results" style="border: 1px solid lightblue;">');
                $resultsBox.css({'max-height': '330px', 'width': '454px', 'overflow': 'scroll'});
                $('div.sidebar-modules').append($resultsBox);

                const $sailboatHeader = $("<div id ='sailboat-header' style='height:40px; display:inline-block; width:100%'><img src='" + sailboatLogo + "' style='height:40px; display:block; margin:auto;'/></div>");
                $sailboatHeader.css({'margin-bottom': '5px'});
                $resultsBox.append($sailboatHeader);

                const $resultsContentDiv = $('<div style="padding: 10px;" id="sailboat-results-content">');
                $resultsBox.append($resultsContentDiv);

                // searchArchivedPages(query);
                lunrSearch(query);
                getSearchResultsFromHistory(query);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    chrome.storage.local.get("options", function(options) {
        if(options){
            let op = options["options"]
            let automatic_archiving = op["automatic_archiving"]
            let archive_time = op["archive_time"]
            if(automatic_archiving) {
                TimeMe.callAfterTimeElapsedInSeconds(archive_time, function () {
                    chrome.runtime.sendMessage({"type": "archive-me"});
                    console.log("archive me message sent")
                });
            }
        }
    });

    TimeMe.initialize({
        idleTimeoutInSeconds: 10 // seconds
    });


});


function isGoogleResultsPage() { //check if the page is an actual search results page
    if (getUrlParameter('tbm', window.location.href)) {
        const $urlIsGoogleMapPage = Boolean(getUrlParameter('tbm', window.location.href) === 'lcl');
        if ($urlIsGoogleMapPage) { //when tbm=lcl google search results goes into maps mode.
            return false;
        }
    }
    else {
        return true;
    }
}

function lunrSearch(query) {
    chrome.runtime.sendMessage({'type':'search-archive', 'query': query});
}

function getContextString(term, string, length) {
    let wordsArray = string.split(/[.\-_\s,()@!&*+{}:;"'\\?]/);
    let wordsArrayLowercase = string.toLowerCase().split(/[.\-_\s,()@!&*+{}:;"'\\?]/);
    let indexOfTerm = wordsArrayLowercase.indexOf(term.toLowerCase());
    let startPosition = 0;
    if (indexOfTerm > length / 2) {
        startPosition = indexOfTerm - (length / 2);
    }
    let contextTokens = wordsArray.splice(startPosition, length);
    let retStr = "";
    for (let i = 0; i < contextTokens.length; i++) {
        if (contextTokens[i].toLowerCase() === term.toLowerCase()) {
            retStr = retStr + " <strong><abbr>" + contextTokens[i] + "</abbr></strong> ";
        }
        else {
            retStr = retStr + " " + contextTokens[i] + " ";
        }
    }

    return retStr;
}

function newShowArchivedResults(results) {
    // console.log(results);
    // const $archiveResults = $('<div id="sailboat-archive-results" style="padding: 10px; border: 1px solid lightblue;"><p style="color: #008cba;"><b>From your archive</b></p><hr></div>');
    // $archiveResults.css({'max-height':'330px','width':'435px', 'overflow':'scroll', 'margin-bottom':'10px'});
    // $('#rhs').prepend($archiveResults);

    const fromYourArchive = $('<p style="color: #008cba;"><b>From your archive</b></p><hr></div>');
    $("#sailboat-results-content").append(fromYourArchive);

    const $resultsElement = $('#sailboat-results-content');

    if (results.length > 0) {
        for (let i = 0; i < results.length; i++) {
            let result = results[i]["doc"];
            let $resultElement = $('<div class="sailboat-result-element"></div>');
            let $urlString = $('<div class = "sailboat-result-url"><a href="' + result.url+ '">' + result.title + '</a></div>');
            let $matchedTerms = $('<small></small>');
            // let $contextStrings = $('<small class="st"></small>');
            // let matchedTerms = results[i]["matched terms"];
            // for (let j = 0; j < matchedTerms.length; j++) {
            //     $matchedTerms.append($('<strong>' + matchedTerms[j] + ' | </strong>'));
            //     $contextStrings.append($('<p>' + results[i]["context"][j] + '</p>'));
            // }
            // .append($matchedTerms).append($contextStrings)
            $resultElement.append($urlString);//innerHTML = urlString + $matchedTerms + '<br>';
            $resultsElement.append($resultElement);
            $resultsElement.append("<div style='height:5px;'></div>");
        }
    } else {
        $("#sailboat-results-content").append($("<p style='line-height: 1.8em;  background-color: white;'>No matches found. Archive more pages! (right click extension icon and go to options for more info)</p>"));
    }
}


function getSearchResultsFromHistory(query) {
    chrome.runtime.sendMessage({"type": "get-search-results-from-history", "query": query});
}


chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === "set-search-results-from-history") {
        const resultsFromHistory = $('<hr><div><p style="color: #008cba;"><b>From your history</b></p><hr></div>');
        const resultsElement = $("#sailboat-results-content");
        resultsElement.append(resultsFromHistory);
        let results = message.results;
        let resultsMinusResultsFromGoogleSearch = 0;
        for (var i = 0; i < results.length; i++) {
            if (domainsToExclude.indexOf(getDomainFromURL(results[i]["url"])) < 0) {

                let urlString = $("<p><a href='" + results[i]["url"] + "'>" + results[i]["title"] + "</a>" + "</p>");
                resultsElement.append(urlString);
                resultsMinusResultsFromGoogleSearch++;
            }
        }
        if (resultsMinusResultsFromGoogleSearch === 0) {
            var historyNoMatches = $("<p style=' background-color: white;'>No matches found in history.</p>");
            resultsElement.append(historyNoMatches);
        }
        resultsElement.append("<div style='height:5px;'></div>");
    }

    if (message.type === 'show-archived-results-on-google-page') {
        console.log(message.results)
        newShowArchivedResults(message.results)
    }
});

function removeWordsFromString(wordsToRemove, string) {
    //wordsToRemove is an array of words that should be removed.
    //this function returns a string with the specific words removed.

    if (!string)
        return '';

    let words = string.split(" ");
    const stringLength = words.length;
    for (let i = 0; i < stringLength; i++) {
        if (wordsToRemove.indexOf(words[i]) > -1) {
            words.splice(i, 1);
            i = i - 1; //reset the counter to the previous position.
        }
    }
    return words.join(" ");
}

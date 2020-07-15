function getDomainFromURL(url) {
    let domain = "";
    const arr = url.split('/');
    if (url.search("http") !== -1) {
        domain = arr[2];
    }
    else {
        domain = arr[0];
    }
    return domain;
}

function getUrlParameter(sParam, url) {
    let sPageURL = decodeURIComponent(url),
        sURLVariables = sPageURL.replace('?', '&').split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
}




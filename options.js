
function save_options() {
    let automatic_archiving = document.getElementById('automatic_archiving').checked;
    let archive_time = document.getElementById('archive_time').value;
    chrome.storage.local.set(
        {"options": {"automatic_archiving": automatic_archiving, "archive_time": archive_time}},
        function () {
            // Update status to let user know options were saved.
            let status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(function () {
                status.textContent = '';
            }, 750);
        })
}

function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.local.get("options", function(options) {
        if(options["options"]){
            let op = options["options"]
            let automatic_archiving = op["automatic_archiving"]
            let archive_time = op["archive_time"]
            document.getElementById('automatic_archiving').checked = automatic_archiving;
            document.getElementById('archive_time').value= archive_time;
        }
    });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
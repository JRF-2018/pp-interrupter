/*
 * options.js of pp-interrupter
 *
 * Time-stamp: <2017-12-26T00:25:56Z>
 */

var selectedItem = null;
var editMode = "extension";
var settings;

//console.log("options.js: ok");

function $ (aSelector, aNode) {
  return (aNode || document).querySelector(aSelector);
}

function updateSettings () {
  return new Promise ((rs, rj) => {
    chrome.runtime.sendMessage({
      type: "update-settings",
      settings: settings
    }, rs);
  });
}

function redrawSettings () {
  chrome.runtime.sendMessage({type: "get-settings"}, res => {
    settings = res.settings;
    let list_div = $('#choose-extensions');
    list_div.innerHTML = "";
    for (let i = 0; i < settings.extensions.length; i++) {
      let a = settings.extensions[i];
      let div = document.createElement('div');
      div.id = 'extension-' + i;
      div.className = 'item';
      if (selectedItem != null && selectedItem == div.id) {
	div.className = "item selected";
      }
      let span = document.createElement('span');
      span.textContent = a.name;
      div.appendChild(span);
      list_div.appendChild(div);
    }

    list_div = $('#choose-authorities');
    list_div.innerHTML = "";
    for (let i = 0; i < settings.authorities.length; i++) {
      let a = settings.authorities[i];
      let div = document.createElement('div');
      div.id = 'authority-' + i;
      div.className = "item";
      if (selectedItem !== null && selectedItem == div.id) {
	div.className = "item selected";
      }
      let span = document.createElement('span');
      span.textContent = a.name;
      div.appendChild(span);
      list_div.appendChild(div);
    }
  });
}

$('#choose').addEventListener('click', e => {
  var div = e.target;
  if (e.target.tagName == 'INPUT') {
    return;
  }
  while (div.tagName != "DIV" && div.parentNode) {
    div = div.parentNode;
  }
  if (div.tagName != "DIV" || ! div.classList.contains("item")) {
    selectedItem = null;
  } else {
    selectedItem = div.id;
  }
  $('#choose-error').textContent = "";
  redrawSettings();
  e.stopPropagation();
}, false);


$('#choose-new-e').addEventListener('click', e => {
  selectedItem = null;
  editMode = "extension";
  $('#edit-label').textContent = "extension ID";
  $('#edit-name').value = "";
  $('#edit-url').value = "";
  $('#edit-error').textContent = "";
  $('#choose-error').textContent = "";
  $("#choose").style.display = "none";
  $("#edit").style.display = "block";
}, false);

$('#choose-new-a').addEventListener('click', e => {
  selectedItem = null;
  editMode = "authority";
  $('#edit-label').textContent = "url";
  $('#edit-name').value = "";
  $('#edit-url').value = "";
  $('#edit-error').textContent = "";
  $('#choose-error').textContent = "";
  $("#choose").style.display = "none";
  $("#edit").style.display = "block";
}, false);

$('#choose-edit').addEventListener('click', e => {
  if (selectedItem === null) {
    $('#choose-error').textContent = "Error: You must click an item at first or click 'New'.";
    return;
  }
  selectedItem.match(/^(.*)-(.*)$/);
  let s = RegExp.$1;
  let num = parseInt(RegExp.$2, 10);
  if (s == "extension") {
    editMode = "extension";
    $('#edit-label').textContent = "extension ID";
    let a = settings.extensions[num];
    $('#edit-name').value = a.name;
    $('#edit-url').value = a.id;
  } else {
    editMode = "authority";
    $('#edit-label').textContent = "url";
    let a = settings.authorities[num];
    $('#edit-name').value = a.name;
    $('#edit-url').value = a.url;
  }
  $('#edit-error').textContent = "";
  $('#choose-error').textContent = "";
  $("#choose").style.display = "none";
  $("#edit").style.display = "block";
}, false);

$('#choose-up').addEventListener('click', e => {
  if (selectedItem === null) {
    $('#choose-error').textContent = "Error: You must click an item at first.";
    return;
  }
  selectedItem.match(/^(.*)-(.*)$/);
  let s = RegExp.$1;
  let num = parseInt(RegExp.$2, 10);

  if (s == "extension") {
    let l = Object.assign([], settings.extensions);
    if (num - 1 < 0) return;
    l[num - 1] = settings.extensions[num];
    l[num] = settings.extensions[num - 1];
    num = num - 1;
    settings.extensions = l;
    selectedItem = "extension-" + num;
  } else {
    let l = Object.assign([], settings.authorities);
    if (num - 1 < 0) return;
    l[num - 1] = settings.authorities[num];
    l[num] = settings.authorities[num - 1];
    num = num - 1;
    settings.authorities = l;
    selectedItem = "authority-" + num;
  }
  $('#choose-error').textContent = "";
  updateSettings().then(() => {
    redrawSettings();
  });
}, false);

$('#choose-down').addEventListener('click', e => {
  if (selectedItem === null) {
    $('#choose-error').textContent = "Error: You must click an item at first.";
    return;
  }
  selectedItem.match(/^(.*)-(.*)$/);
  let s = RegExp.$1;
  let num = parseInt(RegExp.$2, 10);

  if (s == "extension") {
    let l = Object.assign([], settings.extensions);
    if (num + 1 >= settings.extensions.length) return;
    l[num + 1] = settings.extensions[num];
    l[num] = settings.extensions[num + 1];
    num = num + 1;
    settings.extensions = l;
    selectedItem = "extension-" + num;
  } else {
    let l = Object.assign([], settings.authorities);
    if (num + 1 >= settings.authorities.length) return;
    l[num + 1] = settings.authorities[num];
    l[num] = settings.authorities[num + 1];
    num = num + 1;
    settings.authorities = l;
    selectedItem = "authority-" + num;
  }
  $('#choose-error').textContent = "";
  updateSettings().then(() => {
    redrawSettings();
  });
}, false);

$('#choose-delete').addEventListener('click', e => {
  if (selectedItem === null) {
    $('#choose-error').textContent = "Error: You must click an item at first.";
    return;
  }

  selectedItem.match(/^(.*)-(.*)$/);
  let s = RegExp.$1;
  let num = parseInt(RegExp.$2, 10);
  if (s == "extension") {
    let l = [];
    for (let i = 0; i < settings.extensions.length; i++) {
      if (num != i) {
	l.push(settings.extensions[i]);
      }
    }
    if (num >= l.length) {
      selectedItem = null;
    }
    settings.extensions = l;
  } else {
    let l = [];
    for (let i = 0; i < settings.authorities.length; i++) {
      if (num != i) {
	l.push(settings.authorities[i]);
      }
    }
    if (num >= l.length) {
      selectedItem = null;
    }
    settings.authorities = l;
  }

  $('#choose-error').textContent = "";
  updateSettings().then(() => {
    redrawSettings();
  });
}, false);

$('#edit-save').addEventListener('click', e => {
  let a = {};
  let name = $('#edit-name').value;
  let url = $('#edit-url').value;
  name = name.replace(/^\s+/, "").replace(/\s+$/, "");
  url = url.replace(/^\s+/, "").replace(/\s+$/, "");

  if (name == "") {
    $('#edit-error').textContent = "Error: The name has no value.";
    return;
  }
  a.name = name;
  if (name.length > 127) {
    $('#edit-error').textContent = "Error: The name is too long.";
    return;
  }
  if (url == "") {
    $('#edit-error').textContent = "Error: The url or ID has no value.";
    return;
  }
  if (editMode == "extension") {
    a.id = url;
    let l = Object.assign([], settings.extensions);
    if (selectedItem !== null) {
      selectedItem.match(/^(.*)-(.*)$/);
      let num = parseInt(RegExp.$2, 10);
      l[num] = a;
    } else {
      l.push(a);
    }
    settings.extensions = l;
  } else {
    a.url = url;
    let l = Object.assign([], settings.authorities);
    if (selectedItem !== null) {
      selectedItem.match(/^(.*)-(.*)$/);
      let num = parseInt(RegExp.$2, 10);
      l[num] = a;
    } else {
      l.push(a);
    }
    settings.authorities = l;
  }
  $('#choose-error').textContent = "";
  $('#edit-error').textContent = "";
  $("#edit").style.display = "none";
  $("#choose").style.display = "block";
  updateSettings().then(() => {
    redrawSettings();
  });
}, false);

$('#edit-cancel').addEventListener('click', e => {
  $('#choose-error').textContent = "";
  $('#edit-error').textContent = "";
  $("#edit").style.display = "none";
  $("#choose").style.display = "block";
  redrawSettings();
}, false);

$('#choose-add-pp').addEventListener('click', e => {
  chrome.runtime.sendMessage({type: "add-from-pp-authorizer"}, x => {
    if (x) {
      $('#choose-error').textContent = "";
      $('#edit-error').textContent = "";
      $("#edit").style.display = "none";
      $("#choose").style.display = "block";
      redrawSettings();
    } else {
      $('#choose-error').textContent = "Error: PP Authorizer doesn't exist in the browser.";
    }
  });
}, false);


$("#choose").style.display = "block";
$("#edit").style.display = "none";
redrawSettings();

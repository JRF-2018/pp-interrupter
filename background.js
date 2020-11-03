/*
 * background.js of pp-interrupter
 *
 * Time-stamp: <2020-11-03T05:22:26Z>
 */
//console.log("background.js: ok");

var tabData = {};
var settings;
var notificationShown = false;
const notificationId = "pp-interrupter-notification";
const myStorage = ('sync' in chrome.storage)?
  chrome.storage.sync : chrome.storage.local;

(async function () {
  let data = await (new Promise ((rs, rj) => {
    myStorage.get(null, x => {
      const e = chrome.runtime.lastError;
      if (e) rj(e);
      else rs(x);
    });
  }));
  if (! ('settings' in data) && myStorage != chrome.storage.local) {
    data = await (new Promise ((rs, rj) => {
      chrome.storage.local.get(null, x => {
	const e = chrome.runtime.lastError;
	if (e) rj(e);
	else rs(x);
      });
    }));
    chrome.storage.local.clear();
  }
//  console.log('background.js: storage init(a).');
  if ('settings' in data) {
    settings = data.settings;
  } else {
    settings = {};
  }
  for (let k in INIT_SETTINGS) {
    if (! (k in settings)) {
      settings[k] = INIT_SETTINGS[k];
    }
  }
  myStorage.set({
    settings: settings
  });
  updateBlocking();
})().catch(e => {
//  console.log('background.js: storage init(b).');
  settings = INIT_SETTINGS;
  myStorage.set({
    settings: settings
  });
  updateBlocking();
});

chrome.runtime.onMessageExternal.addListener(handleExternalMessage);
chrome.runtime.onMessage.addListener(handleMessage);

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId in tabData) {
    const data = tabData[tabId];
    if ('div' in data) {
      data.div.dispatchEvent(new CustomEvent("go", {detail: false}));
      document.body.removeChild(data.div);
      chrome.notifications.clear(notificationId);
    }
    delete tabData[tabId];
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab)  => {
  if (tabId in tabData) {
    const data = tabData[tabId];
    if ('div' in data) {
      data.div.dispatchEvent(new CustomEvent("go", {detail: false}));
      document.body.removeChild(data.div);
      chrome.notifications.clear(notificationId);
    }
    if (! ('url' in data) || changeInfo.status == "complete") {
      delete tabData[tabId];
    }
  }
  //chrome.pageAction.hide(tabId);
  chrome.browserAction.disable(tabId);
});

//chrome.pageAction.onClicked.addListener(tab => {
chrome.browserAction.onClicked.addListener(tab => {
  if (tab.id in tabData) {
    const data = tabData[tab.id];
    if ('div' in data) {
      data.div.dispatchEvent(new CustomEvent("go", {detail: true}));
      document.body.removeChild(data.div);
      chrome.notifications.clear(notificationId);
    }
    delete tabData[tab.id];
//    chrome.pageAction.hide(tab.id);
    chrome.browserAction.disable(tab.id);
  }
});

function blockRequest (details) {
//  console.log("blocking: " + details.requestId + " " + details.tabId + " " + details.url);
  if (details.tabId == -1) return {cancel: false};
  if (details.tabId in tabData 
      && 'url' in tabData[details.tabId]
      && tabData[details.tabId].url == details.url) {
    return {cancel: false};
  }
  let a = null;
  for (let i = 0; i < settings.authorities.length; i++) {
    const url = settings.authorities[i].url;
    if (details.url == url
	  || (details.url.length > url.length && 
	      details.url.substr(0, url.length) == url
	      && (url.match(/[\/]$/)
		  || details.url.substr(url.length, 1).match(/[\?\&\/]/)))) {
      a = settings.authorities[i];
      break;
    }
  }
  if (! a) return {cancel: false};
  if (details.originUrl) {
    const link = details.originUrl;
    if (link == a.url
	  || (link.length > a.url.length && 
	      link.substr(0, a.url.length) == a.url
	      && (a.url.match(/[\/]$/)
		  || link.substr(a.url.length, 1).match(/[\?\&\/]/)))) {
      return {cancel: false};
    }
  }

  const div = document.createElement('div');
  div.id = "request-" + details.requestId;
  document.body.appendChild(div);
  var p = new Promise ((resolve, reject) => {
    div.addEventListener("go", e => {
      if (e.detail) {
//	console.log("go");
	resolve({cancel: false});
      } else {
//	console.log("cancel");
	resolve({cancel: true});
      }
    }, false);
  });
  tabData[details.tabId] = {div: div};
//  chrome.pageAction.show(details.tabId);
  chrome.browserAction.enable(details.tabId);
//  if ('setTitle' in chrome.pageAction) {
//    chrome.pageAction.setTitle({
  if ('setTitle' in chrome.browserAction) {
    chrome.browserAction.setTitle({
      tabId: details.tabId,
      title: "PP Interrupter: " + a.name
    });
  }
  if (! notificationShown) {
    chrome.notifications.create(notificationId, {
      type: "basic",
      iconUrl: chrome.extension.getURL("icons/pp-red_48.png"),
      title: "PP Interrupter",
      message: "Interrupting! To go on, click the icon in the address bar.\n"
	+ "(" + a.name + ") " + details.url
    });
    notificationShown = true;
    setTimeout(() => { notificationShown = false; }, 10000);
  }

  return p;
}

function updateBlocking () {
  if (chrome.webRequest.onBeforeRequest.hasListener(blockRequest)) {
    chrome.webRequest.onBeforeRequest.removeListener(blockRequest);
  }
  if (settings.authorities.length == 0) return;
  
  let l = [];
  for (let i = 0; i < settings.authorities.length; i++) {
    const a = settings.authorities[i];
    l.push(a.url + "*");
  }
  chrome.webRequest.onBeforeRequest.addListener(
    blockRequest,
    {
      urls: l,
      types: ["main_frame"]
    },
    ["blocking"]
  );
}

function handleExternalMessage (req, sender, sendResponse) {
  const f = {
    "permit": handlePermit
  };

  let x = false;
  for (let i = 0; i < settings.extensions.length; i++) {
    if (settings.extensions[i].id == sender.id) {
      x = true;
      break;
    }
  }
  if (! x) {
    return;
  }
  if (req.type in f) {
    return f[req.type](req, sender, sendResponse);
  } else {
//    console.log("background.js: unreacheable code.");
  }
}

function handlePermit (req, sender, sendResponse) {
//  console.log("background: permit");
  if (req.tabId in tabData) return;
//  console.log("permit: " + req.tabId + " " + req.url);
  tabData[req.tabId] = {url: req.url};
  sendResponse(true);
}

function handleMessage (req, sender, sendResponse) {
  const f = {
    "get-settings": handleGetSettings,
    "update-settings": handleUpdateSettings,
    "add-from-pp-authorizer": handleAddFromPPAuthorizer
  };

  if (req.type in f) {
    return f[req.type](req, sender, sendResponse);
  } else {
//    console.log("background.js: unreacheable code.");
  }
}

function handleGetSettings (req, sender, sendResponse) {
//  console.log("background: get-settings");
  sendResponse({settings: settings});
}

function handleUpdateSettings (req, sender, sendResponse) {
//  console.log("background: update-settings");
  settings = req.settings;
  updateBlocking();
  myStorage.set({
    settings: settings
  }, x => {
    sendResponse();
  });
  return true;
}

function handleAddFromPPAuthorizer (req, sender, sendResponse) {
//  console.log("background: add-from-pp-authorizer");
  chrome.runtime.sendMessage(PP_AUTHORIZER_ID, {type: "get-settings"}, x => {
    if (chrome.runtime.lastError) {
      sendResponse(false);
      return;
    }
    let l = Object.assign([], settings.authorities);
    for (let i = 0; i < x.authorities.length; i++) {
      const a = x.authorities[i];
      let y = false;
      for (let j = 0; j < settings.authorities.length; j++) {
	const b = settings.authorities[j];
	if (a.name == b.name && a.url == b.url) {
	  y = true;
	  break;
	}
      }
      if (! y) {
	l.push({name: a.name, url: a.url});
      }
    }
    settings.authorities = l;

    l = Object.assign([], settings.extensions);
    let y = false;
    for (let j = 0; j < settings.extensions.length; j++) {
      if (settings.extensions[j].id == PP_AUTHORIZER_ID) {
	y = true;
	break;
      }
    }
    if (! y) {
      l.push({name: "PP Authorizer", id: PP_AUTHORIZER_ID});
    }
    settings.extensions = l;
    
    updateBlocking();
    myStorage.set({
      settings: settings
    }, x => {
      sendResponse(true);
    });
  });
  return true;
}

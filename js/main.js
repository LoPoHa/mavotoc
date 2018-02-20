// TODO:: comments

function getCompleteUrl(url) {
	if (typeof browser !== 'undefined') {
		// firefox based
		return browser.extension.getURL(url);
	} else {
		// assume chromium based browser
		return chrome.runtime.getURL(url);
	} 
}

function injectHTML () {
	let sectionContainerDiv = document.querySelector('#main .section-radius');
	sectionContainerDiv.style.width = sectionContainerDiv.offsetWidth + 150 + 'px';
	sectionContainerDiv.id = 'mavotoc_webextension_container';

	let newButtonDiv = document.createElement('div');
	newButtonDiv.id= 'mavotoc_webextension_button_div';
	newButtonDiv.setAttribute('style', 'float: left; margin-right: 8px;');

	let newButtonA = document.createElement('a');
	newButtonA.className = 'a-img-button';
	newButtonA.id = 'mavotoc_webextension_button_a';

	newButtonA.style.backgroundImage = 'url(' + getCompleteUrl('images/csv_button.png') + ')';

	newButtonDiv.appendChild(newButtonA);

	let sectionHeaderButtons = document.querySelector('#main.mylist .sectionHeader .sectionHeaderButtons');
	sectionHeaderButtons.insertBefore(newButtonDiv, sectionHeaderButtons.firstChild);


	let popupContainerDiv = document.createElement('div');
	popupContainerDiv.id = 'mavotoc_webextension_popup_container';

	let popupContentDiv = document.createElement('div');
	popupContentDiv.id = 'mavotoc_webextension_popup_content';
	popupContainerDiv.appendChild(popupContentDiv);

	let popupCloseButton = document.createElement('span');
	popupCloseButton.innerHTML = '&times;';
	popupCloseButton.id = 'mavotoc_webextension_popup_close';
	popupContentDiv.appendChild(popupCloseButton);

	let popupToClipBoardButton = document.createElement('span');
	popupToClipBoardButton.innerHTML = '&#x2704;';
	popupToClipBoardButton.id = 'mavotoc_webextension_popup_to_clipboard';
	popupContentDiv.appendChild(popupToClipBoardButton);

	let popupContentP= document.createElement('p');
	popupContentP.id = 'mavotoc_webextension_popup_content_p';
	popupContentDiv.appendChild(popupContentP);

	document.body.appendChild(popupContainerDiv);
}


function addHandler() {
	let buttonA = document.getElementById('mavotoc_webextension_button_a');
	let popupContainer = document.getElementById('mavotoc_webextension_popup_container');
	let popupContent = document.getElementById('mavotoc_webextension_popup_content_p');
	let popupClose = document.getElementById('mavotoc_webextension_popup_close');
	let popupToClipBoard = document.getElementById('mavotoc_webextension_popup_to_clipboard');
	let wordClassContainer = document.getElementById('divWordClassContainer');
	let lastVocabulary = {
		url: '',
		vocabulary: {}
	};

	// allow the user to simply copy to clipboard with a single click
	popupToClipBoard.onclick = function() {
		// Select the text field
		window.getSelection().selectAllChildren(popupContent);

		// Copy the text inside the text field
		document.execCommand("Copy");
	}

	// hide the popup if users presses on the x
	popupClose.onclick = function() {
		popupContainer.style.display = 'none';
	}

	// When the user clicks anywhere outside of the popup, close it
	window.onclick = function(event) {
		if (event.target == popupContainer) {
			popupContainer.style.display = 'none';
		}
	} 

	buttonA.onclick = function() {
		loadVocabulary();
	}

	function addContentAndDisplayPopop(contentString) {
		popupContent.innerHTML = contentString;
		popupContainer.style.display = 'block';
	}

	function loadVocabulary() {
		let config = getConfigFromUrl();
		let url = 'http://words.marugotoweb.jp/SearchCategoryAPI'
			+ '?ut=' + (config.lang || 'en')
			+ '&lv=' + config.lv
			+ (config.tp.length > 0 ? '&tp=' + config.tp.join(',') : '')
			+ (config.ls.length> 0 ? '&ls=' + config.ls.join(',') : '')
			+ (config.tx.length > 0 ? '&tx=' + config.tx.join(',') : '')
			+ (config.cd.length > 0 ? '&cd=' + config.cd.join(',') : '')
			+ (config.learn_ex.length > 0 ? '&learn_ex=' + config.learn_ex.join(',') : '');
			// since i dont know what should be in config.classToken it isn't appended here.
			// + (config.learn_ex.length > 0 ? '&learn_ex=' + config.tp.join(',') : '');

		if (lastVocabulary.url == url) {
			// already open, so dont reload
			let contentString = createList(lastVocabulary.vocabulary, getExcludedFromCookies());
			addContentAndDisplayPopop(contentString);
		} else {
			addContentAndDisplayPopop('Please wait while the CSV is downloaded and created.');
			let request = new XMLHttpRequest(); 
			request.onreadystatechange = function() {
				let jsonResponse = JSON.parse(request.responseText);
				lastVocabulary.vocabulary = jsonResponse.DATA;
				let excluded = jsonResponse.EXCLUDE.split(',');
				let contentString = createList(lastVocabulary.vocabulary, excluded);
				addContentAndDisplayPopop(contentString);
				lastVocabulary.url = url;
			}
			request.open("GET", url, true);
			request.send(null);
		}
	}

	function addContentAndDisplayPopop(contentString) {
		popupContent.innerHTML = contentString;
		popupContainer.style.display = 'block';
	}

	// check if the user want kanji notation
	function isKanji() {
		return getCookie('notation') === 'kanji';
	}

	// found online. TODO: Credit the poster
	function getCookie(name) {
		let nameEQ = name + '=';
		let ca = document.cookie.split(';');
		for(let i=0;i < ca.length;i++) {
			let c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	}

	function getExcludedFromCookies() {
		let excluded = [];
		let cookies = document.cookie.split(';');
		for (var i = i; i < cookies.length; i++) {
			let cookie = cookies[i].split('=');
			if (cookie[0].startsWith('excludedWordIds')) {
				if (cookie[1] !== "") {
					let to_add = cookie[1].split('%2C1');
					excluded = excluded.concat(to_add);
				}
			}
		}
		return excluded;
	}

	function createList(vocabularyAllList, exclude) {
		let kanji = isKanji();
		let contentString = '';
		for (let i = 0; i < vocabularyAllList.length; i++) {
			// check if vocabulary is excluded
			if (exclude.indexOf(vocabularyAllList[i].ID) == -1) {
				let to_add = '';
				if (kanji) {
					to_add = vocabularyAllList[i].KANJI;
				} else {
					to_add = vocabularyAllList[i].KANA;
				}
				// replace ideographic space with normal space
        to_add = to_add.replace(/\u3000/, ' ').trim();
				contentString += vocabularyAllList[i].UWRD + ';' + to_add + '<br />';
			}
		}
		return contentString;
	}

	function getConfigFromUrl() {	
		let config = {
			lv: '',
			tp: [],
			ls: [],
			tx: [],
			cd: [],
			learn_ex: [],
			// what is classToken???
			classToken: [],
			lang: '',
		};
		let url = new URL(document.location);
		let params = new URLSearchParams(url.search);
		for (let p of params) {
			let param_name = p[0];
			let param_value = p[1];
			switch (param_name) {
				case 'lv':
					config.lv = param_value;
					break;
				case 'tp[]':
					config.tp.push(param_value);
					break;
				case 'ls[]':
					config.ls.push(param_value);
					break;
				case 'tx[]':
					config.tx.push(param_value);
					break;
				case 'cd[]':
					config.cd.push(param_value);
					break;
				case 'learn_ex[]':
					config.learn_ex.push(param_value);
				case 'class[]':
					config.classToken.push(param_value);
					break;
				case 'lang':
					config.lang = param_value;
					break;
					/*
				default:
					console.log('unknown param: ' + param_name);
					console.log(p);
					*/
			}
		}
		return config;
	}
}

injectHTML();
addHandler();

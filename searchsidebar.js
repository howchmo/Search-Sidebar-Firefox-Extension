// sidebar.js
//
//

var myWindowId;

var search_terms_tabs = {};
var search_term = "";

browser.windows.getCurrent({populate: true}).then((windowInfo) => {
	if( typeof myWindowId == "undefined" )
  	myWindowId = windowInfo.id;
});

function checkSearchTerms()
{
	browser.storage.local.get("search_terms_tabs").then( function( item )
	{
		search_terms_tabs = item.search_terms_tabs;
		for ( var key in search_terms_tabs )
		{
			div=$("<div/>", {
				class: "search-term",
				html: key
			}).click( function() {
				console.log("search term selected");
				if( search_term != "" )
					$('.search-term:contains("'+search_term+'")').removeClass("search-term-selected");
				search_term = $(this).html();
				$(this).addClass("search-term-selected");
				tabs = search_terms_tabs[search_term];
				for( var i = 0; i<tabs.length;i++ )
				{
					console.log(tabs[i]);
					browser.tabs.create({url:"https://"+tabs[i].title});
				}
			});
			$("#search-term-history").prepend(div);
			search_terms = key;
		}
	}
	,
	function(e) {
		browser.storage.local.set({"search_terms_tabs":search_terms_tabs});
	}
	);
}

function onError(e) {
	console.error(e);
}

function swapSearchTermTabs()
{
	//for( key in search_terms_tabs )
			browser.tabs.show(search_terms_tabs[search_term]).then( function() {
				console.log("swap "+search_term);
				console.log("swap "+JSON.stringify(search_terms_tabs[search_term]));

				var tabIdToHighlight = search_terms_tabs[search_term][0];
				browser.tabs.get(tabIdToHighlight).then( function( info )
				{
					console.log(JSON.stringify(info.index));
					tabsToHighlight = [ info.index ];
					browser.tabs.highlight({tabs:tabsToHighlight}).then( function() {
						console.log("Hightlight "+info.index);
						for( key in search_terms_tabs )
							if( key != search_term )
								browser.tabs.hide(search_terms_tabs[key]);
					});
				});

			});
}

function search()
{
	search_term_entry = $("#search-term-entry").text();
	if( search_term_entry != "" )
	{
		div=$("<div/>", {
			class: "search-term",
			html: search_term_entry
		}).click( function() {
			if( search_term != "" )
				$('.search-term:contains("'+search_term+'")').removeClass("search-term-selected");
			search_term = $(this).html();
			$(this).addClass("search-term-selected");
			swapSearchTermTabs();
		});
		$("#search-term-history").prepend(div);
		$("#search-term-entry").html("");
		search_term = search_term_entry;
		browser.search.search({
			query: search_term
		}).then( function( searchInfo ) {
			 swapSearchTermTabs();
		});
	}
}

function findObjectInArray( array, key, value )
{
	var item = undefined;
	for( var i = 0; i < array.length; i++ )
	{
		item = array[i];
		if( item == value )
			return i;
	}
	return undefined
}

$(function() {

checkSearchTerms();

$("#search-button").mousedown( function() {
	search();
});

$("#search-box").on("keyup", function(e) {
	if( e.which == 13 ) { // ENTER
		setTimeout(search(),1);
	}
});

browser.tabs.onCreated.addListener((tab) => {
	if( search_term !== "" )
	{
		if( typeof search_terms_tabs == "undefined" )
			search_terms_tabs = {};
		if( typeof search_terms_tabs[search_term] == "undefined" )
			search_terms_tabs[search_term] = [];
		search_terms_tabs[search_term].push(tab.id);
		browser.tabs.onUpdated.addListener(
			function( tabId, changeInfo, tabInfo )
			{
				if( changeInfo.status == "complete" )
				{
					tab["search_term"] = search_term;
					//browser.storage.local.set({"search_terms_tabs":search_terms_tabs});
				}
					// browser.tabs.onUpdated.removeListener( listener );
			},
			{
				tabId:tab.id
			}
		);
	}
});


browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
	if( typeof search_terms_tabs !== "undefined" )
	{
		console.log(JSON.stringify(search_terms_tabs));
		console.log(search_term);
		var i = findObjectInArray(search_terms_tabs[search_term], "id",tabId);
		if( typeof i !== "undefined" )
		{
			search_terms_tabs[search_term].splice(i,1);
			console.log(JSON.stringify(search_terms_tabs));
		}
	}
});

});



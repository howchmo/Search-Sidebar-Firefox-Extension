// sidebar.js
//
//

var myWindowId;

var search_terms = {};
var search_term = "";

browser.windows.getCurrent({populate: true}).then((windowInfo) => {
	if( typeof myWindowId == "undefined" )
  	myWindowId = windowInfo.id;
});

function clickingSearchTerm()
{
	// Highlight the search term in the sidebar
	if( search_term != "" )
		$('.search-term:contains("'+search_term+'")').removeClass("search-term-selected");
	search_term = $(this).html();
	$(this).addClass("search-term-selected");
	
	if( search_terms[search_term].tabs.length == 0 )
	{
		if( search_terms[search_term].links.length == 0 )
			searchAgain(search_term);
		else
		{
			for( var i=0; i<search_terms[search_term].links.length; i++ )
			{
				browser.tabs.create({url:search_terms[search_term].links[i]}).then( function( tab )
				{
					search_terms[search_term].links.splice(i,0);
				});
			}
		}
	}
	setTimeout(swapSearchTermTabs,100);
}

function loadSearchTerms()
{
	browser.storage.local.get("search_terms").then( function( item )
	{
		search_terms = item.search_terms;
		for( key in search_terms )
			search_terms[key].tabs = []; 
		console.log("load "+JSON.stringify(search_terms));
		for ( var key in search_terms )
		{
			div=$("<div/>", {
				class: "search-term",
				html: key
			}).click( clickingSearchTerm );
			$("#search-term-history").prepend(div);
			search_term = key;
		}
	}
	,
	function(e) {
		browser.storage.local.set({"search_terms":search_terms});
	}
	);
}

async function saveSearchTerms()
{
	for( var key in search_terms )
	{
		var links = [];
		//if( search_terms[key].links.length < search_terms[key].tabs.length )
		//{
			//search_terms[key].links = [];
		for( var i=0; i<search_terms[key].tabs.length; i++ )
		{
			var tabPromise = await browser.tabs.get(search_terms[key].tabs[i]);
			links.push(tabPromise.url);
		}
		if( search_terms[key].links.length == 0 )
			search_terms[key].links = links;
		//}
	}
	await browser.storage.local.set({"search_terms":search_terms});
	console.log("DONE saving ");
	for( key in search_terms )
	{
		console.log("            "+key+" : "+JSON.stringify(search_terms[key]));
		if( search_terms[key].tabs.length == search_terms[key].links.length )
			search_terms[key].links = [];
	}
}

function onError(e) {
	console.error(e);
}

function determineTabToHighlight()
{
	var highlightTabIndex = 0;
	if( typeof search_terms[search_term].highlight !== "undefined" )
		highlightTabIndex = search_terms[search_term].highlight;
	// default to the first tab
	var highlightedTabId = search_terms[search_term].tabs[highlightTabIndex];
	return highlightedTabId;
}

function swapSearchTermTabs()
{
	if( Object.entries(search_terms).length != 1 )
	{
		if( search_terms[search_term].tabs.length > 0 )
		{//for( key in search_terms_tabs )
			browser.tabs.show(search_terms[search_term].tabs).then( function()
			{
				var tabIdToHighlight = determineTabToHighlight();
				browser.tabs.get(tabIdToHighlight).then( function( info )
				{
					tabsToHighlight = [ info.index ];
					browser.tabs.highlight({tabs:tabsToHighlight}).then( function() {
						// console.log("hightlight "+info.index);
					});
				});
			});
			setTimeout( function() {
				for( key in search_terms )
					if( key != search_term )
						if( search_terms[key].tabs.length > 0 )
							browser.tabs.hide(search_terms[key].tabs);
			}, 10);
		}
	}
}

function searchAgain( search_term_entry )
{
	if( search_term_entry != "" )
	{
		search_term = search_term_entry;
		browser.search.search({
			query: search_term
		}).then( function( searchInfo ) {
			setTimeout(swapSearchTermTabs,100);
		});
	}
}

function search()
{
	search_term_entry = $("#search-term-entry").text();
	if( search_term_entry != "" )
	{
		div=$("<div/>", {
			class: "search-term search-term-selected",
			html: search_term_entry
		}).click( clickingSearchTerm );
		$("#search-term-history").prepend(div);
		$("#search-term-entry").html("");
		if( search_term != "" )
			$('.search-term:contains("'+search_term+'")').removeClass("search-term-selected");
		search_term = search_term_entry;
		$(this).addClass("search-term-selected");
		browser.search.search({
			query: search_term
		}).then( function( searchInfo ) {
			setTimeout(swapSearchTermTabs,100);
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
	return item;
}

$(function() {

loadSearchTerms();

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
		if( typeof search_terms == "undefined" )
			search_terms = {};
		if( typeof search_terms[search_term] == "undefined" )
			search_terms[search_term] = {
				highlight:0,
				tabs:[],
				links:[]
			};
		if( !search_terms[search_term].tabs.includes(tab.id) )
			search_terms[search_term].tabs.push(tab.id);
		browser.tabs.onUpdated.addListener(
			function( tabId, changeInfo, tabInfo )
			{
				if( typeof changeInfo !== "undefined" )
				{
					// console.log("onUpdated push "+tabId);
					// console.log("               "+JSON.stringify(changeInfo));
					// console.log("               "+JSON.stringify(tabInfo));
	
					if( changeInfo.status == "complete" )
					{
						console.log("onUpdated  "+JSON.stringify(changeInfo.status));
						{
								// if( search_terms[search_term].links.length < search_terms[search_term].tabs.length )
								//	search_terms[search_term].links.push(tabInfo.url);
								console.log("onUpdated "+search_term);
								console.log("          "+JSON.stringify(search_terms[search_term].tabs));
								console.log("          "+JSON.stringify(search_terms[search_term].links));
								saveSearchTerms();
						}
					}
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
	if( typeof search_terms[search_term].tabs !== "undefined" )
	{
		var i = findObjectInArray(search_terms[search_term].tabs, "id",tabId);
		console.log("Remove "+search_term+" - "+i);
		if( typeof i !== "undefined" )
		{
			search_terms[search_term].tabs.splice(i,1);
			search_terms[search_term].links.splice(i,1);
			/*
			console.log("onRemove "+JSON.stringify(search_terms[search_term].links));
			search_terms[search_term].links.splice(i,1);
			console.log("onRemove "+JSON.stringify(search_terms[search_term],links));
			console.log("onRemove "+JSON.stringify(search_terms[search_term].tabs));
			console.log("onRemove "+JSON.stringify(search_terms[search_term].tabs));
			*/
			saveSearchTerms();
		}
	}
});

browser.tabs.onHighlighted.addListener((highlightInfo) => {
	for( var i=0; i<search_terms[search_term].tabs.length; i++ )
	{
		if( search_terms[search_term].tabs[i] == highlightInfo.tabIds[0] )
		{
			search_terms[search_term].highlight = i;
		}
	}
	saveSearchTerms();
});

});


$(function(){
	var $articles = $('article');
	
	var $txtSearch = $('#Search input');
	$txtSearch.autocomplete(window.ac, {
		matchContains: true,
		resultsClass: "ac_results",
		scroll: false,
		inputFocus: false,
		hideOnBlur: true,
		noResults: 'no results'
	}).result(function (ev, item) {
		$txtSearch.blur().val('');
		// blank it so we can skip back to the same hash as it currently set
		window.location.hash = '';
		window.location.hash = '#Term_' + item[0];
	});
	
	// Hash all articles by char
	var azHash = {}
	$articles.each(function(){
		var $this = $(this);
		var term = $this.data('term');
		var chr = term.toLowerCase().substr(0, 1);
		
		if(!azHash[chr])
			azHash[chr] = [];
			
		azHash[chr].push($this);
		
		linkReferences($this);
	});
	
	// Hash all articles by tags
	var tagHash = {}
	$articles.each(function(){
		var $this = $(this);
		var term = $this.data('tags');
		
		
		var tags = term.toLowerCase().split(',')
		
		if(tags.length === 0)
			return;
		
		for(var i = 0; i < tags.length; i++){
		if(!tagHash[tags[i]])
			tagHash[tags[i]] = [];
			
			tagHash[tags[i]].push($this);
		}
	});
	
	// Disable a-z buttons with no articles
	$('menu.az button[data-char]').prop('disabled', true);
	for(var chr in azHash) {
		if(!azHash.hasOwnProperty(chr))
			continue;
		
		$('menu.az button[data-char="' + chr + '"]').prop('disabled', false);
	}
	
	// Attach filter click handlers
	$('menu.az button.all').click(function(){
		filterTags(null);
		filterAZ(null);
	});	
	$('article').on('click', 'a', function(){
		filterTags(null);
		filterAZ(null);
	})
	
	// Filter the view
	function filterAZ(chr){
		if(!chr) {
			$articles.removeClass('hidden');				
			return;
		}	
		
		$articles.addClass('hidden');
		
		if(!azHash[chr])
			return;
		
	
		$.each(azHash[chr], function(i, $article){
			$article.removeClass('hidden');
		})
	}
	// Filter the view
	function filterTags(tag){
		if(!tag) {
			$articles.removeClass('hidden');				
			return;
		}	
		tag = tag.toLowerCase();
		$articles.addClass('hidden');
		
		if(!tagHash[tag])
			return;
		
	
		$.each(tagHash[tag], function(i, $article){
			$article.removeClass('hidden');
		})
	}
	
	function linkReferences($article){
		var $desc = $article.find('.desc');
		var desc = $desc.html();
		if(!desc)
			return;
			
		var linked = desc.replace(/`([^`]+)`(['s]*)/g, '<a href="#Term_$1" class="ref">$1$2</a>');
		$desc.html(linked);
	}
	
	$(window).on('hashchange', function() {
		var hash = window.location.hash;
		
		if(!hash)
			return;
		
		if(hash.substr(1, 4) === 'Tag_'){
			filterTags(hash.substr(5))
		} else if(hash.substr(1,3) === 'AZ_'){
			filterAZ(hash.substr(4))
		}
	});
		
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
});
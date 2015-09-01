var handlebars = require('handlebars'),
	YAML = require('yamljs');

module.exports.parse = function(yaml) {
	var data = YAML.parse(yaml);
	
	var preparedData = {};
	var terms = [];
	
	for(var term in data){
		if(!data.hasOwnProperty(term))
			continue;
		
		var subTerms = term.split(',');
		// Handle comma separated multi-terms
		if(subTerms.length > 1){
			for(var i = 1; i < subTerms.length; i++){
				var similie = newItem(subTerms[i]);
				similie.refs.see.push(subTerms[0]);
				terms.push(similie);
			}
		}
				
		var item = newItem(subTerms[0]);		
		
		if(data[term] instanceof Array)
		{
			for(var i = 0; i < data[term].length; i++)
				parseItem(item, data, terms, term, data[term][i])
		}
		else
		{
			parseItem(item, data, terms, term, data[term])
		}
		
		terms.push(item);
	}
	
	for(var i = 0; i < terms.length; i++) {
		terms[i].desc = terms[i].descs.join('\n');
	}
	
	terms.sort(function(a, b){
		return a.term.localeCompare(b.term);
	})
	
	return terms;
};

function newItem(term){
	return {
		descs: [],
		term: term,
		refs: {
			see: [],
			not: []
		}
	};
}

function parseItem(item, data, terms, term, datum){
	// Handle tag arrays
	if(datum instanceof Array) {
		item.tags = datum;
		return;
	}
	
	if(typeof datum == 'object') {
		for(var line in datum){
			if(!datum.hasOwnProperty(line))
				continue;
			
			item.descs.push(line);
			
			if(datum[line] instanceof Array)
				item.types = datum[line];
			else if(typeof datum[line] == 'string')
				item.types = [ datum[line] ];
				
		}
		return;
	}
	
	if(typeof datum == 'string') {

		// If we have a reference
		if(data[datum]) {
			item.refs.see.push(datum)
			return;
		}

		// If we have a disambiguation			
		if(datum.substr(0, 1) == '¬') {
			if(data[datum.substr(1)])
				item.refs.not.push(datum.substr(1))
			
			return;
		}
		
		// Handle desc
		item.descs.push(datum);
	}
}

module.exports.prepare = function(terms){	
	var preparedData = {};
	
	var az = [];
	var tags = [];
	
	for(var i = 0; i < terms.length; i++) {
		var found;
		
		var itemTags = terms[i].tags;
		if(itemTags){
			for(var j = 0; j < itemTags.length; j++){
				found = false;
				for(var k = 0; k < tags.length; k++) {
					if(tags[k] == itemTags[j]){
						found = true;
						break;
					}
				}
				
				if(!found)
					tags.push(itemTags[j]);
			}
		}
		
		var firstLetter = terms[i].term.substr(0, 1);
		found = false;
		for(k = 0; k < az.length; k++) {
			if(az[k] === firstLetter){
				found = true;
				break;
			}
		}
		if(!found)
			az.push(firstLetter);
	}
	
	tags.sort();
	az.sort();
	
	preparedData.tags = tags;
	preparedData.az = az;
	preparedData.terms = terms;
	
	return preparedData;
};

function getAutocompleteJson(data){
	var ac = [];
	for(var i = 0; i < data.terms.length; i++){
		ac.push(data.terms[i].term);
	}
	return JSON.stringify(ac);
}

module.exports.generateHtml = function(source, data){
	var template = handlebars.compile(source);
	data.ac = getAutocompleteJson(data);
	var html = template(data);
	return html;
}
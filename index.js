var handlebars = require('handlebars'),
	fs = require('fs'),
	YAML = require('yamljs');
  
YAML.load(process.argv[2], function(terms) {
	// Sort the input yaml if requested
	if(process.argv[4] == '--sort-yaml')
		sortYaml(process.argv[2], terms)
	
	prepared = prepare(terms)
	
	fs.readFile('gloss.html', 'utf-8', function(error, source){
		var template = handlebars.compile(source);
		var html = template({
			terms: prepared
		});
		
		fs.writeFile(process.argv[3], html);
	});
});

function sortYaml(outFile, terms){
	var sorted = {},
		keys = [];
		
	for(var term in terms){
		if(!terms.hasOwnProperty(term))
			continue;
		keys.push(term);
	}
	
	keys.sort();
	
	for(var i = 0; i < keys.length; i++)
		sorted[keys[i]] = terms[keys[i]];
	
	fs.writeFile(outFile, YAML.stringify(sorted, null, 2));
}

function prepare(data){
	var terms = [];
	
	for(var term in data){
		if(!data.hasOwnProperty(term))
			continue;
		
		var item = {
			term: term,
			refs: {
				see: [],
				not: []
			}
		};
		
		// Full syntax
		if(data[term] instanceof Array)
		{
			var nonTags = [];
			for(var i = 0; i < data[term].length; i++) {
				// Handle tag arrays
				if(data[term][i] instanceof Array) {
					item.tags = data[term][i];
					continue;
				}
				
				// If we have a reference
				if(data[data[term][i]]) {
					item.refs.see.push(data[term][i])
					continue;
				}
				
				if(data[term][i].substr(0, 1) == '¬') {
					
					// If we have a reference
					if(data[data[term][i].substr(1)])
						item.refs.not.push(data[term][i].substr(1))
					
					continue;
				}
				
				// Handle desc
				item.desc = data[term][i];
			}
		}
		else
		{
			var desc = data[term];
			// Handle SeeOthers
			if(data[desc])
				item.refs.see.push(desc);
			else if(desc.substr(0, 1) == '¬' && data[desc.substr(1)])
				item.refs.not.push(desc);
			// Simple definitions
			else
				item.desc = desc;
		}
		
		terms.push(item);
	}
	
	terms.sort(function(a, b){
		return a.term.localeCompare(b.term);
	})
	
	return terms;
}


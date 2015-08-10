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
			term: term
		};
		
		// Full syntax
		if(data[term] instanceof Array)
		{
			// Handle desc
			if(data[term].length > 0)
				item.desc = data[term][0];
			
			// Handle tags
			if(data[term].length > 1)
			{
				// Handle tag arrays
				if(data[term][1] instanceof Array)
					item.tags = data[term][1];
				// Handle single tag
				else if (typeof data[term][1] == 'string')
					item.tags = [data[term][1]];
			}
		}
		else
		{
			var desc = data[term];
			// Handle SeeOthers
			if(data[desc])
				item.other = desc;
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


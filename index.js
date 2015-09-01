var fs = require('fs'),
	YAML = require('yamljs'),
	gloss = require('./lib/gloss');
  
//YAML.load(process.argv[2], function(terms) {
//	// Sort the input yaml if requested
//	if(process.argv[4] == '--sort-yaml')
//		sortYaml(process.argv[2], terms)
//});

fs.readFile(process.argv[2], 'utf-8', function(error, file){
	var parsed = gloss.parse(file);
	var prepared = gloss.prepare(parsed);
	
	fs.readFile('gloss.html', 'utf-8', function(error, source){
		
		var html = gloss.generateHtml(source, prepared);
		
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
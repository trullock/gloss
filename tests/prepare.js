var assert = require("chai").assert;
var gloss = require("../lib/gloss.js");
var YAML = require('yamljs');

function literal(f) {
	return f.toString().
	replace(/^[^\/]+\/\*!?/, '').
	replace(/\*\/[^\/]+$/, '');
}

describe("prepare", function(){

	it('should extract tags', function(){
		var result = gloss.prepare(gloss.parse(literal(function() {/*!
Thing A:
  - Description of Thing A
  - [Tag 1,Tag 2]
Thing B: 
  - Description of Thing B
  - Thing A
  - [Tag 1,Tag 3]
  - ¬Thing C
Thing C:
  - Description of Thing C
  - [Tag 4]
*/})));
		
		assert.equal(result.tags[0], 'Tag 1');
		assert.equal(result.tags[1], 'Tag 2');
		assert.equal(result.tags[2], 'Tag 3');
		assert.equal(result.tags[3], 'Tag 4');
	});
	
	it('should extract a-z', function(){
		var result = gloss.prepare(gloss.parse(literal(function() {/*!
B Thing: Desc B
A Thing: Desc A
C Thing: Desc C
X Thing: Desc X
Y Thing: Desc Y
*/})));
		
		assert.equal(result.az[0], 'A');
		assert.equal(result.az[1], 'B');
		assert.equal(result.az[2], 'C');
		assert.equal(result.az[3], 'X');
		assert.equal(result.az[4], 'Y');
	});
	
	it('terms should be present', function(){
		var parsed = gloss.parse(literal(function() {/*!
B Thing: Desc B
A Thing: Desc A
*/}));
		var result = gloss.prepare(parsed);
		
		assert.equal(result.terms, parsed);
	});
});
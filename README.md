# gloss
Create glossaries, simply.
Supports descriptions, tags, references and disambiguations

# usage:

`node gloss.js <input.yml> <output.html> [--sort-yaml]`

* `input.yml` is your glossary definition as outlined below
* `output.html` is the generated html file
* `--sort-yaml` causes the input yaml file to be sorted into alphabetical order

# definitions

## simple

    Thing: Description of thing

or

    Thing:
      Description of thing

## tags

    Thing:
      - Description of thing
      - [One Tag, Another Tag]

## references

Define "See other" style definitions by simply setting the description to the name of the other term:

    Thing A: 
	  Description of Thing A
    Thing B: 
	  - Description of Thing B
      - Thing A
	  
Reference other terms inside descriptions with backticks
	
    Thing A: 
	  Description of Thing A
    Thing B: 
	  - Description of Thing B, which is similar to `Thing A`
      - Thing A
	
## disambiguations

Define "disambiguation" style definitions by prefixing the term to disambiguate against with the ¬ (not) operator:

    Thing A: Description of Thing A
    Thing B: 
	  - Description of Thing B
      - Thing A
	  - ¬Thing C
	Thing C: Description of Thing C
# gloss
Create glossaries, simply.
Supports descriptions, tags, references and disambiguations

# usage:

`node gloss.js <input.yml> <output.html> [--sort-yaml]`

* `input.yml` is your glossary definition as outlined below
* `output.html` is the generated html file
* `--sort-yaml` causes the input yaml file to be sorted into alphabetical order

# Definitions

## Simple

    Thing: Description of thing

or

    Thing:
      Description of thing

## Tags

    Thing:
      - Description of thing
      - [One Tag, Another Tag]

## References

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
	
## Disambiguations

Define "disambiguation" style definitions by prefixing the term to disambiguate against with the ¬ (not) operator:

    Thing A: Description of Thing A
    Thing B: 
	  - Description of Thing B
      - Thing A
	  - ¬Thing C
	Thing C: Description of Thing C

# Multiple Definitions

You can conveniently create similies by comma separating term names. The first term becomes the primary term that the similies reference.

    Thing A,Also A: Description of Thing A
	
is equivalent to:

    Thing A: Description of Thing A
    Also A: Thing A
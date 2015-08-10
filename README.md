# gloss
Create glossaries, simply

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
      - One Tag

or

    Thing:
      - Description of thing
      - [One Tag, Another Tag]

## references

Define "See other" style definitions by simply setting the description to the name of the other term:

    Thing A: Description of Thing A
    Thing B: Description of Thing B
    Thing C: Thing A

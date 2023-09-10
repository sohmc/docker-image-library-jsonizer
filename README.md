# Docker Image Library jsonizer

[![Docker Official Images JSON Builder](https://github.com/sohmc/docker-image-library-jsonizer/actions/workflows/build.yml/badge.svg)](https://github.com/sohmc/docker-image-library-jsonizer/actions/workflows/build.yml)

Wanting to find a way to programmatically parse [Docker's Official Image Library tag output](https://github.com/docker-library/official-images/tree/master/library), I built this parser to create a json that others can use for their own purposes.

## Schema, generally

The goal for this repo is to make the library easier to parse.  Metadata is stored as properties in the main object, with some json-friendly changes to make things easier to navigate.

- Maintainers are stored in an array, even if there is only one.
- Version objects (typically starting with `Tags` and ending with a newline) are pushed into an array under the property `tags` (lowercase)
  - Tags and Architecture are stored in an array, even if there is only one.
- All property names have their case preserved
- Comments (lines that start with `#`) are ignored **except when it's explicitly parsed**, which is the case for files that are automatically generated (e.g. php, mysql, etc).

## License

As this parser simply "reformats" files that exist in the [docker-library/official-images](https://github.com/docker-library/official-images/) repository, the resulting JSON files that are generated in "Releases" are released via [Apache License 2.0](https://github.com/docker-library/official-images/blob/master/LICENSE).

All code to create the JSON file is released via [AGPLv3](https://choosealicense.com/licenses/agpl-3.0).

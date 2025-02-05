# Docker Image Library jsonizer

[![Check Commit SHA](https://github.com/sohmc/docker-image-library-jsonizer/actions/workflows/check-sha.yml/badge.svg)](https://github.com/sohmc/docker-image-library-jsonizer/actions/workflows/check-sha.yml)

Wanting to find a way to programmatically parse [Docker's Official Image Library tag output](https://github.com/docker-library/official-images/tree/master/library), I built this parser to create a json that others can use for their own purposes.

## Schema, generally

The goal for this repo is to make the library easier to parse.  Metadata is stored as properties in the main object, with some json-friendly changes to make things easier to navigate.

- Maintainers are stored in an array, even if there is only one.
- Version objects (typically starting with `Tags` and ending with a newline) are pushed into an array under the property `tags` (lowercase)
  - Tags and Architecture are stored in an array, even if there is only one.
- All property names have their case preserved
- Comments (lines that start with `#`) are ignored **except when it's explicitly parsed**, which is the case for files that are automatically generated (e.g. php, mysql, etc).

## How to use the json files

My goal in creating this repository is to make it easier for me to build [php docker images](https://github.com/sohmc/php-mysqli/).  As a result, the best example of using the releases of this repository can be found [in that repo's workflow](https://github.com/sohmc/php-mysqli/blob/6982c4fb75e80c0908a68215d02123fa5f7919f8/.github/workflows/check-sha.yml#L35).

Relevant bits:

```yaml
- name: Get latest commit SHA
  id: get-latest-sha
  run: |
    curl -kL -o php.json https://github.com/sohmc/docker-image-library-jsonizer/releases/latest/download/php
    GitCommit=$(jq -cr '.tags[0].GitCommit' php.json)
    echo GitCommit: ${GitCommit}
    echo "GitCommit=$GitCommit" >> $GITHUB_OUTPUT
```

Using the URL referenced above, you get the latest release without having to fuss with the commit SHA.  If you want a specific commit version of the JSON file, prepend `v-` to the full SHA.

## License

As this parser simply "reformats" files that exist in the [docker-library/official-images](https://github.com/docker-library/official-images/) repository, the resulting JSON files that are generated in "Releases" are released via [Apache License 2.0](https://github.com/docker-library/official-images/blob/master/LICENSE).

All code to create the JSON file is released via [AGPLv3](https://choosealicense.com/licenses/agpl-3.0).

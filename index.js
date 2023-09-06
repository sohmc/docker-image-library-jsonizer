const fs = require('fs');

// Function and line-by-line parser copied from mdn web docs:
// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#processing_a_text_file_line_by_line
async function* makeTextFileLineIterator(fileURL) {
  const utf8Decoder = new TextDecoder('utf-8');
  const response = await fetch(fileURL);
  const reader = response.body.getReader();
  let { value: chunk, done: readerDone } = await reader.read();
  chunk = chunk ? utf8Decoder.decode(chunk) : '';

  const newline = /\r?\n/gm;
  let startIndex = 0;

  while (true) {
    const result = newline.exec(chunk);
    if (!result) {
      if (readerDone) break;
      const remainder = chunk.substr(startIndex);
      ({ value: chunk, done: readerDone } = await reader.read());
      chunk = remainder + (chunk ? utf8Decoder.decode(chunk) : '');
      startIndex = newline.lastIndex = 0;
      continue;
    }
    yield chunk.substring(startIndex, result.index);
    startIndex = newline.lastIndex;
  }

  if (startIndex < chunk.length) {
    // Last line didn't end in a newline char
    yield chunk.substr(startIndex);
  }
}

async function run(urlOfFile) {
  const parserStatus = {
    'node': 'root',
  };

  const versionsJson = {
    'name': urlOfFile.match(/\w+$/)[0],
    'Maintainers': [],
    'GitRepo': 'https://github.com/docker-library',
    'tags': [],
    'sourceUrl': 'https://github.com/docker-library',
  };

  const tagObject = {
    'Tags': [],
    'Architectures': [],
    'GitCommit': '',
  };

  for await (const line of makeTextFileLineIterator(urlOfFile)) {
    // skip blank lines
    if (/^$/.test(line)) {
      switch (parserStatus.node) {
      case 'tags':
        versionsJson.tags.push(tagObject);
        break;

      default:
        continue;
      }
    } else if (/^# this file is generated via/.test(line)) {
      console.log('Beginning of file found.');
      versionsJson.sourceUrl = line.match(/https.*$/)[0];
    } else if (/^Maintainers:/.test(line)) {
      console.log('Working on Maintainers');
      const maintainer = line.replace(/^Maintainers: (.*),?/, '$1').replace(/,/, '').trim();

      versionsJson.Maintainers = Array(maintainer);
      parserStatus.node = 'maintainers';
    } else if (/^Tags:/.test(line)) {
      tagObject.Tags = line.replace(/^Tags: (.*)$/, '$1').trim().split(', ');
      parserStatus.node = 'tags';
    } else if (/^Architectures:/.test(line)) {
      tagObject.Architectures = line.replace(/^Architectures: (.*)$/, '$1').trim().split(', ');
    } else if (/^\s+\w+/.test(line)) {
      // If there are spaces before the next line of test, it's a continuation of the previous line.
      switch (parserStatus.node) {
      case 'maintainers': {
        const maintainer = line.trim().replace(/,/, '');
        versionsJson.maintainers.push(maintainer);
        break;
      }

      default:
        break;
      }
    } else {
      // If all parsers fail, do a generic map
      const newMap = line.trim().split(': ');
      if (parserStatus.node == 'tags') {
        tagObject[newMap[0].trim()] = newMap[1].trim();
      } else {
        versionsJson[newMap[0].trim()] = newMap[1].trim();
      }
    }
  }
  return versionsJson;
}

const url = process.env.URL;

if (/^https:\/\/raw\.githubusercontent\.com\/docker-library\/official-images\//.test(url)) {
  run(url).then((versionsJson) => {
    console.log(JSON.stringify(versionsJson, null, 2));
    fs.writeFileSync('output.json', JSON.stringify(versionsJson, null, 2));
  });
} else {
  console.error('URL not provided or invalid.');
}
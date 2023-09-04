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

  const versionsJson = {};
  const tagObject = {
    'tags': [],
    'architectures': [],
    'gitCommit': '',
  };

  for await (const line of makeTextFileLineIterator(urlOfFile)) {
    // skip blank lines
    if (/^\n/.test(line)) continue;

    if (/^# this file is generated via/.test(line)) {
      console.log('Beginning of file found.');
      versionsJson.sourceUrl = line.match(/https.*$/)[0];
    }

    if (/^Maintainers:/.test(line)) {
      console.log('Working on Maintainers');
      const maintainer = line.replace(/^Maintainers: (.*),?/, '$1').replace(/,/, '').trim();

      versionsJson.maintainers = Array(maintainer);
      parserStatus.node = 'maintainers';
    }

    if (/^GitRepo: /.test(line)) {
      console.log('Got GitRepo');
      versionsJson.gitRepo = line.replace(/^GitRepo: (.*)$/, '$1').trim();
    }

    if (/^Tags:/.test(line)) {
      tagObject.tags = line.replace(/^Tags: (.*)$/, '$1').trim().split(', ');
    }

    if (/^Architectures:/.test(line)) {
      tagObject.architectures = line.replace(/^Architectures: (.*)$/, '$1').trim().split(', ');
    }

    if (/^GitCommit:/.test(line)) {
      tagObject.gitCommit = line.replace(/^GitCommit: (.*)$/, '$1').trim();
    }

    if (/^Directory:/.test(line)) {
      const directory = line.replace(/^Directory: (.*)$/, '$1').trim().split(', ');
      versionsJson[directory] = tagObject;
    }

    // If there are spaces before the next line of test, it's a continuation of the previous line.
    if (/^\s+\w+/.test(line)) {
      switch (parserStatus.node) {
      case 'maintainers': {
        const maintainer = line.trim().replace(/,/, '');
        versionsJson.maintainers.push(maintainer);
        break;
      }

      default:
        break;
      }
    }
  }
  return versionsJson;
}

const url = run(process.env.URL);

if (/^https:\/\/raw\.githubusercontent\.com\/docker-library\/official-images\//.test(url)) {
  run(url).then((versionsJson) => {
    console.log(JSON.stringify(versionsJson, null, 2));
    fs.writeFileSync('output.json', JSON.stringify(versionsJson, null, 2));
  });
} else {
  console.error('URL not provided or invalid.');
}
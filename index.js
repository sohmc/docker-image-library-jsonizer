async function* makeTextFileLineIterator(fileURL) {
  const utf8Decoder = new TextDecoder('utf-8');
  const response = await fetch(fileURL);
  const reader = response.body.getReader();
  let { value: chunk, done: readerDone } = await reader.read();
  chunk = chunk ? utf8Decoder.decode(chunk) : '';

  const newline = /\r?\n/gm;
  let startIndex = 0;
  let result;

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

  const phpVersionsJson = {};

  for await (const line of makeTextFileLineIterator(urlOfFile)) {
    // skip blank lines
    if (/^\n/.test(line)) continue;

    if (/^# this file is generated via/.test(line)) {
      console.log('Beginning of file found.');
      phpVersionsJson.sourceUrl = line.match(/https.*$/)[0];
    }

    if (/^Maintainers:/.test(line)) {
      console.log('Working on Maintainers');
      const maintainer = line.replace(/^Maintainers: (.*),?/, '$1').replace(/,/, '');

      phpVersionsJson.maintainers = Array(maintainer);
      parserStatus.node = 'maintainers';
    }

    if (/^GitRepo: /.test(line)) {
      console.log('Got GitRepo');
      phpVersionsJson.gitRepo = line.replace(/^GitRepo: (.*)$/, '$1').trim();
    }

    // If there are spaces before the next line of test, it's a continuation of the previous line.
    if (/^\s+\w+/.test(line)) {
      switch (parserStatus.node) {
      case 'maintainers':
        const maintainer = line.trim().replace(/,/, '');
        phpVersionsJson.maintainers.push(maintainer);
        break;

      default:
        break;
      }
    }
  }

  console.log(JSON.stringify(phpVersionsJson));
}

run('https://raw.githubusercontent.com/docker-library/official-images/master/library/php');
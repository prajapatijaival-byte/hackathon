const fs = require('fs');

function convertJsonToHtml(node) {
  if (typeof node === 'string') {
    return node;
  }
  
  if (!node.tagName) {
    return '';
  }

  const { tagName, attributes, children } = node;
  let attrsStr = '';
  
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      attrsStr += ` ${key}="${value}"`;
    }
  }

  const selfClosing = ['meta', 'link', 'img', 'input', 'hr', 'br', 'source'];
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrsStr} />`;
  }

  let childrenStr = '';
  if (children && Array.isArray(children)) {
    childrenStr = children.map(convertJsonToHtml).join('');
  }

  return `<${tagName}${attrsStr}>${childrenStr}</${tagName}>`;
}

function processFile(filename, outFilename) {
  const content = fs.readFileSync(filename, 'utf-8');
  try {
    const json = JSON.parse(content);
    const html = convertJsonToHtml(json);
    fs.writeFileSync(outFilename, `<!DOCTYPE html>\n${html}`);
    console.log(`Converted ${filename} to ${outFilename}`);
  } catch (e) {
    console.error(`Error processing ${filename}:`, e.message);
  }
}

processFile('login.jsx', 'login.html');
processFile('citizenreport.jsx', 'citizenreport.html');

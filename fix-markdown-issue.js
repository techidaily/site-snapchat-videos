/**
 * 修复 .markdown 文件中的问题
 * 
 * 1. 修复前3行的包含这样的内容的行：`title: | `, 去掉 `|` 这样的字符
 */

const fs = require('fs');
const path = require('path');

/**
 * 获得指定目录下所有的 .md 文件
 * @param {*} dir 
 * @param {*} fileList 
 * @returns 
 */
function getMarkdownFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
  
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
  
      if (stat.isDirectory()) {
        getMarkdownFiles(filePath, fileList);
      } else if (path.extname(file) === '.md') {
        fileList.push(filePath);
      }
    });
  
    return fileList;
  }

/**
 * 修复指定的 markdown 文件
 * @param {*} markdownFile 
 */

function fixMarkdownFile(markdownFile) {
    const content = fs.readFileSync(markdownFile, 'utf-8');
    const lines = content.split('\n');
    let newContent = '';
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (i < 3 && line.includes('title: | ')) {
            line = line.replace('title: | ', 'title: ');
        }
        newContent += line + '\n';
    }
    fs.writeFileSync(markdownFile, newContent, 'utf-8');
}

const markdownFiles = getMarkdownFiles(path.join(__dirname, 'source/_posts'));
markdownFiles.forEach(markdownFile => {
    fixMarkdownFile(markdownFile);
});

console.log('Fix markdown issue done!');
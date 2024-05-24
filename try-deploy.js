

const fs = require('node:fs');
const path = require('node:path');
const { Buffer } = require('node:buffer');
const { execSync, spawnSync } = require('child_process');

const maxTryTimes = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBufferOrStringContent(content) {
  if (Buffer.isBuffer(content)) {
    return content.toString();
  }

  if (typeof content === 'string') {
    return content;
  }

  return '';
}


function tryCheckPushToGitHubSuccess(outOrError, refPushInfo, keyWords = 'HEAD -> gh-pages') {
  let foundType = false;

  if (outOrError instanceof Error) {
    console.log(`outOrError is Error`);
    foundType = true;
    try {
      console.error(outOrError);
      if (outOrError.message.indexOf(keyWords) > -1) {
        refPushInfo.hasPushSuccess = true;
      }
      return;
    } catch (err) { }
  }

  if (typeof outOrError === 'string' || Buffer.isBuffer(outOrError)) {
    console.log(`outOrError is String or Buffer`);
    foundType = true;

    const fmtContent = getBufferOrStringContent(outOrError).trim();
    console.log(`fmtContent: \n${fmtContent}\n>>>>>>>>\n`);
    console.log(`outOrError: \n${JSON.stringify({ fmtContent})}`);
    if (fmtContent.indexOf(keyWords) > -1 || fmtContent === 'Everything up-to-date'){
      refPushInfo.hasPushSuccess = true;
    }
    return;
  }

  try {
    const out = outOrError.output;
    if (out) {
      console.log(`outOrError has output`);
      foundType = true;

      const contentList = out.map(v => getBufferOrStringContent(v));
      // 循环打印出每个buffer的内容
      contentList.forEach((v, index) => {
        console.log(`contentList[${index}]: [${JSON.stringify(v)}]`);
      });

      const criticalErrors = [
        `fatal: 无法访问 'https://github.com/`,
        `spawnSync /bin/sh ENOBUFS`,
        `fatal: 远端意外挂断了`,
      ];

      const foundKeyword = contentList.some(v => v.indexOf(keyWords) > -1);
      const foundEverythingUpToDate = contentList.some(v => v === 'Everything up-to-date\n');
      const foundCriticalError = contentList.some(v => criticalErrors.some(ce => v.indexOf(ce) > -1));

      console.log(`foundKeyword: ${foundKeyword}, foundEverythingUpToDate: ${foundEverythingUpToDate}, foundCriticalError: ${foundCriticalError}`)

      if ((foundKeyword || foundEverythingUpToDate) && !foundCriticalError) {
        refPushInfo.hasPushSuccess = true;
        return;
      }
    }
  }catch (e){}

  try {
    const out = outOrError.stdout;
    if (out) {
      console.log(`outOrError has stdout`);
      foundType = true;

      const content = getBufferOrStringContent(out);
      if (content.indexOf(keyWords) > -1) { 
        refPushInfo.hasPushSuccess = true;
        return;
      }
    }
  }catch (e){}
  try {
    const out = outOrError.stderr;
    if (out) {
      console.log(`outOrError has stderr`);
      foundType = true;

      const content = getBufferOrStringContent(out);
      if (content.indexOf(keyWords) > -1) { 
        refPushInfo.hasPushSuccess = true;
        return;
      }
    }

  }catch (e){}

  if (!foundType) {
    console.log(`warning: 未找到outOrError的类型: ${typeof outOrError}`);
  }
}

function tryDeploy(env = {}) {
  console.log('Deploying...');

  const deployDir = path.join(__dirname, '.deploy_git');
  if (!fs.existsSync(deployDir)) return;

  let gitShortRepoName = path.basename(__dirname);
  if (gitShortRepoName === 'site-techidaily') {
    gitShortRepoName = 'site';
  }

  const gitUrl =  `git@github.com:techidaily/${gitShortRepoName}.git`;

  const command = `git push -u ${gitUrl} HEAD:gh-pages --force`;
  console.log(`命令: ${command}`);
  const refPushInfo = { hasPushSuccess: false };

  try {
    const out = spawnSync('git', [
      'push', '-u', `${gitUrl}`,
      'HEAD:gh-pages', '--force'
    ], { cwd: deployDir, maxBuffer: 100 * 1024 * 1024, env: { ...process.env, ...env } });

    tryCheckPushToGitHubSuccess(out, refPushInfo);
  } catch (e) {
    console.error(e)
    tryCheckPushToGitHubSuccess(e, refPushInfo);
  }

  if (!refPushInfo.hasPushSuccess) {
    throw new Error('Push to GitHub failed');
  }
}

let deploySuccess = false;

(async () => {
  const proxyAddress = 'http://192.168.3.16:7890';
  for (let i = 0; i < maxTryTimes; i++) {
    console.log(`尝试部署，剩余尝试次数: ${maxTryTimes - i}`);
    const env = { HTTPS_PROXY: proxyAddress, HTTP_PROXY: proxyAddress }
    try {
      tryDeploy(env);
      console.log('部署成功');
      deploySuccess = true;
      i = maxTryTimes;
      require(path.join(__dirname, 'create-last-publish-date.js'));
      break;
    } catch (e) {
      console.error(e);
    }
    await sleep(5 * 1000);
  }
})();

module.exports = deploySuccess;


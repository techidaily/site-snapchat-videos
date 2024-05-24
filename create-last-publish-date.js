

const fs = require('node:fs');
const path = require('node:path');

class LastPublishChecker {
  constructor() {
    this.lastPublishDate = null;
    this.lastPublishDateFile = path.join(__dirname, '.last-publish-date');
  }
  getLastPublishDate() {
    if (fs.existsSync(this.lastPublishDateFile)) {
      const content = fs.readFileSync(this.lastPublishDateFile, 'utf-8');
      this.lastPublishDate = new Date(content);
    }

    return this.lastPublishDate;
  }
  saveLastPublishDate() {
    const now = new Date();
    fs.writeFileSync(this.lastPublishDateFile, now.toISOString());
    this.lastPublishDate = now;
  }
  findLastPublishDateFileIsExist() {
    return fs.existsSync(this.lastPublishDateFile);
  }
}

const gPublishHelper = new LastPublishChecker();
gPublishHelper.saveLastPublishDate();
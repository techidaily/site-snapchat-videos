/**
 *
 * 读取给定目录下，所有子孙目录，子孙文件，获得所有文件的路径
 * 生成 preload 资源
 * 注意，需要根据 rules，生成 preload 资源
 * preload 资源，需要按照以下顺序，字体文件优先
 * 1. 字体文件
 * 2. 其他文件
 * 
 * preload 的资源不是越多越好，需要根据页面的实际情况，来决定加载哪些资源
 */

const fs = require("fs")
const path = require("path")

function readDirSync(dir, filesList = []) {
  const files = fs.readdirSync(dir)
  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      readDirSync(filePath, filesList)
    } else {
      filesList.push(filePath)
    }
  })
  return filesList
}

const rootDir = path.join(__dirname, "themes/redefine/source")

const filesList = readDirSync(rootDir);

// 过滤掉非js，css，json，字体文件
const filterFiles = filesList.filter((file) => {
  const ext = path.extname(file)
  return [".js", ".css", ".json", ".ttf", ".woff", ".woff2"].includes(ext)
}).map((file) => {
    // "\\" -> "/"
  return path.normalize(file.replace(rootDir, "")).replace(/\\/g, "/")
}).sort((a, b) => {
    // 根据文件大小排序，越小的文件越优先
    const sizeA = fs.statSync(path.join(rootDir, a)).size
    const sizeB = fs.statSync(path.join(rootDir, b)).size
    return sizeA - sizeB
})

// 输出文件路径
console.log(filterFiles)

const rules = {
    "theme.navbar.search.enable": [
        "/js/tools/localSearch.js",
    ],
    "theme.articles.code_block.copy": [
        "/js/tools/copy.js",
    ],
    "theme.articles.lazyload": [
        "/js/layouts/lazyload.js",
    ],
    "theme.footer.runtime": [
        "/js/tools/runtime.js",
        "/js/libs/odometer.min.js",
        "/assets/odometer-theme-minimal.css"
    ],
    "theme.home_banner.subtitle.length !== 0": [
        "/js/libs/Typed.min.js",
        "/js/plugins/typed.js",
    ],
    "theme.plugins.mermaid.enable": [
        "/js/libs/mermaid.min.js",
        "/js/plugins/mermaid.js",
    ],
    "theme.masonry || theme.photos || theme.gallery": [
        "/js/libs/minimasonry.min.js",
        "/js/plugins/masonry.js",
    ],
    "theme.articles.toc.enable": [
        "/js/tools/tocToggle.js",
        "/js/layouts/toc.js",
        "/js/plugins/tabs.js"
    ],
    "!theme.global.preloader": [
        "/js/libs/anime.min.js",
    ],
}

// 得到哪些文件需要使用 rules
const preloadFilesByRules = Object.keys(rules).reduce((acc, key) => {
    if (rules[key].length > 0) {
        acc.push(...rules[key])
    }
    return acc
}, [])


// 打印出需要使用 rules 的文件
console.log(preloadFilesByRules)

// 得到哪些文件不需要使用 rules, 排除 .css 文件, 同时需要排序，字体文件优先
const preloadFilesNotByRules = filterFiles.filter((file) => !preloadFilesByRules.includes(file)).filter((file) => {
    const ext = path.extname(file)
    return ![".css"].includes(ext)
}).sort((a, b) => {
    const extA = path.extname(a)
    const extB = path.extname(b)
    if ([".ttf", ".woff", ".woff2"].includes(extA) && ![".ttf", ".woff", ".woff2"].includes(extB)) {
        return -1
    }
    if (![".ttf", ".woff", ".woff2"].includes(extA) && [".ttf", ".woff", ".woff2"].includes(extB)) {
        return 1
    }
    return 0
})

// 只得到字体文件
const preloadFilesFont = filterFiles.filter((file) => {
    const ext = path.extname(file)
    return [".ttf", ".woff", ".woff2"].includes(ext)
})

// 需要使用 rules 的文件展现的形式，看起来像以下内容
// <% if (theme.navbar.search.enable) { %>
//    <link rel="preload" href="/js/tools/localSearch.js" as="script">
// <% } %>
// 那么，以此类推，定义一个 ejs 模板，根据上面的规则 rules，生成 preload 资源

const space = " ".repeat(4)

const genLinkLineByFile = (file) => {
    const cdnPrefix = "https://cloudflare-cdn.techidaily.com"
    const ext = path.extname(file)
    const uri = `${cdnPrefix}${file}`
    if ([".css"].includes(ext)) {
        return `${space}<link rel="preload" as="style" href="${uri}" crossorigin>`
    }
    if ([".ttf", ".woff", ".woff2"].includes(ext)) {
        return `${space}<link rel="preload" href="${uri}" as="font" crossorigin type="font/${ext.replace('.', '')}">`
    }
    return `${space}<link rel="preload" as="script" href="${uri}" fetchpriority="low" crossorigin>`
}

const ejsTemplateWithRules = `
<% if (theme.navbar.search.enable) { %>
${preloadFilesByRules.filter((file) => rules["theme.navbar.search.enable"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.articles.code_block.copy) { %>
${preloadFilesByRules.filter((file) => rules["theme.articles.code_block.copy"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.articles.lazyload) { %>
${preloadFilesByRules.filter((file) => rules["theme.articles.lazyload"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.footer.runtime) { %>
${preloadFilesByRules.filter((file) => rules["theme.footer.runtime"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.home_banner.subtitle.length !== 0) { %>
${preloadFilesByRules.filter((file) => rules["theme.home_banner.subtitle.length !== 0"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.plugins.mermaid.enable) { %>
${preloadFilesByRules.filter((file) => rules["theme.plugins.mermaid.enable"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.masonry || theme.photos || theme.gallery) { %>
${preloadFilesByRules.filter((file) => rules["theme.masonry || theme.photos || theme.gallery"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (theme.articles.toc.enable) { %>
${preloadFilesByRules.filter((file) => rules["theme.articles.toc.enable"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

<% if (!theme.global.preloader) { %>
${preloadFilesByRules.filter((file) => rules["!theme.global.preloader"].includes(file)).map((file) => {
    return `${genLinkLineByFile(file)}`
}).join("\n")}
<% } %>

`

// ejs 模板, 根据上面的规则 rules，生成 preload 资源
const ejsTemplateContent = `
    <!-- icon set -->
    <link rel="preload" href="<%= url_for(theme.defaults.favicon) %>" as="shortcut icon">
    <link rel="preload" href="<%= url_for(theme.defaults.favicon) %>" as="icon">
    <link rel="preload" href="<%= url_for(theme.defaults.favicon) %>" as="apple-touch-icon">

    <!-- fonts/js/css preload -->
${preloadFilesNotByRules
    .map(
    (file) => {
        return `${genLinkLineByFile(file)}`
    }
    )
    .join("\n")}



    <!-- js/css preload by rules -->
${ejsTemplateWithRules}
`


const onlyFontEjsTemplateContent = `
    <!-- fonts preload -->
${preloadFilesFont
    .map(
    (file) => {
        return `${genLinkLineByFile(file)}`
    }
    )
    .join("\n")}
`

fs.writeFileSync(path.join(__dirname, "themes/redefine/layout/_partials/preload-scripts.ejs"), onlyFontEjsTemplateContent)
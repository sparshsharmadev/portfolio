const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const TurndownService = require('turndown');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

const blogDir = path.join(__dirname, '..');
const exportDir = __dirname;

const files = [
  'building-ai-routing-engine.html',
  'building-transformers-from-scratch.html',
  'sgp4-satellite-tracking-web.html'
];

files.forEach(file => {
  const htmlPath = path.join(blogDir, file);
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const dom = new JSDOM(html);
    
    // Most semantic blogs use <article> or <main>.
    // Let's grab the content inside <article> if it exists, else <main>, else body.
    let contentNode = dom.window.document.querySelector('article') || 
                      dom.window.document.querySelector('main') || 
                      dom.window.document.querySelector('body');
    
    // Remove unwanted elements like scripts, styles, toolbars, navs
    const unwantedSelectors = ['script', 'style', 'nav', 'header.nav', 'footer', '.case-toolbar', '.preloader', '.cur', '.noise', '.scroll-bar'];
    unwantedSelectors.forEach(sel => {
      contentNode.querySelectorAll(sel).forEach(el => el.remove());
    });
    
    let markdown = turndownService.turndown(contentNode.innerHTML);
    
    // Also extract title for the frontmatter
    const title = dom.window.document.title || file;
    const metaDesc = dom.window.document.querySelector('meta[name="description"]');
    const desc = metaDesc ? metaDesc.getAttribute('content') : '';
    
    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${desc.replace(/"/g, '\\"')}"
---

`;
    
    const mdName = file.replace('.html', '.md');
    fs.writeFileSync(path.join(exportDir, mdName), frontmatter + markdown);
    console.log(`Converted ${file} to ${mdName}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});


// ==UserScript==
// @name         History Tree Nav
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  为网站添加目录树导航功能
// @author       yucheng
// @match        *://*/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  // 添加样式
  GM_addStyle(`
        .tree-nav-container {
            position: fixed;
            left: -250px;
            top: 0;
            width: 250px;
            height: 100vh;
            background: #f6f8fa;
            border-right: 1px solid #e1e4e8;
            // overflow-y: auto;
            padding: 40px 0 15px;
            transition: left 0.3s ease;
            z-index:999999
            font-size: 16px;
        }
        .tree-nav-container.active {
            left: 0;
        }
        .tree-nav-container button{
          poasition: absolute;
          top: 50%;
          font-size: 16px;
        }
        .tree-nav-container a{
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-decoration: none;
          color: #24292e;
          display: block;
          padding: 5px;
          font-size: 14px;
        }
        .tree-nav-toggle {
            position:absolute;
            right: -60px;
            top: 100px;
            width: 100px;
            background: #0366d6!important;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
            transition: left 0.3s ease;
            z-index:999999;
            transform: rotate(-90deg);

        }
        .tree-nav-toggle.active {
          left: 10px;
          top: 10px;
          transform: rotate(0deg);
        }
        .tree-nav-toggle.inactive {
        }
        .tree-nav-item {
            padding: 3px 0;
            cursor: pointer;
        }
        .tree-nav-item:hover {
            color: #0366d6;
        }
        .tree-nav-folder {
            font-weight: bold;
            margin-left: 10px;
        }
        .tree-nav-file {
            margin-left: 25px;
        }
        body.tree-nav-active {
            transition: margin-left 0.3s ease;
        }
    `);
  // 创建目录树容器
  const container = document.createElement('div');
  container.className = 'tree-nav-container';
  document.documentElement.appendChild(container);

  const contentBox = document.createElement('div')
  contentBox.className = 'tree-nav-content';
  container.appendChild(contentBox);

  // 创建切换按钮
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'tree-nav-toggle';
  toggleBtn.textContent = '历史记录';
  container.appendChild(toggleBtn);

  function setFixedNewParent() {
    const fixedBoxs = []
    function getFixedBoxs(node) {
      if (node.nodeType === 1) {
        let flag = true
        if (getComputedStyle(node).position === 'fixed') {
          flag = false
          const nodeRect = node.getBoundingClientRect()
          const nodeParentRect = node.parentNode.getBoundingClientRect()
          // fixed元素在父元素内，不处理，在父元素外，提取到 body 外面
          if (nodeRect.top >= nodeParentRect.top || nodeRect.left >= nodeParentRect.left || nodeRect.bottom <= nodeParentRect.bottom || nodeRect.right <= nodeParentRect.right) { } else {
            fixedBoxs.push(node)
          }
        }
        if (flag) {
          const childs = [...node.children]
          childs.forEach(child => {
            getFixedBoxs(child)
          })
        }
        flag = true
      }
    }

    getFixedBoxs(document.body)
    fixedBoxs.forEach(fixedBox => {
      document.documentElement.appendChild(fixedBox)
    })
  }

  setFixedNewParent()

  // 切换状态
  let isActive = false;
  toggleBtn.addEventListener('click', () => {

    isActive = !isActive;
    container.classList.toggle('active', isActive);
    toggleBtn.classList.toggle('active', isActive);
    document.body.classList.toggle('tree-nav-active', isActive);
    if (isActive) {
      // 应用缩放变换
      document.body.style.transform = `scale(${getTransform()})`;
      document.body.style.transformOrigin = 'top right';
    } else {
      document.body.style.transform = 'unset'
    }
  });


  function getTransform() {
    // 获取页面当前宽度
    const originalWidth = document.documentElement.clientWidth;

    // 计算新宽度和缩放比例
    const reducedWidth = originalWidth - 250;
    return reducedWidth / originalWidth;
  }

  // 创建一个 History 实例
  const history = window.history;

  // 保存原始的 pushState 方法
  const originalPushState = history.pushState;

  // 重写 pushState 方法来触发自定义事件
  history.pushState = function () {
    const result = originalPushState.apply(this, arguments);
    window.dispatchEvent(new Event('urlChanged'));
    return result;
  };

  const SECTION_KEY = new URL(location).host
  const maxLen = 20
  let section = JSON.parse(localStorage.getItem(SECTION_KEY) || JSON.stringify([{ url: decodeURIComponent(window.location.href), title: document.title }]))

  contentBox.innerHTML = renderNode(section)

  window.postMessage('new-page-open')

  window.addEventListener('message', function (event) {
    if (event.data === 'new-page-open') {
      window.dispatchEvent(new Event('urlChanged'));
    }
  });

  // 为自定义的 'urlChanged' 事件添加监听器
  window.addEventListener('urlChanged', function () {
    // 相同的url只保留一份
    const findItemIndex = section.findIndex(it => it.url === decodeURIComponent(location.href))
    if (findItemIndex > -1) {
      section.splice(findItemIndex, 1)
    }
    const sectionLen = section.length
    if (sectionLen > maxLen) {
      section.pop()
    }
    section.unshift({ url: decodeURIComponent(location.href), title: document.title })
    localStorage.setItem(SECTION_KEY, JSON.stringify(section))

    contentBox.innerHTML = renderNode(section)
  });

  // list是一个数组，数组中包含历史记录
  function renderNode(list) {
    let html = ''
    list.forEach(item => {
      html += `<a href = "${item.url}" title="${item.title}"> ${item.title}</a> `
    });
    return html
  }
})();

// ==UserScript==
// @name         AI Chat Navigator
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  一键为 Gemini、ChatGPT、DeepSeek、豆包、元宝、Kimi 等 12 大 AI 平台添加侧边栏导航，支持定位历史问题、毛玻璃特效与平滑跳转，提升长对话效率。
// @author       You & Gemini
// @match        https://gemini.google.com/*
// @match        https://chatgpt.com/*
// @match        https://chat.deepseek.com/*
// @match        https://*.doubao.com/*
// @match        https://yuanbao.tencent.com/*
// @match        https://*.qianwen.com/*
// @match        https://*.kimi.com/*
// @match        https://yiyan.baidu.com/*
// @match        https://chatglm.cn/*
// @match        https://metaso.cn/*
// @match        https://*.minimaxi.com/*
// @match        https://*.perplexity.ai/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- 1. 样式定义 (通用) ---
    const CUSTOM_STYLES = `
        /* --- 悬浮球 --- */
        .gemini-floating-tab {
          position: fixed;
          top: 50%;
          right: 24px;
          transform: translateY(-50%);
          background: #EA6B88;
          width: 48px;
          height: 48px;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(66, 133, 244, 0.35);
          cursor: pointer;
          z-index: 9999;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
        }
        .gemini-floating-tab:hover {
          transform: translateY(-50%) scale(1.1) rotate(5deg);
          box-shadow: 0 8px 32px rgba(66, 133, 244, 0.5);
        }
        .gemini-floating-tab svg {
          width: 24px;
          height: 24px;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
        }
        .gemini-floating-tab.hidden {
          opacity: 0;
          pointer-events: none;
          transform: translateY(-50%) scale(0.8);
        }

        /* --- 侧边栏容器 --- */
        .gemini-nav-sidebar {
          position: fixed;
          top: 50%;
          right: 24px;
          transform: translateY(-50%);
          width: 280px;
          max-height: 60vh;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          font-family: 'Google Sans', Roboto, -apple-system, sans-serif;
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding-top: 16px;
        }
        .gemini-nav-sidebar.show {
          opacity: 1;
          pointer-events: all;
          transform: translateY(-50%) translateX(0);
        }
        .gemini-nav-sidebar.collapsed {
          opacity: 0;
          pointer-events: none;
          transform: translateY(-50%) translateX(20px);
        }

        /* --- 顶部功能区 --- */
        .top-bar {
          padding: 0 16px 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          flex-shrink: 0;
        }
        .search-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-wrapper input {
          width: 100%;
          padding: 8px 12px 8px 32px;
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid transparent;
          border-radius: 12px;
          font-size: 13px;
          color: #1f1f1f;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .search-wrapper input:focus {
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .search-wrapper input::placeholder { color: #8e918f; }
        .search-icon {
          position: absolute;
          left: 10px;
          width: 14px;
          height: 14px;
          border: 2px solid #8e918f;
          border-radius: 50%;
          box-sizing: border-box;
          opacity: 0.6;
          pointer-events: none;
        }
        .search-icon::after {
          content: '';
          position: absolute;
          top: 9px;
          left: 9px;
          width: 4px;
          height: 2px;
          background: #8e918f;
          transform: rotate(45deg);
        }
        .refresh-btn {
          width: 34px;
          height: 34px;
          border: none;
          background: transparent;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5f6368;
          transition: all 0.2s;
        }
        .refresh-btn:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #1f1f1f;
        }
        .refresh-btn svg { width: 18px; height: 18px; }

        /* --- 消息列表区 --- */
        .message-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 8px 16px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 12px, black 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12px, black 100%);
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.1) transparent;
        }
        .message-list::-webkit-scrollbar { width: 4px; }
        .message-list::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }

        /* --- 消息项 --- */
        .message-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          padding: 8px 10px;
          margin: 1px 0;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
          color: #444746;
          font-size: 13px;
          line-height: 1.5;
          border: 1px solid transparent;
        }
        .message-item:hover {
          background: rgba(0, 0, 0, 0.04);
          color: #1f1f1f;
        }
        .message-number {
          font-size: 11px;
          font-family: 'Google Sans', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
          font-variant-numeric: tabular-nums;
          font-weight: 500;
          color: #c4c7c5;
          min-width: 18px;
          text-align: right;
          flex-shrink: 0;
          opacity: 0.8;
        }
        .message-item:hover .message-number { color: #8e918f; }
        .message-text {
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          word-break: break-word;
        }
        .message-item.has-file .message-text::before {
            content: '📎 ';
            font-size: 11px;
            opacity: 0.7;
        }

        /* --- 暗色模式 --- */
        @media (prefers-color-scheme: dark) {
          .gemini-nav-sidebar {
            background: rgba(30, 31, 32, 0.92);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
          }
          .search-wrapper input { background: rgba(255, 255, 255, 0.08); color: #e3e3e3; }
          .search-wrapper input:focus { background: rgba(255, 255, 255, 0.12); }
          .search-icon { border-color: #8e918f; }
          .search-icon::after { background: #8e918f; }
          .refresh-btn { color: #8e918f; }
          .refresh-btn:hover { background: rgba(255, 255, 255, 0.1); color: #e3e3e3; }
          .message-item { color: #c4c7c5; }
          .message-item:hover { background: rgba(255, 255, 255, 0.08); color: #e3e3e3; }
          .message-number { color: #5e6062; }
          .message-item:hover .message-number { color: #8e918f; }
        }

        /* --- 高亮动画 --- */
        .gemini-message-highlight-pulse {
          position: relative;
          box-shadow: inset 4px 0 0 0 #4b90ff, 0 8px 20px rgba(66, 133, 244, 0.15) !important;
          background: linear-gradient(90deg, rgba(66, 133, 244, 0.08) 0%, rgba(66, 133, 244, 0) 100%) !important;
          border-radius: 4px 12px 12px 4px !important;
          transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        }

    `;

    // --- 2. 策略模式：定义抽象适配器 ---
    class PlatformAdapter {
        constructor() {
            this.name = 'Base';
        }

        // 是否在聊天页面
        isInChatPage() {
            return false;
        }

        // 获取 MutationObserver 监听的目标节点
        getObserverTarget() {
            return document.body;
        }

        // 提取消息列表 -> 返回 [{ text, element, hasFile, fileName }]
        getMessages() {
            return [];
        }

        // 获取平台特定的自定义样式
        getCustomStyle() {
            return '';
        }

        // 辅助方法：判断元素是否包含文件
        _hasFileAttachment(element) {
            const html = element.innerHTML.toLowerCase();
            return html.includes('file') || html.includes('image') || html.includes('attachment') || html.includes('upload') || element.querySelector('img') !== null || element.querySelector('[type="file"]') !== null;
        }

        // 辅助方法：创建预览文本
        _createPreview(text) {
            const maxLength = 60;
            let preview = text.replace(/\s+/g, ' ').trim();
            if (preview.length > maxLength) preview = preview.substring(0, maxLength) + '...';
            return preview;
        }
    }

    // --- 3. 策略实现：Gemini 适配器 ---
    class GeminiAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Gemini';
        }

        isInChatPage() {
            const url = window.location.href;
            return url.includes('/app/') && url.split('/app/')[1].length > 0;
        }

        getObserverTarget() {
            // Gemini 的主要变动在 body 或 main 区域， body 比较稳妥
            return document.body;
        }

        getMessages() {
            const selectors = ['[data-message-author-role="user"]', '.user-query', '[class*="user"]'];
            let userElements = [];
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) { userElements = Array.from(elements); break; }
            }
            if (userElements.length === 0) {
                const allElements = document.querySelectorAll('div[class*="message"], div[class*="query"], div[class*="turn"], article');
                userElements = Array.from(allElements).filter(el => this._isUserMessage(el));
            }

            const messages = [];
            const tempSeenTexts = new Set(); // 简单去重

            userElements.forEach((element) => {
                const messageData = this._extractMessageContent(element);
                if (!messageData || !messageData.text) return;

                const contentKey = messageData.text.trim().substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: element,
                    text: messageData.text,
                    preview: messageData.preview,
                    hasFile: messageData.hasFile,
                    fileName: messageData.fileName
                });
            });

            return messages;
        }

        _isUserMessage(element) {
            const htmlLower = element.outerHTML.toLowerCase();
            const hasUserIndicator = htmlLower.includes('data-message-author-role="user"') || htmlLower.includes('class="user') || htmlLower.includes('user-query') || htmlLower.includes('user-message');
            const hasAIIndicator = htmlLower.includes('model') || htmlLower.includes('assistant') || htmlLower.includes('gemini') || htmlLower.includes('response');
            if (hasUserIndicator && !hasAIIndicator) return true;
            if (hasAIIndicator) return false;
            const textContent = element.textContent || '';
            const hasCodeBlock = textContent.includes('```') || htmlLower.includes('<pre') || htmlLower.includes('<code');
            const isShort = textContent.length < 500;
            return isShort && !hasCodeBlock;
        }

        _extractMessageContent(element) {
            const fullText = element.innerText?.trim() || '';
            if (!fullText || fullText.length < 2) return null;
            const hasFile = this._hasFileAttachment(element);
            let fileName = '';
            let textContent = fullText;
            if (hasFile) {
                fileName = this._extractFileName(element);
                const textOnly = this._extractTextWithoutFileName(fullText, fileName);
                if (textOnly && textOnly.length > 5) textContent = textOnly;
                else if (fileName) textContent = fileName;
            }
            return { text: textContent, preview: this._createPreview(textContent), hasFile: hasFile, fileName: fileName };
        }

        _extractFileName(element) {
            const fileElements = element.querySelectorAll('[class*="file"], [class*="attachment"]');
            for (const fileEl of fileElements) {
                const text = fileEl.textContent?.trim();
                if (text && text.length > 0 && text.length < 100) return text;
            }
            const text = element.innerText;
            const filePattern = /([a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|pdf|doc|docx|txt|zip|rar))/i;
            const match = text.match(filePattern);
            return match ? match[1] : '';
        }

        _extractTextWithoutFileName(text, fileName) {
            if (!fileName) return text;
            let cleanText = text.replace(fileName, '').trim();
            cleanText = cleanText.replace(/已上传|上传|附件|文件|image|file/gi, '').trim();
            return cleanText;
        }
    }

    // --- 3.5 策略实现：ChatGPT 适配器 ---
    class ChatGPTAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'ChatGPT';
        }

        isInChatPage() {
            // ChatGPT 的 URL 结构通常是 chatgpt.com/c/xxx 或 chatgpt.com/ (新对话)
            return true; // chatgpt.com 本身就是聊天应用，且 match 规则已经限制了域名
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 你提供的 HTML 中有 data-message-author-role="user"
            const selectors = ['[data-message-author-role="user"]'];
            let userElements = [];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    userElements = Array.from(elements);
                    break;
                }
            }

            const messages = [];
            const tempSeenTexts = new Set();

            userElements.forEach((element) => {
                const messageData = this._extractMessageContent(element);
                if (!messageData || !messageData.text) return;

                // ChatGPT 有时会渲染多个相同的 hidden 元素，需要去重
                const contentKey = messageData.text.trim().substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: element, // 点击滚动时，chatgpt 结构比较深，可能需要滚动到父级，暂时先试直接滚动
                    text: messageData.text,
                    preview: messageData.preview,
                    hasFile: messageData.hasFile,
                    fileName: messageData.fileName
                });
            });

            return messages;
        }

        getCustomStyle() {
            // ChatGPT 的侧边栏可能被它的顶栏挡住，或者位置不合适
            // 这里微调一下 top 值
            return `
                .gemini-nav-sidebar {
                    z-index: 2147483647; /* 确保在顶层 */
                }
                .gemini-floating-tab {
                    z-index: 2147483647;
                }
                /* 暗色模式适配 */
                @media (prefers-color-scheme: dark) {
                    .gemini-nav-sidebar {
                        background: rgba(30, 31, 32, 0.95);
                    }
                }
            `;
        }

        // 复写提取逻辑，针对 ChatGPT 的 DOM
        _extractMessageContent(element) {
            // 从你提供的 HTML 看，文字在 .whitespace-pre-wrap 中
            const textEl = element.querySelector('.whitespace-pre-wrap') || element;
            let fullText = textEl.innerText?.trim() || '';

            if (!fullText) return null;

            // 暂时简化附件检测，ChatGPT 的附件通常是单独的区块
            const hasFile = false;
            const fileName = '';

            return {
                text: fullText,
                preview: this._createPreview(fullText),
                hasFile: hasFile,
                fileName: fileName
            };
        }
    }

    // --- 3.6 策略实现：DeepSeek 适配器 ---
    class DeepSeekAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'DeepSeek';
        }

        isInChatPage() {
            return true; // DeepSeek 整个站都是聊天
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 分析用户提供的 HTML:
            // 顶层容器: div._9663006
            // 消息体: div.fbb737a4 (包含文本 "nihao")
            // 它是位于 div.ds-message.ds-message--user 下面的
            // 最稳妥的方式是找包含 "ds-message" 的元素，并且分辨出是用户的

            // 观察 HTML 结构: <div class="d29f3d7d ds-message _63c77b1"> ... <div class="fbb737a4">nihao</div>
            // DeepSeek 的 class 经常是随机哈希 (fbb737a4), 但 'ds-message' 看起来是固定的语义化类名

            // 策略：查找所有 .ds-message，然后判断是否包含“编辑按钮”或者“用户头像”等特征，
            // 或者直接根据位置/结构。
            // 从用户提供的片段看： 
            // <div class="d29f3d7d ds-message _63c77b1"> ... <div class="fbb737a4">nihao</div> </div>
            // 下面跟着一个 tools 栏 <div class="ds-icon-button">

            // 尝试选择器：.ds-message
            const messageElements = Array.from(document.querySelectorAll('.ds-message'));

            const messages = [];
            const tempSeenTexts = new Set();

            messageElements.forEach((element) => {
                // 判断是否是用户消息
                // 在 DeepSeek 中，AI 的消息通常会有 .ds-message--assistant 类，或者包含 markdown
                // 用户的消息通常比较简单。
                // 咱们通过排除法：如果它不包含 "ds-message--assistant" 类 (假设存在这个类)，或者看能否找到某些特征.
                // 也就是你给的片段里，有没有特定的标识？
                // 片段里只有 <div class="d29f3d7d ds-message _63c77b1">
                // 我们假设所有右侧的、或者没有特定 'assistant' 标记的是用户消息。

                // ★ 更好的方法：DeepSeek 的用户消息通常是纯文本包含在某个 div 里，而 AI 是 markdown
                // 我们尝试提取文本，如果包含 "nihao" 这种，应该就是。

                // 暂时简单粗暴：DeepSeek 的用户消息气泡通常在右边? 或者没有 "ds-markdown" 类
                // 你给的 HTML 里有个 <div class="fbb737a4">nihao</div>

                // 让我们尝试抓取 .ds-message 下的文本容器
                // 经过观察 DeepSeek 网页，用户提问通常在 .ds-message 里，且没有 .ds-markdown

                const isAI = element.querySelector('.ds-markdown') !== null;
                if (isAI) return;

                const messageData = this._extractMessageContent(element);
                if (!messageData || !messageData.text) return;

                const contentKey = messageData.text.trim().substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: element,
                    text: messageData.text,
                    preview: messageData.preview,
                    hasFile: messageData.hasFile,
                    fileName: messageData.fileName
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }

        _extractMessageContent(element) {
            // 尝试获取文本
            // 从片段看： <div class="fbb737a4">nihao</div> 是直接的文本容器
            // 因为 class 是随机的，我们取 element.innerText 即可
            const fullText = element.innerText?.trim() || '';
            if (!fullText) return null;

            return {
                text: fullText,
                preview: this._createPreview(fullText),
                hasFile: false,
                fileName: ''
            };
        }
    }

    // --- 3.7 策略实现：豆包 (Doubao) 适配器 ---
    class DoubaoAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Doubao';
        }

        isInChatPage() {
            return true; // 豆包大多数页面也是聊天
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 容器: div[data-testid="send_message"]  (看起来是发送的消息，即用户消息)
            // 文本: div[data-testid="message_text_content"]

            const userMessageContainers = document.querySelectorAll('div[data-testid="send_message"]');

            const messages = [];
            const tempSeenTexts = new Set();

            userMessageContainers.forEach((container) => {
                const textEl = container.querySelector('div[data-testid="message_text_content"]');
                if (!textEl) return;

                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container, // 滚动到这个外部容器
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false, // 暂时不处理豆包的文件
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            // 豆包的侧边栏通常在左侧，我们的在右侧，应该不冲突
            return `
                 .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.8 策略实现：腾讯元宝 (Yuanbao) 适配器 ---
    class YuanbaoAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Yuanbao';
        }

        isInChatPage() {
            return true; // 元宝整站基本都是聊天
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: .agent-chat__bubble--human
            // 文本内容: .hyc-content-text

            const userMessageContainers = document.querySelectorAll('.agent-chat__bubble--human');

            const messages = [];
            const tempSeenTexts = new Set();

            userMessageContainers.forEach((container) => {
                const textEl = container.querySelector('.hyc-content-text');
                if (!textEl) return;

                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.9 策略实现：通义千问 (Qianwen) 适配器 ---
    class QianwenAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Qianwen';
        }

        isInChatPage() {
            return true; // 千问整站都是聊天
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: div.content-YjXTeU (包含 bubble)
            // 文本内容: .bubble-uo23is

            const userBubbles = document.querySelectorAll('.bubble-uo23is');

            const messages = [];
            const tempSeenTexts = new Set();

            userBubbles.forEach((bubble) => {
                const fullText = bubble.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: bubble,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.10 策略实现：Kimi 适配器 ---
    class KimiAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Kimi';
        }

        isInChatPage() {
            return window.location.pathname.includes('/chat');
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: .segment-user
            // 文本内容: .user-content

            const userSegments = document.querySelectorAll('.segment-user');

            const messages = [];
            const tempSeenTexts = new Set();

            userSegments.forEach((segment) => {
                const textEl = segment.querySelector('.user-content');
                if (!textEl) return;

                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: segment,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.11 策略实现：文心一言 (Yiyan) 适配器 ---
    class YiyanAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Yiyan';
        }

        isInChatPage() {
            return window.location.pathname.includes('/chat');
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: .questionBox__ZFtMiY23 或 .roleUser__TCPTqNDW
            // 文本内容: .questionText__ptIGR0nj 或 #question_text_id
            // 注意：百度文心的 class 名带有哈希后缀，可能会变，但 questionBox/questionText 前缀应该稳定

            // 尝试多种选择器
            const userQuestions = document.querySelectorAll('[class*="questionBox"], [class*="roleUser"]');

            const messages = [];
            const tempSeenTexts = new Set();

            userQuestions.forEach((container) => {
                // 尝试找文本元素
                const textEl = container.querySelector('[class*="questionText"]') ||
                    container.querySelector('#question_text_id');
                if (!textEl) return;

                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.12 策略实现：智谱清言 (ChatGLM) 适配器 ---
    class ChatGLMAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'ChatGLM';
        }

        isInChatPage() {
            return true;
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 文本容器: .question-txt

            const userQuestions = document.querySelectorAll('.question-txt');

            const messages = [];
            const tempSeenTexts = new Set();

            userQuestions.forEach((textEl) => {
                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: textEl,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.13 策略实现：秘塔AI (Metaso) 适配器 ---
    class MetasoAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Metaso';
        }

        isInChatPage() {
            return window.location.pathname.includes('/search');
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: .resultTitle 或 [data-result-id]
            // 文本内容在 span 里

            const userQuestions = document.querySelectorAll('.resultTitle');

            const messages = [];
            const tempSeenTexts = new Set();

            userQuestions.forEach((container) => {
                // 获取里面的 span 文本（排除按钮等）
                const spans = container.querySelectorAll('span');
                let fullText = '';
                spans.forEach(span => {
                    const txt = span.innerText?.trim();
                    if (txt && txt.length > 0 && !span.querySelector('button')) {
                        fullText += txt + ' ';
                    }
                });
                fullText = fullText.trim();
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.14 策略实现：MiniMax 适配器 ---
    class MiniMaxAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'MiniMax';
        }

        isInChatPage() {
            return window.location.pathname.includes('/chat');
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: .message.sent (class "sent" 表示用户发送的消息)
            // 文本内容: .message-content 下的 span

            const userMessages = document.querySelectorAll('.message.sent');

            const messages = [];
            const tempSeenTexts = new Set();

            userMessages.forEach((container) => {
                const contentEl = container.querySelector('.message-content');
                if (!contentEl) return;

                const fullText = contentEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 3.15 策略实现：Perplexity 适配器 ---
    class PerplexityAdapter extends PlatformAdapter {
        constructor() {
            super();
            this.name = 'Perplexity';
        }

        isInChatPage() {
            return window.location.pathname.includes('/search');
        }

        getObserverTarget() {
            return document.body;
        }

        getMessages() {
            // 根据用户提供的 DOM:
            // 用户消息容器: h1 里面的 .bg-offset
            // 文本内容: span.select-text

            const userQueries = document.querySelectorAll('h1 .bg-offset');

            const messages = [];
            const tempSeenTexts = new Set();

            userQueries.forEach((container) => {
                const textEl = container.querySelector('.select-text');
                if (!textEl) return;

                const fullText = textEl.innerText?.trim() || '';
                if (!fullText) return;

                const contentKey = fullText.substring(0, 100);
                if (tempSeenTexts.has(contentKey)) return;
                tempSeenTexts.add(contentKey);

                messages.push({
                    element: container,
                    text: fullText,
                    preview: this._createPreview(fullText),
                    hasFile: false,
                    fileName: ''
                });
            });

            return messages;
        }

        getCustomStyle() {
            return `
                .gemini-nav-sidebar {
                    z-index: 99999;
                }
            `;
        }
    }

    // --- 4. 工厂模式：适配器工厂 ---
    class AdapterFactory {
        static getAdapter() {
            const host = window.location.hostname;
            if (host.includes('google.com')) {
                return new GeminiAdapter();
            }
            if (host.includes('chatgpt.com') || host.includes('openai.com')) {
                return new ChatGPTAdapter();
            }
            if (host.includes('deepseek.com')) {
                return new DeepSeekAdapter();
            }
            if (host.includes('doubao.com')) {
                return new DoubaoAdapter();
            }
            if (host.includes('yuanbao.tencent.com')) {
                return new YuanbaoAdapter();
            }
            if (host.includes('qianwen.com') || host.includes('tongyi.aliyun.com')) {
                return new QianwenAdapter();
            }
            if (host.includes('kimi.com')) {
                return new KimiAdapter();
            }
            if (host.includes('yiyan.baidu.com')) {
                return new YiyanAdapter();
            }
            if (host.includes('chatglm.cn')) {
                return new ChatGLMAdapter();
            }
            if (host.includes('metaso.cn')) {
                return new MetasoAdapter();
            }
            if (host.includes('minimaxi.com')) {
                return new MiniMaxAdapter();
            }
            if (host.includes('perplexity.ai')) {
                return new PerplexityAdapter();
            }
            return null;
        }
    }

    // --- 5. 主程序：通用侧边栏 (UI Context) ---
    class UniversalSidebar {
        constructor() {
            this.adapter = AdapterFactory.getAdapter();
            if (!this.adapter) {
                console.log('Gemini Sidebar: 当前网站不支持');
                return;
            }

            this.sidebar = null;
            this.floatingTab = null;
            this.messageList = null;
            this.messages = [];
            this.observer = null;
            this.lastContentHash = '';

            this.init();
        }

        init() {
            this.injectStyles();

            if (!this.adapter.isInChatPage()) {
                this.observeUrlChanges();
                return;
            }

            this.createSidebar();
            this.createFloatingTab();
            this.observeMessages();
            this.setupEventListeners();
            setTimeout(() => this.scanMessages(), 1000);
        }

        injectStyles() {
            const styleId = 'gemini-nav-final-style';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                // 合并通用样式和特定适配器样式
                style.textContent = CUSTOM_STYLES + this.adapter.getCustomStyle();
                document.head.appendChild(style);
            }
        }

        observeUrlChanges() {
            let lastUrl = location.href;
            new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                    lastUrl = url;
                    const inChat = this.adapter.isInChatPage();

                    if (inChat && !this.sidebar) {
                        this.createSidebar();
                        this.createFloatingTab();
                        this.observeMessages();
                        this.setupEventListeners();
                        setTimeout(() => this.scanMessages(), 1000);
                    } else if (!inChat) {
                        this.cleanup();
                    }
                }
            }).observe(document, { subtree: true, childList: true });
        }

        cleanup() {
            if (this.sidebar) { this.sidebar.remove(); this.sidebar = null; }
            if (this.floatingTab) { this.floatingTab.remove(); this.floatingTab = null; }
            if (this.observer) { this.observer.disconnect(); this.observer = null; }
            this.lastContentHash = '';
        }

        // --- UI 创建部分 (保持不变，除了通用化) ---
        createFloatingTab() {
            this.floatingTab = document.createElement('div');
            this.floatingTab.className = 'gemini-floating-tab';
            this.floatingTab.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" fill="white"/>
                </svg>
            `;
            document.body.appendChild(this.floatingTab);

            // 延迟显示侧边栏，给拖拽操作留出时间
            this.floatingTab.addEventListener('mouseenter', () => {
                this.showSidebarTimeout = setTimeout(() => {
                    if (!this.isDragging) { // 只有在没有拖拽时才显示
                        this.showSidebar();
                    }
                }, 300); // 300ms 延迟
            });

            this.floatingTab.addEventListener('mouseleave', () => {
                clearTimeout(this.showSidebarTimeout);
            });

            // 增加拖拽功能
            this.makeDraggable(this.floatingTab);
        }

        makeDraggable(element) {
            this.isDragging = false;
            let startY, startTop;

            // 只需要垂直拖拽，因为左右一般是贴边的
            // 如果你想让它能随意拖动，可以加上 startX

            const onMouseDown = (e) => {
                this.isDragging = false; // 初始化
                startY = e.clientY;
                const rect = element.getBoundingClientRect();
                startTop = rect.top;

                // 只有主键点击才触发
                if (e.button !== 0) return;

                // 取消显示侧边栏的定时器
                clearTimeout(this.showSidebarTimeout);

                // 如果侧边栏已经打开，先关闭它
                if (this.sidebar && this.sidebar.classList.contains('show')) {
                    this.sidebar.classList.remove('show');
                    this.sidebar.classList.add('collapsed');
                    this.floatingTab.classList.remove('hidden');
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                // 防止选中文本
                e.preventDefault();
            };

            const onMouseMove = (e) => {
                if (!this.isDragging) {
                    // 简单的防抖，防止误触点击
                    if (Math.abs(e.clientY - startY) > 5) {
                        this.isDragging = true;
                        element.style.transition = 'none'; // 拖动时移除过度，防止卡顿
                    }
                }

                if (this.isDragging) {
                    const newTop = startTop + (e.clientY - startY);
                    // 限制边界
                    const maxTop = window.innerHeight - 50;
                    const constrainedTop = Math.max(10, Math.min(newTop, maxTop));

                    element.style.top = constrainedTop + 'px';
                    element.style.transform = 'translateY(0)'; // 移除原本的 -50% 变换

                    // 同时移动侧边栏，让它跟其对齐
                    if (this.sidebar) {
                        this.sidebar.style.top = constrainedTop + 'px';
                        this.sidebar.style.transform = 'translateY(0) translateX(20px)'; // collapsed 状态
                    }
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                // 恢复过渡动画
                element.style.transition = '';

                // 如果刚刚发生了拖动，阻止后续的 click 事件（虽然这里是 mouseenter 触发显示，但也防止误判）
                if (this.isDragging) {
                    // 可以保存位置到 localStorage，以便刷新后保持
                    localStorage.setItem('gemini-nav-top', element.style.top);
                }

                // 重置拖拽状态 (稍微延迟，防止误触发 mouseenter)
                setTimeout(() => {
                    this.isDragging = false;
                }, 100);
            };

            element.addEventListener('mousedown', onMouseDown);

            // 恢复上次保存的位置
            const savedTop = localStorage.getItem('gemini-nav-top');
            if (savedTop) {
                element.style.top = savedTop;
                element.style.transform = 'translateY(0)';
            }
        }

        createSidebar() {
            this.sidebar = document.createElement('div');
            this.sidebar.id = 'gemini-nav-sidebar';
            this.sidebar.className = 'gemini-nav-sidebar collapsed';

            this.sidebar.innerHTML = `
                <div class="top-bar" style="cursor: grab;">
                    <div class="search-wrapper">
                        <div class="search-icon"></div>
                        <input type="text" id="search-input" placeholder="搜索..." />
                    </div>
                    <button id="refresh-btn" class="refresh-btn" title="刷新列表">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                    </button>
                </div>
                <div class="message-list" id="message-list"></div>
            `;

            document.body.appendChild(this.sidebar);
            this.messageList = document.getElementById('message-list');
            this.sidebar.addEventListener('mouseleave', () => this.hideSidebar());
            this.sidebar.addEventListener('mouseenter', () => clearTimeout(this.hideTimeout));

            // 允许通过顶栏拖拽侧边栏位置
            const topBar = this.sidebar.querySelector('.top-bar');
            this.makeSidebarDraggable(topBar);
        }

        makeSidebarDraggable(dragHandle) {
            let isDraggingSidebar = false;
            let startY, startTop;

            const onMouseDown = (e) => {
                // 如果点击的是搜索框或按钮，不触发拖拽
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }

                isDraggingSidebar = false;
                startY = e.clientY;
                const rect = this.sidebar.getBoundingClientRect();
                startTop = rect.top;

                if (e.button !== 0) return;

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
                dragHandle.style.cursor = 'grabbing';
            };

            const onMouseMove = (e) => {
                if (!isDraggingSidebar) {
                    if (Math.abs(e.clientY - startY) > 5) {
                        isDraggingSidebar = true;
                        this.sidebar.style.transition = 'none';
                        this.floatingTab.style.transition = 'none';
                    }
                }

                if (isDraggingSidebar) {
                    const newTop = startTop + (e.clientY - startY);
                    const maxTop = window.innerHeight - 100;
                    const constrainedTop = Math.max(10, Math.min(newTop, maxTop));

                    this.sidebar.style.top = constrainedTop + 'px';
                    this.sidebar.style.transform = 'translateY(0) translateX(0)';

                    // 同步移动悬浮球
                    this.floatingTab.style.top = constrainedTop + 'px';
                    this.floatingTab.style.transform = 'translateY(0)';
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                this.sidebar.style.transition = '';
                this.floatingTab.style.transition = '';
                dragHandle.style.cursor = 'grab';

                if (isDraggingSidebar) {
                    localStorage.setItem('gemini-nav-top', this.floatingTab.style.top);
                }
            };

            dragHandle.addEventListener('mousedown', onMouseDown);
        }

        setupEventListeners() {
            const refreshBtn = document.getElementById('refresh-btn');
            refreshBtn?.addEventListener('click', () => {
                this.lastContentHash = '';
                this.scanMessages();
                refreshBtn.style.transform = 'rotate(360deg)';
                setTimeout(() => refreshBtn.style.transform = '', 300);
            });

            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => this.filterMessages(e.target.value));
                searchInput.addEventListener('focus', () => { clearTimeout(this.hideTimeout); });
                searchInput.addEventListener('blur', () => { this.hideSidebar(); });
            }
        }

        showSidebar() {
            clearTimeout(this.hideTimeout);
            this.sidebar.classList.add('show');
            this.sidebar.classList.remove('collapsed');
            this.floatingTab.classList.add('hidden');
        }

        hideSidebar() {
            if (document.activeElement === document.getElementById('search-input')) return;
            this.hideTimeout = setTimeout(() => {
                this.sidebar.classList.remove('show');
                this.sidebar.classList.add('collapsed');
                this.floatingTab.classList.remove('hidden');
            }, 200);
        }

        observeMessages() {
            const targetNode = this.adapter.getObserverTarget();
            const config = { childList: true, subtree: true };

            this.observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                for (const mutation of mutations) {
                    if (this.sidebar && (this.sidebar === mutation.target || this.sidebar.contains(mutation.target))) {
                        continue;
                    }
                    if (mutation.addedNodes.length > 0) {
                        shouldUpdate = true;
                        break;
                    }
                }
                if (shouldUpdate) {
                    clearTimeout(this.updateTimeout);
                    this.updateTimeout = setTimeout(() => this.scanMessages(), 1000);
                }
            });

            this.observer.observe(targetNode, config);
        }

        // --- 核心逻辑变动：委托给 Adapter ---
        scanMessages() {
            // ★这里不再自己查找 DOM，而是问 Adapter 要数据
            const newMessages = this.adapter.getMessages();

            // 生成 Hash 用于比对是否有变化
            const lastMsgPreview = newMessages.length > 0 ? newMessages[newMessages.length - 1].text.substring(0, 20) : '';
            const currentHash = newMessages.length + '|' + lastMsgPreview;

            if (this.lastContentHash === currentHash) return;

            this.lastContentHash = currentHash;
            this.messages = newMessages;
            this.updateMessageList();
        }

        // --- 渲染列表 (保持不变) ---
        updateMessageList() {
            if (!this.messageList) return;
            this.messageList.innerHTML = '';

            if (this.messages.length === 0) {
                this.messageList.innerHTML = '<div style="text-align:center;padding:20px;color:#999;font-size:12px">暂无消息</div>';
                return;
            }

            const fragment = document.createDocumentFragment();
            this.messages.forEach((msg, index) => {
                const item = document.createElement('div');
                item.className = 'message-item';
                if (msg.hasFile) item.classList.add('has-file');
                item.dataset.index = index;

                item.innerHTML = `
                    <div class="message-number">${index + 1}</div>
                    <div class="message-text">${this.escapeHtml(msg.preview)}</div>
                `;

                item.addEventListener('click', () => this.scrollToMessage(msg.element));
                fragment.appendChild(item);
            });
            this.messageList.appendChild(fragment);
        }

        filterMessages(searchTerm) {
            const items = this.messageList.querySelectorAll('.message-item');
            const term = searchTerm.toLowerCase().trim();
            if (!term) { items.forEach(item => item.style.display = 'flex'); return; }
            items.forEach((item, index) => {
                const msg = this.messages[index];
                if (msg && msg.text.toLowerCase().includes(term)) item.style.display = 'flex';
                else item.style.display = 'none';
            });
        }

        scrollToMessage(element) {
            if (!element) return;
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.remove('gemini-message-highlight-pulse');
            void element.offsetWidth; // Force Reflow
            element.classList.add('gemini-message-highlight-pulse');
            setTimeout(() => {
                element.classList.remove('gemini-message-highlight-pulse');
            }, 2500);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // --- 启动 ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new UniversalSidebar());
    } else {
        new UniversalSidebar();
    }
})();
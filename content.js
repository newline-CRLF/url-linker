function linkifyTextNode(textNode) {
  const urlRegex = /(https:\/\/[^\s<>"'`]+)/g;
  const text = textNode.nodeValue;
  let lastIndex = 0;
  const fragment = document.createDocumentFragment();
  let matchFound = false;

  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    matchFound = true;
    // URLの前のテキスト部分を追加
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
    }

    // URL部分をaタグで囲んで追加
    const anchor = document.createElement('a');
    anchor.href = match[0];
    anchor.textContent = match[0];
    anchor.target = '_blank'; // 新しいタブで開く
    anchor.rel = 'noopener noreferrer'; // セキュリティ対策
    fragment.appendChild(anchor);

    lastIndex = urlRegex.lastIndex;
  }

  if (matchFound) {
    // 最後のURLの後の残りのテキスト部分を追加
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    // 元のテキストノードを、新しく作成したノード群（フラグメント）で置き換える
    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }
}

function processPageContent(rootElement) {
  // TreeWalkerを使って、指定された要素内のテキストノードだけを効率的に見つけ出す
  const walker = document.createTreeWalker(
    rootElement,
    NodeFilter.SHOW_TEXT, // テキストノードのみを対象とする
    {
      acceptNode: function(node) {
        // 親ノードが特定のタグの場合は処理をスキップする
        // (例: 既にリンクになっているもの、スクリプトやスタイルタグの中身、編集可能な領域)
        const parent = node.parentNode;
        if (parent && (parent.nodeName === 'A' ||
            parent.nodeName === 'SCRIPT' ||
            parent.nodeName === 'STYLE' ||
            parent.nodeName === 'TEXTAREA' ||
            parent.isContentEditable)) {
          return NodeFilter.FILTER_REJECT; // このノードは処理しない
        }
        // "https://" を含まないテキストノードは、Regexチェックの負荷を避けるために早めに除外
        if (!/https:\/\//i.test(node.nodeValue)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT; // このノードは処理する
      }
    }
  );

  // DOMを変更するとTreeWalkerの動作に影響が出ることがあるため、
  // まず処理対象のノードを全て集めてから、順番に処理する
  const textNodesToProcess = [];
  let currentNode;
  while (currentNode = walker.nextNode()) {
    textNodesToProcess.push(currentNode);
  }

  // 集めたテキストノードに対してリンク化処理を実行
  for (const node of textNodesToProcess) {
    linkifyTextNode(node);
  }
}

// DOMの準備ができたら、または既に準備ができていれば処理を開始
if (document.readyState === 'loading') {
  // まだ読み込み中なので、完了を待つ
  document.addEventListener('DOMContentLoaded', () => {
    processPageContent(document.body);
  });
} else {
  // 既にDOMは準備完了
  processPageContent(document.body);
}

// 動的に読み込まれるコンテンツに対応するためのMutationObserverのセットアップ
// (これはより高度な機能ですが、多くの現代的なウェブサイトで役立ちます)
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((newNode) => {
        // 追加されたノードが要素ノードである場合、その中身を処理
        if (newNode.nodeType === Node.ELEMENT_NODE) {
          // 追加されたノード自体がリンク化の対象になる可能性のあるタグかチェック
          if (newNode.nodeName !== 'A' && newNode.nodeName !== 'SCRIPT' && newNode.nodeName !== 'STYLE' && newNode.nodeName !== 'TEXTAREA' && !newNode.isContentEditable) {
            processPageContent(newNode);
          }
        }
        // 追加されたノードがテキストノードである場合、直接処理を試みる
        // (ただし、親要素のコンテキストを考慮する必要がある)
        else if (newNode.nodeType === Node.TEXT_NODE) {
          const parent = newNode.parentNode;
          if (parent && parent.nodeName !== 'A' && parent.nodeName !== 'SCRIPT' && parent.nodeName !== 'STYLE' && parent.nodeName !== 'TEXTAREA' && !parent.isContentEditable) {
            if (/https:\/\//i.test(newNode.nodeValue)) {
               linkifyTextNode(newNode);
            }
          }
        }
      });
    }
  }
});

// document.body全体を監視対象として、子ノードリストの変更とサブツリーの変更を監視
observer.observe(document.body, { childList: true, subtree: true });

console.log("プレーンテキストURLリンカーが実行されました。");
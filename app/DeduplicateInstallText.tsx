"use client";

import { useEffect } from "react";

const TARGET = "Веб-версия запускается с экрана телефона как обычное приложение.";

export default function DeduplicateInstallText() {
  useEffect(() => {
    const root = document.querySelector(".install-rules");
    if (!root) return;

    let found = false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text);
    }

    for (const node of nodes) {
      let value = node.nodeValue ?? "";
      let index = value.indexOf(TARGET);

      while (index !== -1) {
        if (!found) {
          found = true;
          index = value.indexOf(TARGET, index + TARGET.length);
          continue;
        }

        value = value.slice(0, index) + value.slice(index + TARGET.length);
        node.nodeValue = value;
        index = value.indexOf(TARGET, index);
      }
    }
  }, []);

  return null;
}

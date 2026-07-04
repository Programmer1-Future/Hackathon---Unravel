import {
  chat,
  decompose,
  decomposeImage,
  generateQuest,
  generateSandbox,
  hasApiKey,
} from '@/utils/gemini';
import { fakeDecompose, fakeQuest, fakeSandbox } from '@/utils/fake-data';
import { setCurrentTree, recordActivity, getCurrentTree } from '@/utils/storage';
import type {
  ChatAskMessage,
  ChatMessage,
  PageContext,
  QuestRequestMessage,
  RuntimeMessage,
  SandboxRequestMessage,
  UnravelSelectionMessage,
} from '@/utils/types';

export default defineBackground(() => {
  // Toolbar icon opens the side panel too (fallback if the floating-button
  // gesture path ever fails on stage).
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.error('[unravel] setPanelBehavior', e));

  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    if (message.type === 'UNRAVEL_SELECTION') {
      // Open the panel SYNCHRONOUSLY, as the very first thing — Chrome only
      // treats sidePanel.open() as gesture-driven if it runs before any await.
      // (Burying it inside the async handler is why it silently failed.)
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        chrome.sidePanel.open({ tabId }).catch((e) => {
          console.warn('[unravel] sidePanel.open failed; toolbar icon still works:', e);
        });
      }
      handleUnravel(message, tabId).then(sendResponse);
      return true; // keep the message channel open for the async response
    }
    if (message.type === 'CHAT_ASK') {
      handleChat(message).then(sendResponse);
      return true;
    }
    if (message.type === 'QUEST_REQUEST') {
      handleQuest(message).then(sendResponse);
      return true;
    }
    if (message.type === 'SANDBOX_REQUEST') {
      handleSandbox(message).then(sendResponse);
      return true;
    }
    if (message.type === 'CAPTURE_UNRAVEL') {
      handleCapture(sender.tab?.id).then(sendResponse);
      return true;
    }
  });

  // Screenshot the visible tab (works on PDFs/images — no content script needed)
  // and unravel it with Gemini vision.
  async function handleCapture(tabId: number | undefined) {
    await chrome.storage.local.set({ treeStatus: 'loading' });
    try {
      let tab: chrome.tabs.Tab | undefined;
      if (tabId !== undefined) tab = await chrome.tabs.get(tabId);
      else [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
      const imageBase64 = dataUrl.split(',')[1];
      const title = tab?.title ?? 'Captured page';
      const url = tab?.url ?? '';

      const tree = hasApiKey()
        ? await decomposeImage(imageBase64, title, url)
        : fakeDecompose('', title, url);

      // Save the screenshot as chat context so Coach can answer about the PDF too.
      const pageContext: PageContext = { pageText: '', pageTitle: title, url, image: imageBase64 };
      await chrome.storage.local.set({ pageContext });
      await setCurrentTree(tree);
      await chrome.storage.local.set({ treeStatus: 'ready' });
      await recordActivity({ url, topic: tree.topic, nodesExpanded: 0, questsDone: 0, xpEarned: 10 });
      return { ok: true };
    } catch (e) {
      console.error('[unravel] capture failed:', e);
      await chrome.storage.local.set({
        treeStatus: 'error',
        treeError: e instanceof Error ? e.message : String(e),
      });
      return { ok: false, error: String(e) };
    }
  }

  async function handleQuest(message: QuestRequestMessage) {
    try {
      const tree = await getCurrentTree();
      const nodes = tree?.nodes.filter((n) => message.nodeIds.includes(n.id)) ?? [];
      const questions =
        hasApiKey() && nodes.length ? await generateQuest(nodes) : fakeQuest();
      return { ok: true, questions };
    } catch (e) {
      console.error('[unravel] quest failed:', e);
      return { ok: false, error: String(e), questions: fakeQuest() };
    }
  }

  async function handleSandbox(message: SandboxRequestMessage) {
    try {
      const spec = hasApiKey() ? await generateSandbox(message.text) : fakeSandbox();
      return { ok: true, spec };
    } catch (e) {
      console.error('[unravel] sandbox failed:', e);
      return { ok: false, error: String(e), spec: fakeSandbox() };
    }
  }

  async function handleUnravel(message: UnravelSelectionMessage, _tabId: number | undefined) {
    // Panel is opened synchronously in the message listener above (gesture
    // preservation). Here we just do the async Gemini work.

    // Save the whole page as chat context, signal "loading", then fill in the tree.
    const pageContext: PageContext = {
      pageText: message.pageText,
      pageTitle: message.pageTitle,
      url: message.url,
    };
    await chrome.storage.local.set({ treeStatus: 'loading', pageContext });

    try {
      const tree = hasApiKey()
        ? await decompose(message.text, message.pageTitle, message.url)
        : fakeDecompose(message.text, message.pageTitle, message.url);

      await setCurrentTree(tree);
      await chrome.storage.local.set({ treeStatus: 'ready' });
      await recordActivity({
        url: message.url,
        topic: tree.topic,
        nodesExpanded: 0,
        questsDone: 0,
        xpEarned: 10, // starting an unravel earns a little XP
      });
      return { ok: true };
    } catch (e) {
      console.error('[unravel] decompose failed:', e);
      await chrome.storage.local.set({
        treeStatus: 'error',
        treeError: e instanceof Error ? e.message : String(e),
      });
      return { ok: false, error: String(e) };
    }
  }

  async function handleChat(message: ChatAskMessage) {
    const { pageContext, currentTree, chatHistory } = await chrome.storage.local.get([
      'pageContext',
      'currentTree',
      'chatHistory',
    ]);
    const history = (chatHistory as ChatMessage[] | undefined) ?? [];

    const userTurn: ChatMessage = { role: 'user', text: message.question, ts: Date.now() };
    await chrome.storage.local.set({ chatHistory: [...history, userTurn], chatStatus: 'thinking' });

    try {
      const answer = hasApiKey()
        ? await chat(
            message.question,
            (pageContext as PageContext | undefined) ?? null,
            (currentTree as { topic?: string } | undefined)?.topic ?? null,
            history,
            message.attachments,
          )
        : "I'm in demo mode (no API key yet) — but once it's added in .env, I'll answer using this whole page as context, so you never have to copy anything over.";

      const modelTurn: ChatMessage = { role: 'model', text: answer, ts: Date.now() };
      await chrome.storage.local.set({
        chatHistory: [...history, userTurn, modelTurn],
        chatStatus: 'idle',
      });
      return { ok: true };
    } catch (e) {
      console.error('[unravel] chat failed:', e);
      const errTurn: ChatMessage = {
        role: 'model',
        text: `Something went wrong: ${e instanceof Error ? e.message : e}`,
        ts: Date.now(),
      };
      await chrome.storage.local.set({
        chatHistory: [...history, userTurn, errTurn],
        chatStatus: 'idle',
      });
      return { ok: false };
    }
  }
});

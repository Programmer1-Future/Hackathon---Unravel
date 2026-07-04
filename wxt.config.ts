import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Unravel',
    description:
      'Turns walls of text into interactive concept maps, micro-quests, and sandboxes — built for ADHD and SEN students.',
    permissions: ['storage', 'activeTab', 'sidePanel', 'tabs'],
    // captureVisibleTab needs host access to read the pixels of PDF/other tabs.
    host_permissions: ['<all_urls>'],
  },
});

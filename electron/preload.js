// Preload script para futura implementação de contextIsolation
const { contextBridge, ipcRenderer } = require('electron');

// Quando migrar para contextIsolation: true, descomente abaixo:
// contextBridge.exposeInMainWorld('electronAPI', {
//   saveData: (data) => ipcRenderer.invoke('save-data', data),
//   loadData: () => ipcRenderer.invoke('load-data'),
//   importImage: () => ipcRenderer.invoke('import-image'),
//   aiRequest: (params) => ipcRenderer.invoke('ai-request', params),
// });

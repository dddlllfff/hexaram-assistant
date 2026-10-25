const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('hexaramRecognition', {
  getSettings: () => ipcRenderer.invoke('recognition:settings'),
  configure: (settings) => ipcRenderer.invoke('recognition:configure', settings),
  chooseDirectory: () => ipcRenderer.invoke('recognition:directory'),
  listSources: () => ipcRenderer.invoke('recognition:sources'),
  preview: () => ipcRenderer.invoke('recognition:preview'),
  scan: () => ipcRenderer.invoke('recognition:scan'),
  onObservation: (callback) => {
    const listener = (_event, packet) => callback(packet);
    ipcRenderer.on('recognition:observation', listener);
    return () => ipcRenderer.removeListener('recognition:observation', listener);
  },
});

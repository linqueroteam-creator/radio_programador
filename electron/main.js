const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'ANOTATA',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    backgroundColor: '#1a1a2e',
  });

  // Em desenvolvimento carrega do Vite, em produção do build
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC para salvar/carregar dados
ipcMain.handle('save-data', async (event, data) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'anotata-data.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('load-data', async () => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'anotata-data.json');
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  return null;
});

// IPC para importar imagem
ipcMain.handle('import-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const imgPath = result.filePaths[0];
    const imgData = fs.readFileSync(imgPath);
    const base64 = imgData.toString('base64');
    const ext = path.extname(imgPath).slice(1);
    return `data:image/${ext};base64,${base64}`;
  }
  return null;
});

// === PORTA ABERTA PARA IA ===
// Aqui você pode adicionar sua IA no futuro.
// Exemplo: ipcMain.handle('ai-process', async (event, prompt) => { ... })
// A interface já tem um botão de IA que dispara o evento 'ai-request'
ipcMain.handle('ai-request', async (event, { action, content }) => {
  // PLACEHOLDER: Substitua por sua implementação de IA
  // action pode ser: 'summarize', 'expand', 'translate', 'suggest', 'custom'
  // content é o texto selecionado ou nota inteira
  return {
    success: false,
    message: 'IA ainda não configurada. Conecte sua IA aqui!',
    result: null
  };
});

const jwt = require('jsonwebtoken');

function getConfig() {
  const privateKey = process.env.BOX_JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey) throw new Error('BOX_JWT_PRIVATE_KEY is not set');

  if (!process.env.BOX_CLIENT_ID)     throw new Error('BOX_CLIENT_ID is not set');
  if (!process.env.BOX_CLIENT_SECRET) throw new Error('BOX_CLIENT_SECRET is not set');
  if (!process.env.BOX_JWT_PASSPHRASE) throw new Error('BOX_JWT_PASSPHRASE is not set');
  if (!process.env.BOX_JWT_KEY_ID)    throw new Error('BOX_JWT_KEY_ID is not set');
  if (!process.env.BOX_ENTERPRISE_ID) throw new Error('BOX_ENTERPRISE_ID is not set');

  return {
    boxAppSettings: {
      clientID:     process.env.BOX_CLIENT_ID,
      clientSecret: process.env.BOX_CLIENT_SECRET,
      appAuth: {
        privateKey,
        passphrase:  process.env.BOX_JWT_PASSPHRASE,
        publicKeyID: process.env.BOX_JWT_KEY_ID,
      },
    },
    enterpriseID: process.env.BOX_ENTERPRISE_ID,
  };
}

// ... rest of the file stays exactly the same

async function getAccessToken() {
  const c = getConfig();
  const now = Math.floor(Date.now() / 1000);

  const claims = {
    iss: c.boxAppSettings.clientID,
    sub: c.enterpriseID,
    box_sub_type: 'enterprise',
    aud: 'https://api.box.com/oauth2/token',
    jti: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
    iat: now - 30,
    exp: now + 60,
  };

  const privateKey = c.boxAppSettings.appAuth.privateKey;
  const passphrase = c.boxAppSettings.appAuth.passphrase;
  const keyId      = c.boxAppSettings.appAuth.publicKeyID;

  const assertion = jwt.sign(claims, { key: privateKey, passphrase }, {
    algorithm: 'RS256',
    keyid: keyId,
  });

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
      client_id:     c.boxAppSettings.clientID,
      client_secret: c.boxAppSettings.clientSecret,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'Failed to get Box token');
  return data.access_token;
}

async function boxRequest(method: string, endpoint: string, body?: any) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.box.com/2.0${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  return await res.json();
}

export async function createBoxFolder(name: string, parentFolderId: string = '0') {
  try {
    const folder = await boxRequest('POST', '/folders', {
      name,
      parent: { id: parentFolderId },
    });
    if (folder?.id) return folder.id;
    if (folder?.status === 409 || folder?.code === 'item_name_in_use') {
      const items = await boxRequest('GET', `/folders/${parentFolderId}/items`);
      const existing = items?.entries?.find((e: any) => e.name === name && e.type === 'folder');
      if (existing) return existing.id;
    }
    return null;
  } catch (err: any) {
    console.error('createBoxFolder error:', err.message);
    return null;
  }
}

export async function createProjectFolders(projectName: string) {
  const rootFolderId = process.env.BOX_ROOT_FOLDER_ID || '0';
  const projectFolderId = await createBoxFolder(projectName, rootFolderId);
  const [videosFolderId, photosFolderId, documentsFolderId] = await Promise.all([
    createBoxFolder('Videos',    projectFolderId || '0'),
    createBoxFolder('Photos',    projectFolderId || '0'),
    createBoxFolder('Documents', projectFolderId || '0'),
  ]);
  return { projectFolderId, videosFolderId, photosFolderId, documentsFolderId };
}

export async function uploadToBox(fileBuffer: Buffer, fileName: string, folderId: string, mimeType: string) {
  const token = await getAccessToken();
  const FormData = require('form-data');
  const form = new FormData();

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext        = fileName.includes('.') ? '.' + fileName.split('.').pop() : '';
  const base       = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
  const uniqueName = `${base}_${timestamp}${ext}`;

  form.append('attributes', JSON.stringify({
    name:   uniqueName,
    parent: { id: folderId },
  }));
  form.append('file', fileBuffer, {
    filename:    fileName,
    contentType: mimeType,
    knownLength: fileBuffer.length,
  });

  const res = await fetch('https://upload.box.com/api/2.0/files/content', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data.entries[0];
}

export async function getBoxEmbedUrl(fileId: string) {
  const data = await boxRequest('GET', `/files/${fileId}?fields=expiring_embed_link`);
  return data?.expiring_embed_link?.url;
}

export async function getBoxDownloadUrl(fileId: string) {
  const token = await getAccessToken();
  const res = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
    redirect: 'follow',
  });
  return res.url;
}

export async function deleteBoxFile(fileId: string) {
  await boxRequest('DELETE', `/files/${fileId}`);
}

export async function listBoxFolder(folderId: string) {
  const data = await boxRequest('GET', `/folders/${folderId}/items`);
  return data?.entries || [];
}
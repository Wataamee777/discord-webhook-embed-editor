// 最大フィールド数
const MAX_FIELDS = 5;

const form = document.getElementById('embedForm');
const fieldsContainer = document.getElementById('fieldsContainer');
const addFieldBtn = document.getElementById('addFieldBtn');
const previewArea = document.getElementById('previewArea');

const saveLocalBtn = document.getElementById('saveLocalBtn');
const loadLocalBtn = document.getElementById('loadLocalBtn');
const genUrlBtn = document.getElementById('genUrlBtn');
const shareUrlArea = document.getElementById('shareUrl');

function createField(name = '', value = '') {
  const div = document.createElement('div');
  div.className = 'fieldPair';
  div.style.marginBottom = '8px';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'フィールド名';
  nameInput.className = 'fieldName';
  nameInput.value = name;
  nameInput.style.width = '40%';
  nameInput.style.marginRight = '10px';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = 'フィールド値';
  valueInput.className = 'fieldValue';
  valueInput.value = value;
  valueInput.style.width = '55%';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.style.marginLeft = '8px';
  removeBtn.onclick = () => {
    fieldsContainer.removeChild(div);
    updatePreview();
  };

  div.appendChild(nameInput);
  div.appendChild(valueInput);
  div.appendChild(removeBtn);

  // 変更時にプレビュー更新
  nameInput.addEventListener('input', updatePreview);
  valueInput.addEventListener('input', updatePreview);

  return div;
}

function getFields() {
  const names = [...document.querySelectorAll('.fieldName')].map(i => i.value.trim());
  const values = [...document.querySelectorAll('.fieldValue')].map(i => i.value.trim());
  const fields = [];
  for(let i=0; i<names.length; i++) {
    if(names[i] && values[i]) fields.push({ name: names[i], value: values[i] });
  }
  return fields;
}

function updatePreview() {
  const embed = buildEmbedData();
  previewArea.textContent = JSON.stringify(embed, null, 2);
}

function buildEmbedData() {
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const colorRaw = document.getElementById('color').value.trim();
  let color = 0xffffff;
  if(colorRaw) {
    // カラーピッカーの値は #RRGGBB形式なので、#を除去して16進数パース
    if(colorRaw.startsWith('#')) {
      color = parseInt(colorRaw.substring(1), 16);
    } else {
      color = parseInt(colorRaw, 10);
    }
    if(isNaN(color)) color = 0xffffff;
  }
  const iconImage = document.getElementById('iconImage').value.trim();
  const thumbnailImage = document.getElementById('thumbnailImage').value.trim();
  const fields = getFields();

  const embed = {};
  if(title) embed.title = title;
  if(description) embed.description = description;
  embed.color = color;
  if(iconImage) embed.footer = { icon_url: iconImage, text: '' };
  if(thumbnailImage) embed.thumbnail = { url: thumbnailImage };
  if(fields.length) embed.fields = fields;

  return embed;
}

function collectFormData() {
  return {
    webhookUrl: document.getElementById('webhookUrl').value.trim(),
    embed: buildEmbedData(),
  };
}

function setFormData(data) {
  if(!data) return;
  if(data.webhookUrl) document.getElementById('webhookUrl').value = data.webhookUrl;

  const e = data.embed || {};
  document.getElementById('title').value = e.title || '';
  document.getElementById('description').value = e.description || '';
  // カラーは16進数文字列化してセット
  if(e.color !== undefined) {
    document.getElementById('color').value = '#' + e.color.toString(16).padStart(6, '0');
  } else {
    document.getElementById('color').value = '#ffffff';
  }

  document.getElementById('iconImage').value = e.footer?.icon_url || '';
  document.getElementById('thumbnailImage').value = e.thumbnail?.url || '';

  // フィールドクリア
  while(fieldsContainer.firstChild) fieldsContainer.removeChild(fieldsContainer.firstChild);

  if(e.fields && Array.isArray(e.fields)) {
    e.fields.slice(0, MAX_FIELDS).forEach(f => {
      fieldsContainer.appendChild(createField(f.name, f.value));
    });
  }
  updatePreview();
}

function encodeData(data) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decodeData(str) {
  return JSON.parse(decodeURIComponent(atob(str)));
}

// URLパラメータから復元
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dataParam = params.get('data');
  if(dataParam) {
    try {
      const data = decodeData(dataParam);
      setFormData(data);
      console.log('URLパラメータから復元成功');
    } catch(e) {
      console.error('URLパラメータ復元失敗', e);
    }
  }
}

// localStorage保存
function saveToLocal() {
  const data = collectFormData();
  localStorage.setItem('embedEditorData', JSON.stringify(data));
  alert('localStorageに保存しました！');
}

// localStorage読み込み
function loadFromLocal() {
  const raw = localStorage.getItem('embedEditorData');
  if(raw) {
    try {
      const data = JSON.parse(raw);
      setFormData(data);
      alert('localStorageから読み込みました！');
    } catch(e) {
      alert('localStorageの読み込みに失敗しました');
    }
  } else {
    alert('保存データがありません');
  }
}

// 共有用URL生成
function genShareUrl() {
  const data = collectFormData();
  const encoded = encodeData(data);
  const baseUrl = location.origin + location.pathname;
  const url = `${baseUrl}?data=${encoded}`;
  shareUrlArea.value = url;
}

// Webhook送信
async function sendWebhook() {
  const data = collectFormData();
  if(!data.webhookUrl) {
    alert('Webhook URLを入力してください');
    return;
  }

  const body = {
    embeds: [data.embed],
  };

  try {
    const res = await fetch(data.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if(res.ok) {
      alert('送信成功！');
    } else {
      alert('送信失敗: ' + res.statusText);
    }
  } catch(e) {
    alert('送信エラー: ' + e.message);
  }
}

// 初期セットアップ
function init() {
  // 最初はフィールド1個置く
  if(fieldsContainer.children.length === 0) {
    fieldsContainer.appendChild(createField());
  }
  updatePreview();

  addFieldBtn.addEventListener('click', () => {
    if(fieldsContainer.children.length < MAX_FIELDS) {
      fieldsContainer.appendChild(createField());
      updatePreview();
    } else {
      alert(`フィールドは最大${MAX_FIELDS}個までです`);
    }
  });

  form.addEventListener('input', updatePreview);

  form.addEventListener('submit', e => {
    e.preventDefault();
    sendWebhook();
  });

  saveLocalBtn.addEventListener('click', saveToLocal);
  loadLocalBtn.addEventListener('click', loadFromLocal);
  genUrlBtn.addEventListener('click', genShareUrl);

  loadFromUrl();
}

init();

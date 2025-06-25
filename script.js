let currentAlbum = [];
let currentIndex = 0;

async function searchVideos() {
  const genre = document.getElementById('genre').value.trim();
  if (!genre) return alert('Введите жанр!');
  const container = document.getElementById('albums');
  container.innerHTML = '🔄 Поиск видео...';

  const url = `https://archive.org/advancedsearch.php?q=subject:${encodeURIComponent(genre)}+AND+mediatype:movies&fl[]=identifier,title,creator,description&rows=200&sort[]=downloads+desc&output=json`;

  const res = await fetch(url);
  const data = await res.json();
  const albums = data.response.docs;
  container.innerHTML = '';

  if (albums.length === 0) {
    container.innerHTML = '❌ Видео не найдено.';
    return;
  }

  for (const album of albums) {
    const div = document.createElement('div');
    div.className = 'album';
    div.innerHTML = `
      <b>${album.title || album.identifier}</b><br>
      👤 ${album.creator || 'Неизвестный автор'}<br>
      📝 ${album.description ? album.description.slice(0, 200) + '...' : 'Нет описания'}<br>
      🔽 Нажмите, чтобы раскрыть видео...
    `;
    div.onclick = () => loadVideoTracks(album.identifier, div);
    container.appendChild(div);
  }
}

async function loadVideoTracks(identifier, container) {
  const res = await fetch(`https://archive.org/metadata/${identifier}`);
  const data = await res.json();
  const files = data.files;

  const videoFiles = files.filter(f => /\.(mp4|webm|ogv)$/i.test(f.name));
  const imageFile = files.find(f => /\.(jpg|jpeg)$/i.test(f.name));
  const base = `https://archive.org/download/${identifier}/`;

  let html = '<div style="margin-top:10px;">';
  if (imageFile) {
    html += `<img src="${base + imageFile.name}" alt="Обложка">`;
  }

  if (videoFiles.length === 0) {
    html += '❌ Нет видеофайлов.';
  } else {
    html += '<div>🎬 Видео:</div>';
    currentAlbum = videoFiles.map(f => ({ name: f.name, url: base + f.name }));
    videoFiles.forEach((file, i) => {
      html += `<div class="track" onclick="openModal(${i})">${file.name}</div>`;
    });
  }

  html += '</div>';
  container.innerHTML += html;
  container.onclick = null;
}

function openModal(index) {
  currentIndex = index;
  const video = currentAlbum[index];
  const player = document.getElementById('modal-player');

  document.getElementById('modal-title').textContent = video.name;
  player.src = video.url;
  player.play();

  document.getElementById('modal-download').href = video.url;
  document.getElementById('modal-download').download = video.name;
  document.getElementById('modal').style.display = 'flex';

  player.onended = () => {
    if (currentIndex < currentAlbum.length - 1) {
      nextVideo();
    }
  };
}

function prevVideo() {
  if (currentAlbum.length === 0) return;
  currentIndex = (currentIndex - 1 + currentAlbum.length) % currentAlbum.length;
  openModal(currentIndex);
}

function nextVideo() {
  if (currentAlbum.length === 0) return;
  currentIndex = (currentIndex + 1) % currentAlbum.length;
  openModal(currentIndex);
}

function closeModal(event) {
  document.getElementById('modal-player').pause();
  document.getElementById('modal').style.display = 'none';
}

function shareVideo() {
  const video = currentAlbum[currentIndex];
  const url = new URL(window.location.href);
  url.searchParams.set('album', video.url.split('/')[4]);
  url.searchParams.set('video', video.name);

  navigator.clipboard.writeText(url.toString())
    .then(() => {
      document.getElementById('share-status').textContent = '✅ Ссылка скопирована!';
      setTimeout(() => {
        document.getElementById('share-status').textContent = '';
      }, 3000);
    })
    .catch(() => {
      document.getElementById('share-status').textContent = '❌ Не удалось скопировать.';
    });
}

// автооткрытие по ссылке
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const album = params.get('album');
  const videoName = params.get('video');

  if (album && videoName) {
    fetch(`https://archive.org/metadata/${album}`)
      .then(res => res.json())
      .then(data => {
        const base = `https://archive.org/download/${album}/`;
        const videoFiles = data.files.filter(f => /\.(mp4|webm|ogv)$/i.test(f.name));
        currentAlbum = videoFiles.map(f => ({ name: f.name, url: base + f.name }));
        const index = currentAlbum.findIndex(f => f.name === videoName);
        if (index !== -1) {
          openModal(index);
        } else {
          alert("🎞 Видео не найдено в альбоме.");
        }
      });
  }
});
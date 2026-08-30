/* =========================================================
   AIALAN — PROFILE COVER PHOTO FEATURE
   Independent feature file
   ========================================================= */

(function () {
  'use strict';

  const COVER_KEY = 'aiallan_profile_cover_v1';

  /* ---------- STORAGE ---------- */

  function saveCover(dataUrl) {
    try {
      localStorage.setItem(COVER_KEY, dataUrl);
      return true;
    } catch (e) {
      console.warn('Cover photo save failed:', e);
      return false;
    }
  }

  function loadCover() {
    try {
      return localStorage.getItem(COVER_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  /* ---------- STYLE ---------- */

  function addStyles() {
    if (document.getElementById('coverFeatureStyles')) return;

    const style = document.createElement('style');
    style.id = 'coverFeatureStyles';

    style.textContent = `
      .aiallan-cover {
        width: 100%;
        aspect-ratio: 820 / 312;
        min-height: 150px;
        max-height: 320px;
        background: rgba(20,18,28,.75);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        border-radius: 18px;
        margin: 0 auto 18px;
        overflow: hidden;
        position: relative;
        border: 1px solid rgba(255,255,255,.12);
      }

      .aiallan-cover-empty {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255,255,255,.35);
        font-size: 13px;
      }

      .cover-admin-box {
        margin: 12px 0;
        padding: 14px;
        border-radius: 14px;
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.1);
      }

      .cover-admin-title {
        font-weight: 700;
        margin-bottom: 10px;
      }

      .cover-admin-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .cover-admin-row button,
      .cover-admin-row label {
        flex: 1;
        min-width: 120px;
        padding: 11px 14px;
        border: 0;
        border-radius: 10px;
        cursor: pointer;
        text-align: center;
      }

      .cover-upload-label {
        background: linear-gradient(90deg,#ff2d70,#9b5cff);
        color: white;
      }

      .cover-remove-btn {
        background: rgba(255,255,255,.1);
        color: white;
      }

      #coverUploadInput {
        display: none;
      }
    `;

    document.head.appendChild(style);
  }

  /* ---------- PUBLIC COVER ---------- */

  function createCover() {
    if (document.getElementById('aiallanCover')) return;

    const home = document.getElementById('homePage');
    if (!home) return;

    const profile = home.querySelector('.profile');
    if (!profile) return;

    const cover = document.createElement('div');
    cover.id = 'aiallanCover';
    cover.className = 'aiallan-cover';

    const saved = loadCover();

    if (saved) {
      cover.style.backgroundImage = `url("${saved}")`;
      cover.innerHTML = '';
    } else {
      cover.innerHTML =
        '<div class="aiallan-cover-empty">Profile Cover Photo</div>';
    }

    profile.parentNode.insertBefore(cover, profile);

    window.updateAiallanCover = function (dataUrl) {
      if (!dataUrl) {
        cover.style.backgroundImage = '';
        cover.innerHTML =
          '<div class="aiallan-cover-empty">Profile Cover Photo</div>';
        return;
      }

      cover.innerHTML = '';
      cover.style.backgroundImage = `url("${dataUrl}")`;
    };
  }

  /* ---------- ADMIN CONTROLS ---------- */

  function createAdminControls() {
    if (document.getElementById('coverAdminBox')) return;

    /*
      We try to place this inside the existing admin panel.
      It will look for common admin containers first.
    */

    const adminPanel =
      document.querySelector('.admin-panel') ||
      document.querySelector('.admin-content') ||
      document.querySelector('.admin-modal') ||
      document.querySelector('.modal-box');

    if (!adminPanel) {
      console.warn('Cover feature: admin panel not found yet.');
      return;
    }

    const box = document.createElement('div');
    box.id = 'coverAdminBox';
    box.className = 'cover-admin-box';

    box.innerHTML = `
      <div class="cover-admin-title">
        🖼️ Profile Cover Photo
      </div>

      <div class="cover-admin-row">

        <label
          class="cover-upload-label"
          for="coverUploadInput">
          Upload Cover Photo
        </label>

        <input
          type="file"
          id="coverUploadInput"
          accept="image/*">

        <button
          type="button"
          class="cover-remove-btn"
          id="coverRemoveBtn">
          Remove Cover
        </button>

      </div>
    `;

    adminPanel.appendChild(box);

    const input = document.getElementById('coverUploadInput');
    const removeBtn = document.getElementById('coverRemoveBtn');

    input.addEventListener('change', function () {
      const file = this.files && this.files[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image.');
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        const dataUrl = event.target.result;

        if (saveCover(dataUrl)) {
          if (window.updateAiallanCover) {
            window.updateAiallanCover(dataUrl);
          }

          alert('✅ Cover photo saved!');
        } else {
          alert('⚠️ Cover photo could not be saved.');
        }
      };

      reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', function () {
      try {
        localStorage.removeItem(COVER_KEY);
      } catch (e) {}

      if (window.updateAiallanCover) {
        window.updateAiallanCover('');
      }

      alert('Cover photo removed.');
    });
  }

  /* ---------- START ---------- */

  function initCoverFeature() {
    addStyles();
    createCover();
    createAdminControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoverFeature);
  } else {
    initCoverFeature();
  }

})();

/* =========================================================
   AIALAN — PROFILE COVER PHOTO
   Separate feature file
   ========================================================= */

(() => {
  'use strict';

  const COVER_KEY = 'aiallan_profile_cover_v1';

  // ---------- Storage ----------
  function getCover() {
    try {
      return localStorage.getItem(COVER_KEY) || '';
    } catch (e) {
      console.warn('[Cover] Cannot read cover:', e);
      return '';
    }
  }

  function saveCover(data) {
    try {
      localStorage.setItem(COVER_KEY, data);
      return true;
    } catch (e) {
      console.warn('[Cover] Cannot save cover:', e);
      return false;
    }
  }

  // ---------- Create public cover ----------
  function createPublicCover() {
    if (document.getElementById('aiallanProfileCover')) return;

    const profile = document.querySelector('.profile');
    if (!profile) return;

    const cover = document.createElement('div');
    cover.id = 'aiallanProfileCover';

    cover.innerHTML = `
      <div class="aiallan-cover-image"></div>
    `;

    // Put cover behind the profile content
    profile.parentNode.insertBefore(cover, profile);

    const image = cover.querySelector('.aiallan-cover-image');
    const saved = getCover();

    if (saved) {
      image.style.backgroundImage = `url("${saved}")`;
      cover.classList.add('has-cover');
    }
  }

  // ---------- Create admin controls ----------
  function createAdminCoverControl() {
    if (document.getElementById('aiallanCoverAdmin')) return;

    // Find the existing admin Profile tab content
    const adminName = document.getElementById('adminName');
    if (!adminName) return;

    const nameInput = adminName;

    // Existing avatar file input is normally before adminName
    const avatarInput =
      document.querySelector('input[type="file"]');

    const box = document.createElement('div');
    box.id = 'aiallanCoverAdmin';

    box.innerHTML = `
      <div class="cover-admin-title">
        🖼️ Cover Photo
      </div>

      <div class="cover-admin-preview" id="aiallanCoverPreview">
        <span>No cover photo selected</span>
      </div>

      <label class="cover-file-picker">
        Choose Cover Photo
        <input
          type="file"
          id="aiallanCoverInput"
          accept="image/jpeg,image/png,image/webp"
          hidden
        >
      </label>

      <button
        type="button"
        id="aiallanRemoveCover"
        class="btn btn-gray cover-remove-btn"
      >
        Remove Cover
      </button>
    `;

    /*
      Put the new section directly before the Name field.
      This keeps the existing Profile UI untouched.
    */
    nameInput.parentNode.insertBefore(box, nameInput);

    const input = document.getElementById('aiallanCoverInput');
    const preview = document.getElementById('aiallanCoverPreview');
    const removeBtn = document.getElementById('aiallanRemoveCover');

    const saved = getCover();

    if (saved) {
      showAdminPreview(saved);
    }

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        input.value = '';
        return;
      }

      try {
        const data = await resizeCover(file);

        if (!saveCover(data)) {
          alert('Cover photo could not be saved.');
          return;
        }

        showAdminPreview(data);
        updatePublicCover(data);

        alert('✅ Cover Photo Saved!');
      } catch (e) {
        console.error('[Cover] Upload failed:', e);
        alert('⚠️ Cover photo upload failed.');
      }
    });

    removeBtn.addEventListener('click', () => {
      try {
        localStorage.removeItem(COVER_KEY);
      } catch (e) {}

      preview.innerHTML = '<span>No cover photo selected</span>';

      const cover = document.getElementById('aiallanProfileCover');
      if (cover) {
        cover.classList.remove('has-cover');

        const image = cover.querySelector('.aiallan-cover-image');
        if (image) image.style.backgroundImage = '';
      }

      input.value = '';

      alert('Cover Photo removed.');
    });
  }

  // ---------- Image resize ----------
  function resizeCover(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const MAX_WIDTH = 1640;
          const MAX_HEIGHT = 720;

          let width = img.width;
          let height = img.height;

          const scale = Math.min(
            1,
            MAX_WIDTH / width,
            MAX_HEIGHT / height
          );

          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');

          ctx.drawImage(
            img,
            0,
            0,
            width,
            height
          );

          // JPEG keeps storage size much smaller
          const result = canvas.toDataURL(
            'image/jpeg',
            0.82
          );

          resolve(result);
        };

        img.onerror = reject;
        img.src = reader.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ---------- Admin preview ----------
  function showAdminPreview(data) {
    const preview =
      document.getElementById('aiallanCoverPreview');

    if (!preview) return;

    preview.innerHTML = `
      <img src="${data}" alt="Cover Preview">
    `;
  }

  // ---------- Public cover ----------
  function updatePublicCover(data) {
    const cover =
      document.getElementById('aiallanProfileCover');

    if (!cover) return;

    const image =
      cover.querySelector('.aiallan-cover-image');

    if (!image) return;

    image.style.backgroundImage = `url("${data}")`;
    cover.classList.add('has-cover');
  }

  // ---------- CSS ----------
  function addStyles() {
    if (document.getElementById('aiallanCoverStyles')) return;

    const style = document.createElement('style');
    style.id = 'aiallanCoverStyles';

    style.textContent = `
      /* =========================
         PUBLIC COVER
         ========================= */

      #aiallanProfileCover {
        width: 100%;
        height: 0;
        overflow: hidden;
        position: relative;
        margin: 0 auto;
        transition: height .3s ease;
      }

      #aiallanProfileCover.has-cover {
        height: 260px;
      }

      #aiallanProfileCover .aiallan-cover-image {
        position: absolute;
        inset: 0;

        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;

        background-color: #17131d;
      }

      #aiallanProfileCover .aiallan-cover-image::after {
        content: "";
        position: absolute;
        inset: 0;

        background:
          linear-gradient(
            to bottom,
            rgba(0,0,0,.08),
            rgba(0,0,0,.45)
          );
      }


      /* =========================
         ADMIN COVER
         ========================= */

      #aiallanCoverAdmin {
        width: 100%;
        margin: 0 0 16px;
        padding: 14px;

        box-sizing: border-box;

        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;

        background: rgba(255,255,255,.035);
      }

      .cover-admin-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 10px;
      }

      .cover-admin-preview {
        width: 100%;
        height: 125px;

        overflow: hidden;
        border-radius: 12px;

        display: flex;
        align-items: center;
        justify-content: center;

        margin-bottom: 10px;

        background: #18151d;
        color: #888;
        font-size: 13px;
      }

      .cover-admin-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .cover-file-picker {
        display: flex;
        align-items: center;
        justify-content: center;

        width: 100%;
        min-height: 48px;

        box-sizing: border-box;

        border-radius: 12px;

        background: linear-gradient(
          90deg,
          #ff278b,
          #a84cff
        );

        color: white;
        font-weight: 700;

        cursor: pointer;

        margin-bottom: 8px;
      }

      .cover-remove-btn {
        width: 100%;
      }


      /* =========================
         MOBILE
         ========================= */

      @media (max-width: 600px) {
        #aiallanProfileCover.has-cover {
          height: 190px;
        }

        .cover-admin-preview {
          height: 105px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ---------- Initialize ----------
  function init() {
    addStyles();

    createPublicCover();

    /*
      Admin panel can be rendered dynamically,
      so try several times.
    */
    createAdminCoverControl();

    setTimeout(createAdminCoverControl, 500);
    setTimeout(createAdminCoverControl, 1200);
    setTimeout(createAdminCoverControl, 2500);

    const observer = new MutationObserver(() => {
      createPublicCover();
      createAdminCoverControl();

      const saved = getCover();

      if (saved) {
        updatePublicCover(saved);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

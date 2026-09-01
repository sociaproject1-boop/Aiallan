/* =========================================================
   AIALAN PROFILE COVER
   Facebook-style cover sizing / positioning
   No face overlay
   No unnecessary top space
   Keeps cover text visible
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'aiallan_profile_cover';

  let coverDataUrl = null;

  /* ---------------------------------------------------------
     Inject CSS
     --------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById('aiallan-cover-style')) return;

    const style = document.createElement('style');
    style.id = 'aiallan-cover-style';

    style.textContent = `
      /* COVER CONTAINER */

      .profile-cover,
      #profileCover,
      #coverPhoto,
      .cover-photo {
        width: 100%;
        aspect-ratio: 2.63 / 1;
        min-height: 0 !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        position: relative;
        overflow: hidden;
        background: #09070f;
        box-sizing: border-box;
      }

      /* COVER IMAGE */

      .profile-cover img,
      #profileCover img,
      #coverPhoto img,
      .cover-photo img {
        width: 100% !important;
        height: 100% !important;
        display: block !important;

        /*
          Facebook-style behavior:
          fill the complete cover area without
          creating blank space above/below.
        */
        object-fit: cover !important;
        object-position: center center !important;

        margin: 0 !important;
        padding: 0 !important;
      }

      /* Prevent accidental extra spacing */

      .profile-cover-wrapper,
      .cover-wrapper,
      .cover-container {
        width: 100%;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 0;
      }

      /* Mobile */

      @media (max-width: 600px) {
        .profile-cover,
        #profileCover,
        #coverPhoto,
        .cover-photo {
          aspect-ratio: 2.63 / 1;
          width: 100%;
        }

        .profile-cover img,
        #profileCover img,
        #coverPhoto img,
        .cover-photo img {
          object-fit: cover !important;
          object-position: center center !important;
        }
      }

      /* Desktop */

      @media (min-width: 601px) {
        .profile-cover,
        #profileCover,
        #coverPhoto,
        .cover-photo {
          aspect-ratio: 2.63 / 1;
        }
      }

      /* Hide cover completely when there is no image */

      .aiallan-cover-empty {
        display: none !important;
      }

      /*
        IMPORTANT:
        Don't let the avatar/profile information
        push the cover upward/downward.
      */

      .profile-cover + .profile,
      .profile-cover + .profile-header {
        margin-top: 0;
      }
    `;

    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------
     Find existing cover container
     --------------------------------------------------------- */
  function getCoverContainer() {
    return (
      document.querySelector('.profile-cover') ||
      document.getElementById('profileCover') ||
      document.getElementById('coverPhoto') ||
      document.querySelector('.cover-photo')
    );
  }

  /* ---------------------------------------------------------
     Create cover if none exists
     --------------------------------------------------------- */
  function ensureCoverContainer() {
    let container = getCoverContainer();

    if (container) return container;

    /*
      Find the main profile/home area.
    */
    const home =
      document.querySelector('.home') ||
      document.querySelector('.profile')?.parentElement ||
      document.body;

    container = document.createElement('div');

    container.id = 'profileCover';
    container.className = 'profile-cover';

    /*
      Put cover at the very beginning so it doesn't
      create strange blank space.
    */
    home.insertBefore(container, home.firstChild);

    return container;
  }

  /* ---------------------------------------------------------
     Render cover
     --------------------------------------------------------- */
  function renderCover(url) {
    const container = ensureCoverContainer();

    if (!url) {
      container.innerHTML = '';
      container.classList.add('aiallan-cover-empty');
      return;
    }

    container.classList.remove('aiallan-cover-empty');

    container.innerHTML = '';

    const img = document.createElement('img');

    img.src = url;
    img.alt = 'Profile Cover';
    img.loading = 'eager';
    img.decoding = 'async';

    container.appendChild(img);
  }

  /* ---------------------------------------------------------
     File -> Data URL
     --------------------------------------------------------- */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No cover image selected.'));
        return;
      }

      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select an image file.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        resolve(event.target.result);
      };

      reader.onerror = function () {
        reject(new Error('Unable to read the cover image.'));
      };

      reader.readAsDataURL(file);
    });
  }

  /* ---------------------------------------------------------
     Upload / Preview
     --------------------------------------------------------- */
  async function handleCoverUpload(input) {
    const file = input?.files?.[0];

    if (!file) return;

    try {
      const url = await readFile(file);

      coverDataUrl = url;

      /*
        Required by index.html:
        state.profile.cover =
          window.profileCoverDataUrl || null;
      */
      window.profileCoverDataUrl = url;

      renderCover(url);

      /*
        Try to save immediately if the existing site
        already exposes saveStateToDB().
      */
      if (typeof window.saveStateToDB === 'function') {
        try {
          await window.saveStateToDB();
        } catch (err) {
          console.warn(
            '[AIALAN COVER] Auto-save failed:',
            err
          );
        }
      }

      /*
        Local fallback.
      */
      try {
        localStorage.setItem(STORAGE_KEY, url);
      } catch (err) {
        console.warn(
          '[AIALAN COVER] Local storage unavailable.',
          err
        );
      }

      updateUploadStatus('Cover photo updated ✓');

    } catch (err) {
      console.error('[AIALAN COVER]', err);
      updateUploadStatus(
        err.message || 'Cover upload failed.'
      );
    }
  }

  /* ---------------------------------------------------------
     Status text
     --------------------------------------------------------- */
  function updateUploadStatus(message) {
    const status =
      document.getElementById('coverUploadStatus');

    if (status) {
      status.textContent = message;
    }
  }

  /* ---------------------------------------------------------
     Add upload button to admin panel
     --------------------------------------------------------- */
  function createAdminUploader() {
    /*
      Don't create duplicate uploader.
    */
    if (document.getElementById('aiallanCoverUploader')) {
      return;
    }

    /*
      Find Profile tab.
    */
    const profileTab =
      document.getElementById('tab-profile') ||
      document.querySelector('[data-tab="profile"]')?.parentElement;

    if (!profileTab) {
      return;
    }

    const box = document.createElement('div');

    box.id = 'aiallanCoverUploader';

    box.style.cssText = `
      margin:14px 0;
      padding:12px;
      border:1px solid rgba(255,255,255,.12);
      border-radius:12px;
      background:#151219;
    `;

    box.innerHTML = `
      <div style="
        font-weight:700;
        font-size:13px;
        margin-bottom:8px;
      ">
        🖼️ Cover Photo
      </div>

      <div style="
        color:#aaa;
        font-size:11px;
        margin-bottom:10px;
        line-height:1.4;
      ">
        Facebook-style cover. The image automatically fills
        the cover area without creating extra space.
      </div>

      <input
        type="file"
        id="aiallanCoverFile"
        accept="image/*"
        style="
          display:block;
          width:100%;
          box-sizing:border-box;
          padding:8px;
          border-radius:8px;
          background:#171717;
          color:#ddd;
          border:1px solid #333;
        "
      >

      <div
        id="coverUploadStatus"
        style="
          margin-top:7px;
          font-size:11px;
          color:#aaa;
        "
      >
        Ready
      </div>
    `;

    /*
      Put uploader near the beginning of Profile panel.
    */
    profileTab.insertBefore(
      box,
      profileTab.firstChild
    );

    const input =
      document.getElementById('aiallanCoverFile');

    if (input) {
      input.addEventListener('change', function () {
        handleCoverUpload(this);
      });
    }
  }

  /* ---------------------------------------------------------
     Load saved cover
     --------------------------------------------------------- */
  function loadSavedCover() {

    /*
      First priority:
      value loaded from Supabase/index.html.
    */
    if (window.profileCoverDataUrl) {
      coverDataUrl = window.profileCoverDataUrl;
      renderCover(coverDataUrl);
      return;
    }

    /*
      Local fallback.
    */
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (saved) {
        coverDataUrl = saved;

        window.profileCoverDataUrl = saved;

        renderCover(saved);
      }
    } catch (err) {
      console.warn(
        '[AIALAN COVER] Could not load local cover.',
        err
      );
    }
  }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */
  window.ProfileCover = {

    set: function (url) {
      coverDataUrl = url || null;

      window.profileCoverDataUrl =
        coverDataUrl;

      renderCover(coverDataUrl);

      if (coverDataUrl) {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            coverDataUrl
          );
        } catch (err) {}
      }
    },

    get: function () {
      return (
        window.profileCoverDataUrl ||
        coverDataUrl ||
        null
      );
    },

    upload: handleCoverUpload,

    refresh: function () {
      renderCover(
        window.profileCoverDataUrl ||
        coverDataUrl ||
        null
      );
    }
  };

  /* ---------------------------------------------------------
     Initialize
     --------------------------------------------------------- */
  function init() {
    injectStyles();

    /*
      Wait a little because the existing index.js
      may still be building the homepage/admin UI.
    */
    setTimeout(function () {
      createAdminUploader();
      loadSavedCover();
    }, 300);

    /*
      Run again after DOMContentLoaded.
    */
    document.addEventListener(
      'DOMContentLoaded',
      function () {
        injectStyles();
        createAdminUploader();
        loadSavedCover();
      },
      { once: true }
    );
  }

  init();

})();

/* =========================================================
   AIALAN — PROFILE COVER PHOTO
   Separate feature file
   ========================================================= */

(() => {
  "use strict";

  const DB_NAME = "aiallan-cover-db";
  const DB_VERSION = 1;
  const STORE = "settings";
  const KEY = "profileCover";

  const css = `
    .aiallan-cover-admin {
      margin: 0 0 18px;
      padding: 14px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 16px;
      background: rgba(255,255,255,.035);
    }

    .aiallan-cover-admin h3 {
      margin: 0 0 10px;
      font-size: 16px;
    }

    .aiallan-cover-preview {
      width: 100%;
      aspect-ratio: 820 / 312;
      min-height: 120px;
      max-height: 260px;
      border-radius: 14px;
      overflow: hidden;
      background: linear-gradient(135deg,#15101e,#09070d);
      border: 1px solid rgba(255,255,255,.1);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }

    .aiallan-cover-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .aiallan-cover-empty {
      opacity: .6;
      font-size: 14px;
      text-align: center;
      padding: 20px;
    }

    .aiallan-cover-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .aiallan-cover-actions label,
    .aiallan-cover-actions button {
      border: 0;
      border-radius: 10px;
      padding: 10px 14px;
      font: inherit;
      cursor: pointer;
    }

    .aiallan-cover-actions label {
      background: linear-gradient(90deg,#ff2f87,#9c4dff);
      color: #fff;
    }

    .aiallan-cover-actions button {
      background: #24202d;
      color: #fff;
    }

    .aiallan-cover-file {
      display: none;
    }

    .aiallan-cover-status {
      margin-top: 8px;
      font-size: 12px;
      opacity: .7;
    }

    .aiallan-public-cover {
      position: absolute;
      inset: 0 0 auto 0;
      height: 100%;
      min-height: 180px;
      background-size: cover;
      background-position: center;
      pointer-events: none;
    }

    .aiallan-public-cover:after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(5,3,10,.08),
        rgba(5,3,10,.78)
      );
    }

    .aiallan-cover-host {
      position: relative;
      overflow: hidden;
    }

    .aiallan-cover-host > *:not(.aiallan-public-cover) {
      position: relative;
      z-index: 1;
    }
  `;

  function addCSS() {
    if (document.getElementById("aiallan-cover-css")) return;

    const style = document.createElement("style");
    style.id = "aiallan-cover-css";
    style.textContent = css;

    document.head.appendChild(style);
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          request.result.createObjectStore(STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveCover(data) {
    try {
      const db = await openDB();

      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).put(data, KEY);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });

      db.close();
    } catch (error) {
      console.warn("[Cover] IndexedDB save failed:", error);

      try {
        if (data === null) {
          localStorage.removeItem("AIALAN_PROFILE_COVER");
        } else {
          localStorage.setItem("AIALAN_PROFILE_COVER", data);
        }
      } catch (_) {}
    }
  }

  async function loadCover() {
    try {
      const db = await openDB();

      const value = await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, "readonly");
        const request = transaction.objectStore(STORE).get(KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

      db.close();

      if (value) return value;
    } catch (error) {
      console.warn("[Cover] IndexedDB load failed:", error);
    }

    try {
      return localStorage.getItem("AIALAN_PROFILE_COVER") || null;
    } catch (_) {
      return null;
    }
  }

  function imageToDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("Please choose an image."));
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("Could not read image."));
      };

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 650;

          const scale = Math.min(
            1,
            maxWidth / image.naturalWidth,
            maxHeight / image.naturalHeight
          );

          const width = Math.max(
            1,
            Math.round(image.naturalWidth * scale)
          );

          const height = Math.max(
            1,
            Math.round(image.naturalHeight * scale)
          );

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext("2d");

          context.drawImage(
            image,
            0,
            0,
            width,
            height
          );

          const result = canvas.toDataURL(
            "image/jpeg",
            0.86
          );

          resolve(result);
        };

        image.onerror = () => {
          reject(new Error("Invalid image."));
        };

        image.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  function findExistingImageInput() {
    return document.querySelector(
      '#avatarFile,' +
      'input[type="file"][accept*="image"],' +
      'input[type="file"]'
    );
  }

  function createAdminUI() {
    if (document.getElementById("aiallanCoverAdmin")) {
      return;
    }

    const avatarInput = findExistingImageInput();

    if (!avatarInput) {
      return;
    }

    const box = document.createElement("div");

    box.id = "aiallanCoverAdmin";
    box.className = "aiallan-cover-admin";

    box.innerHTML = `
      <h3>🖼️ Profile Cover Photo</h3>

      <div
        class="aiallan-cover-preview"
        id="aiallanCoverPreview"
      >
        <div class="aiallan-cover-empty">
          No cover photo selected
        </div>
      </div>

      <div class="aiallan-cover-actions">

        <label for="aiallanCoverFile">
          Choose Cover Photo
        </label>

        <input
          id="aiallanCoverFile"
          class="aiallan-cover-file"
          type="file"
          accept="image/*"
        >

        <button
          type="button"
          id="aiallanCoverRemove"
        >
          Remove Cover
        </button>

      </div>

      <div
        class="aiallan-cover-status"
        id="aiallanCoverStatus"
      >
        Cover photo is saved separately from your existing profile data.
      </div>
    `;

    const parent =
      avatarInput.parentElement &&
      avatarInput.parentElement.parentElement
        ? avatarInput.parentElement.parentElement
        : avatarInput.parentElement;

    if (!parent) return;

    parent.insertAdjacentElement(
      "afterend",
      box
    );

    const input =
      box.querySelector("#aiallanCoverFile");

    const preview =
      box.querySelector("#aiallanCoverPreview");

    const status =
      box.querySelector("#aiallanCoverStatus");

    const removeButton =
      box.querySelector("#aiallanCoverRemove");

    input.addEventListener(
      "change",
      async () => {
        const file =
          input.files &&
          input.files[0];

        if (!file) return;

        try {
          status.textContent =
            "Processing cover photo...";

          const data =
            await imageToDataURL(file);

          await saveCover(data);

          renderPreview(
            preview,
            data
          );

          applyPublicCover(data);

          status.textContent =
            "✓ Cover photo saved.";
        } catch (error) {
          console.error(
            "[Cover] Upload failed:",
            error
          );

          status.textContent =
            "⚠️ " +
            (
              error.message ||
              "Upload failed."
            );
        } finally {
          input.value = "";
        }
      }
    );

    removeButton.addEventListener(
      "click",
      async () => {
        await saveCover(null);

        renderPreview(
          preview,
          null
        );

        removePublicCover();

        status.textContent =
          "Cover photo removed.";
      }
    );

    loadCover().then(
      (data) => {
        renderPreview(
          preview,
          data
        );

        if (data) {
          applyPublicCover(data);
        }
      }
    );
  }

  function renderPreview(
    element,
    data
  ) {
    if (!element) return;

    element.innerHTML = "";

    if (data) {
      const image =
        document.createElement("img");

      image.src = data;
      image.alt =
        "Cover Preview";

      element.appendChild(image);
    } else {
      const empty =
        document.createElement("div");

      empty.className =
        "aiallan-cover-empty";

      empty.textContent =
        "No cover photo selected";

      element.appendChild(empty);
    }
  }

  function findPublicHost() {
    const avatar =
      document.getElementById("dispAvatar");

    if (!avatar) {
      return null;
    }

    let parent =
      avatar.parentElement;

    for (
      let i = 0;
      i < 5 && parent;
      i++,
      parent = parent.parentElement
    ) {
      const rect =
        parent.getBoundingClientRect();

      if (
        rect.width > 280 &&
        rect.height > 180
      ) {
        return parent;
      }
    }

    return avatar.parentElement;
  }

  function applyPublicCover(data) {
    const host =
      findPublicHost();

    if (!host) {
      return;
    }

    host.classList.add(
      "aiallan-cover-host"
    );

    let cover =
      host.querySelector(
        ".aiallan-public-cover"
      );

    if (!cover) {
      cover =
        document.createElement("div");

      cover.className =
        "aiallan-public-cover";

      host.prepend(cover);
    }

    cover.style.backgroundImage =
      data
        ? `url("${data}")`
        : "none";
  }

  function removePublicCover() {
    document
      .querySelectorAll(
        ".aiallan-public-cover"
      )
      .forEach(
        element => element.remove()
      );
  }

  function boot() {
    addCSS();

    let tries = 0;

    const timer =
      setInterval(
        async () => {
          tries++;

          createAdminUI();

          const data =
            await loadCover();

          if (data) {
            applyPublicCover(data);
          }

          if (
            document.getElementById(
              "aiallanCoverAdmin"
            ) ||
            tries > 30
          ) {
            clearInterval(timer);
          }
        },
        500
      );

    const observer =
      new MutationObserver(
        () => {
          createAdminUI();

          loadCover().then(
            data => {
              if (data) {
                applyPublicCover(data);
              }
            }
          );
        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }

})();

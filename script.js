const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");

let selectedFiles = [];

// Click to open file input
dropZone.addEventListener("click", () => fileInput.click());

// On file select via input
fileInput.addEventListener("change", () => {
  const newFiles = Array.from(fileInput.files);

  newFiles.forEach(file => {
    file.hasProgress = false;
  });

  selectedFiles = [...selectedFiles, ...newFiles];
  updateFileInput();
  displayFiles();
});


// Drag & drop support
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const newFiles = Array.from(e.dataTransfer.files);
  newFiles.forEach(file => {
    file.hasProgress = false;
  });

  selectedFiles = [...selectedFiles, ...newFiles];
  updateFileInput();
  displayFiles();
});



function displayFiles() {
  fileList.innerHTML = "";

  selectedFiles.forEach((file, index) => {
    const li = document.createElement("li");

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "remove-btn";
    removeBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // 🛑 Prevents triggering the dropZone click
  selectedFiles.splice(index, 1);
  updateFileInput();
  displayFiles();
});


    const nameSpan = document.createElement("span");
    nameSpan.textContent = file.name;

    const sizeSpan = document.createElement("span");
    sizeSpan.textContent = `${(file.size / 1024).toFixed(2)} KB`;
    sizeSpan.style.marginLeft = "auto";

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-bar-container";
    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar";
    progressContainer.appendChild(progressBar);

    li.appendChild(removeBtn);
    li.appendChild(nameSpan);
    li.appendChild(sizeSpan);

    // ✅ Only add progress bar if not completed
    if (!file.hasProgress) {
      li.appendChild(progressContainer);
      simulateSingleUpload(progressBar, progressContainer);
      file.hasProgress = true; // Mark as simulated
    }

    fileList.appendChild(li);
  });
}



function simulateSingleUpload(bar, container) {
  let progress = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 15 + 10;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      bar.style.width = "100%";

      // Fade out and remove
      setTimeout(() => {
        container.style.opacity = "0";
        setTimeout(() => {
          container.remove();
        }, 500);
      }, 600);
    } else {
      bar.style.width = `${progress}%`;
    }
  }, 200);
}



// Re-sync file input to match selectedFiles array
function updateFileInput() {
  const dataTransfer = new DataTransfer();
  selectedFiles.forEach(file => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
}

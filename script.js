// Firebase configuration - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDVyW9j2ATaANZIyCvrhjAsV5xjzD_DYiY",
  authDomain: "userdata-17ba5.firebaseapp.com",
  projectId: "userdata-17ba5",
  storageBucket: "userdata-17ba5.firebasestorage.app",
  messagingSenderId: "947950784231",
  appId: "1:947950784231:web:f39031c197557ee0a89c42",
  measurementId: "G-T4HBDDBNQ9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// DOM elements
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const uploadForm = document.getElementById("uploadForm");
const authStatus = document.getElementById("authStatus");

// State variables
let selectedFiles = [];
let isAuthenticated = false;
let lastSubmissionTime = 0;

// Initialize anonymous authentication
async function initializeAuth() {
  authStatus.style.display = "block";
  try {
    await auth.signInAnonymously();
    isAuthenticated = true;
    authStatus.textContent = "Ready to upload";
    setTimeout(() => authStatus.style.display = "none", 2000);
  } catch (error) {
    console.error("Auth error:", error);
    authStatus.textContent = "Connection issue - retrying...";
    setTimeout(initializeAuth, 5000);
  }
}

// Initialize when page loads
initializeAuth();

// File handling functions
dropZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const newFiles = Array.from(fileInput.files);
  newFiles.forEach(file => {
    file.hasProgress = false;
  });
  selectedFiles = [...selectedFiles, ...newFiles];
  updateFileInput();
  displayFiles();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

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
      e.stopPropagation();
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

    if (!file.hasProgress) {
      li.appendChild(progressContainer);
      simulateSingleUpload(progressBar, progressContainer);
      file.hasProgress = true;
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

function updateFileInput() {
  const dataTransfer = new DataTransfer();
  selectedFiles.forEach(file => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;
}

// Form submission
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!uploadForm.checkValidity()) {
    alert("Please fill out all required fields correctly");
    return;
  }

  const now = Date.now();
  if (now - lastSubmissionTime < 30000) {
    alert("Please wait 30 seconds between submissions.");
    return;
  }

  if (!isAuthenticated || !auth.currentUser) {
    alert("Not authenticated. Please try again later.");
    return;
  }

  const submitBtn = document.querySelector(".submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  try {
    // Get form values
    const formData = {
      firstName: uploadForm.querySelector('[name="firstName"]').value,
      lastName: uploadForm.querySelector('[name="lastName"]').value,
      email: uploadForm.querySelector('[name="email"]').value,
      phone: uploadForm.querySelector('[name="phone"]').value,
      isApplication: uploadForm.querySelector('[name="appInProcess"]').checked,
      isExistingAccount: uploadForm.querySelector('[name="existingAccount"]').checked,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      anonymousUserId: auth.currentUser.uid
    };

    if (formData.isApplication) {
      formData.applicationType = uploadForm.querySelector('[name="applicationType"]').value;
      formData.referenceNumber = uploadForm.querySelector('[name="referenceNumber"]').value;
    } else if (formData.isExistingAccount) {
      formData.documentReason = uploadForm.querySelector('[name="documentReason"]').value;
      formData.accountLast4 = uploadForm.querySelector('[name="accountLast4"]').value;
    }

    console.log("Creating Firestore document...");
    const docRef = await db.collection("submissions").add(formData);
    console.log("Document created with ID:", docRef.id);

    if (selectedFiles.length > 0) {
      console.log("Uploading files to Storage...");
      const uploadPromises = selectedFiles.map(file => {
        const storageRef = storage.ref(`submissions/${docRef.id}/${file.name}`);
        return storageRef.put(file).then(snapshot => {
          console.log(`Uploaded file: ${file.name}`);
          return snapshot.ref.getDownloadURL().then(downloadURL => {
            return {
              name: file.name,
              url: downloadURL,
              size: file.size,
              type: file.type
            };
          });
        }).catch(storageError => {
          console.error(`Storage error for ${file.name}:`, storageError);
          throw storageError; // Propagate Storage-specific error
        });
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      console.log("All files uploaded, attempting to update document...");
      
      try {
        await docRef.update({ files: uploadedFiles });
        console.log("Document updated with file metadata");
      } catch (updateError) {
        console.warn("Failed to update document with file metadata (data and files still saved):", updateError.message);
        // Since files and initial data are saved, don't alert user about this error
      }
    }

    alert("Submission successful!");
    uploadForm.reset();
    selectedFiles = [];
    fileList.innerHTML = "";
    lastSubmissionTime = now;

  } catch (error) {
    console.error("Submission error:", error.code, error.message);
    if (error.code === 'storage/unauthorized') {
      alert("Error uploading files due to permission issues. Your form data was saved. Please contact support.");
    } else if (error.code === 'permission-denied') {
      alert("Error updating submission data. Your form data and files were saved. Please contact support.");
    } else {
      alert(`Error: ${error.message}`);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "✔ Submit";
  }
});
// Initialize drop zone functionality

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const dropZoneDefault = document.getElementById('dropZoneDefault');
  const fileSelectedView = document.getElementById('fileSelectedView');
  const fileNameDisplay = document.getElementById('fileName');
  const fileSizeDisplay = document.getElementById('fileSize');
  const resetBtn = document.getElementById('resetBtn');

  // Click to trigger file upload
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#resetBtn')) return;
    fileInput.click();
  });

  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  // Drag and drop event listeners
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-active');
    });
  });

  // Handle drop event
  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  // Handle selected file display
  function handleSelectedFile(file) {
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    dropZoneDefault.style.display = 'none';
    fileSelectedView.style.display = 'flex';
  }

  // Reset file selection
  resetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    fileSelectedView.style.display = 'none';
    dropZoneDefault.style.display = 'flex';
  });

  // Helper function to format file size
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
});

document.getElementById("uploadForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const file = document.getElementById("videos_file").files[0];
    const userId = document.getElementById("user-id").value;

    if (!file || !userId) {
        alert("Please select a file and provide a user ID");
        return;
    }

    const originalFileName = file.name;
    const fileExtension = file.name.split(".").pop().toLowerCase();
    const chunkSize = 148 * 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const timestamp = Date.now();

    const checkmarkVideo = document.getElementById("upload_success_video");
    const fileNameElement = document.getElementById("video_file_name");

    document.getElementById("progressContainer").classList.remove("hidden");

    const updateProgress = createProgressBarUpdater(totalChunks, "progressBar");

    for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
        const formData = new FormData();

        formData.append("file", chunk, originalFileName);
        formData.append("file-name", originalFileName);
        formData.append("file-extension", fileExtension);
        formData.append("chunkNumber", i + 1);
        formData.append("totalChunks", totalChunks);
        formData.append("userId", userId);
        formData.append("timestamp", timestamp);

        try {
            const response = await fetch("/api/v1/upload_file", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                console.error("Upload error", result);
                alert(`Error: ${result.message}`);
                return;
            }

            updateProgress();

            if (result.url) {
                document.getElementById("upload_url_video").value = result.url;
                checkmarkVideo.style.display = "block";
                fileNameElement.textContent = originalFileName;
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Error uploading file. Please try again.");
            return;
        }
    }
});

function createProgressBarUpdater(totalChunks, progressBarId) {
    const progressBar = document.getElementById(progressBarId);
    let uploadedChunks = 0;

    return function () {
        uploadedChunks += 1;
        const progress = (uploadedChunks / totalChunks) * 100;
        progressBar.style.width = progress + "%";
    };
}

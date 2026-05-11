const uploadForm = document.getElementById("upload-form");
const receiptForm = document.getElementById("receipt-form");
const statusText = document.getElementById("status");

function setStatus(text, isError = false) {
  statusText.textContent = text;
  statusText.style.color = isError ? "#b00020" : "#1d5f2f";
}

function populateForm(fields = {}) {
  document.getElementById("merchantName").value = fields.merchantName || "";
  document.getElementById("date").value = fields.date || "";
  document.getElementById("totalAmount").value = fields.totalAmount || "";
  document.getElementById("currency").value = fields.currency || "";
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fileInput = document.getElementById("receipt-image");
  if (!fileInput.files || !fileInput.files[0]) {
    setStatus("Please choose a receipt image.", true);
    return;
  }

  const formData = new FormData();
  formData.append("receipt", fileInput.files[0]);
  setStatus("Extracting fields...");

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Extraction failed.");
    }

    populateForm(payload.fields);
    setStatus("Fields extracted. Review and edit before submitting.");
  } catch (error) {
    setStatus(error.message || "Extraction failed.", true);
  }
});

receiptForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(receiptForm).entries());
  const existing = JSON.parse(localStorage.getItem("receiptSubmissions") || "[]");
  existing.push({ ...data, submittedAt: new Date().toISOString() });
  localStorage.setItem("receiptSubmissions", JSON.stringify(existing));
  setStatus("Submitted successfully. Data saved in local storage.");
});

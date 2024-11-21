const fileInput = document.getElementById("file-input");

const createMappingState = (inital) => {
  let mappingState = inital;
  return [
    () => mappingState,
    (val) => {
      if (typeof val === "function") mappingState = val(mappingState);
      mappingState = val;
    },
  ];
};

const [getMappingStateFn, setMappingStateFn] = createMappingState({});

/**
 * MEDCURA:
    Patient Card ID*
    Patient First Name*
    Patient Last Name*
    Patient DOB*
    Gender*
    Patient Address*
    Patient City*
    Patient State*
    Patient Zip Code
    Primary Phone
    Insurance Carrier
    Patient Insurance Card ID
    Care Opportunity
    Patient Barriers
    Care Opportunity Status
    Last Service
    Primary Care Provider Name
    PCP NPI
    Annual Care Visit Date
    Do Not Call
   */

/**
   * DEFAULT: 
  "Medicaid ID",
  "First Name",
  "Last Name",
  "Gender",
  "DOB",
  "Address Line 1",
  "Address Line 2",
  "City",
  "Email",
  "Phone",
  "State",
  "Zipcode",
  "Benefits",
  "Physician NPI",
  "Do Not Call",
  "Last Service",
  "Effective Date",
  "Physician Name",
  "Care Opportunity",
  "Patient Barriers",
  "Member Start Date",
  "Redetermination Date",
  "Annual Care Visit Date",
  "Care Opportunity Status",
  "Patient Insurance Card ID",
  "status",
  "barriers",
   */
const MAPPING_FILEDS = [
  "Patient Card ID",
  "Patient First Name",
  "Patient Last Name",
  "Patient DOB",
  "Gender",
  "Patient Address",
  "Patient City",
  "Patient State",
  "Patient Zip Code",
  "Primary Phone",
  "Insurance Carrier",
  "Patient Insurance Card ID",
  "Care Opportunity",
  "Patient Barriers",
  "Care Opportunity Status",
  "Last Service",
  "Primary Care Provider Name",
  "PCP NPI",
  "Annual Care Visit Date",
  "Do Not Call",
];

function getHeaderRow(sheet) {
  const headers = [];
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let C,
    R = range.s.r; /* start in the first row */
  /* walk every column in the range */
  for (C = range.s.c; C <= range.e.c; ++C) {
    const cell =
      sheet[
        XLSX.utils.encode_cell({ c: C, r: R })
      ]; /* find the cell in the first row */

    let hdr = "UNKNOWN " + C; // <-- replace with your desired default
    if (cell && cell.t) hdr = XLSX.utils.format_cell(cell);

    headers.push(hdr);
  }
  return headers;
}

fileInput.addEventListener("change", (ev) => {
  const reader = new FileReader();
  reader.readAsArrayBuffer(ev.target.files[0]);

  reader.onload = async function (e) {
    const data = new Uint8Array(reader.result);
    const workbook = XLSX.read(data, { type: "array" });
    const ws = workbook.Sheets.Sheet1;
    const headers = getHeaderRow(ws);

    const jsonData = await new Promise((resolve, reject) => {
      Papa.parse(ev.target.files[0], {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        error(error) {
          reject({ errorMsg: error });
        },
        async complete(results) {
          resolve(results);
        },
      });
    });

    //-- CUSTOM MAPPING IF NEEDED --//
    const [h, j] = CUSTOM_MAPPING(headers, jsonData.data);
    //-- CUSTOM MAPPING IF NEEDED --//
    initialise(h, j);
  };
});

function generateJSONDownloadLink(data) {
  const stingified = JSON.stringify(data);
  const blobData = new Blob([stingified], { type: "application/json" });

  const downloadLink = window.URL.createObjectURL(blobData);

  const revokeLink = () => window.URL.revokeObjectURL(downloadLink);

  return [downloadLink, revokeLink];
}

/**
 * @param {Array<String>} headers
 */
function initialise(headers = [], jsonData = []) {
  console.log("INITIALIZING");
  const mainContainer = document.querySelector("main");
  if (mainContainer.children.length > 0) mainContainer.innerHTML = "";

  const form = document.createElement("form");
  form.className = "grid-container";

  form.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    setMappingStateFn(Object.fromEntries(formData));
    const newReMappedData = reMapJsonData(jsonData);

    const worksheet = XLSX.utils.json_to_sheet(newReMappedData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet);

    const downloadBtn = document.createElement("button");

    downloadBtn.innerText = "DOWNLOAD";
    downloadBtn.id = "download-btn";

    const csv = XLSX.utils.sheet_to_csv(worksheet, { strip: true });

    // downloadFile(csv, "my_csv.csv", "text/csv;encoding:utf-8", form);

    downloadBtn.className = "grid-item";
    const existingDownloadBtn = document.getElementById("download-btn");

    if (existingDownloadBtn) mainContainer.removeChild(existingDownloadBtn);
    form.appendChild(downloadBtn);

    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      XLSX.writeFile(workbook, "MAPPED.xlsx", { compression: true });
    });
  };

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Parse and Download";
  submitButton.className = "gird-item";

  MAPPING_FILEDS.forEach((iKey) => {
    const label = document.createElement("label");
    label.innerText = `${iKey}`;
    const select = document.createElement("select");
    select.name = iKey;
    const nullOption = document.createElement("option");
    nullOption.value = "";
    nullOption.text = "NULL";
    select.appendChild(nullOption);
    headers.forEach((header) => {
      const option = document.createElement("option");
      option.value = header;
      option.text = header;
      select.appendChild(option);
    });

    select.setAttribute("name", `${iKey}`);

    label.className = "grid-item";
    select.className = "grid-item";

    form.appendChild(label);
    form.appendChild(select);
  });
  form.appendChild(submitButton);
  mainContainer.appendChild(form);
}

function reMapJsonData(jsonData = []) {
  const mappedData = [];
  jsonData.forEach((data) => {
    let mappedObj = {};

    MAPPING_FILEDS.forEach((key) => {
      if (key === "Patient Barriers")
        mappedObj[key] = data[getMappingStateFn()[key]] ?? "N";
      else mappedObj[key] = data[getMappingStateFn()[key]] ?? null;
    });

    mappedData.push(mappedObj);
  });

  return mappedData;
}

/**
 * @description CUSTOM MAPPING AFTER READING XLSX
 * @param {Array<String>} headers
 * @param {Array<object>} jsonData
 */
function CUSTOM_MAPPING(headers, jsonData) {
  let mHeaders = structuredClone(headers);
  let mJsonData = JSON.parse(JSON.stringify(jsonData));

  /**
  *
    "Physician",
    "Physician Address",
    "First Name",
    "Last Name",
    "Member ID",
    "DOB",
    "Gender",
    "Race / Ethnicity",
    "Language",
    "Phone",
    "Member Address",
    "City",
    "State",
    "Zip",
    "Date of Last Service",
    "Incentive Program",
    "Last EPSDT Visit Date",
    "Missed EPSDT Visits",
    "Care Score",
    "BPDB : Blood Pressure Control for Patients With Diabetes Non-Medicare  .",
    "CDCRB : Comprehensive Diabetes Care Non-Medicare Retired - Non-Medicare HbA1c Test .",
    "EEDB : Eye Exam for Patients with Diabetes Non-Medicare - Non-Medicare Eye Exam .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Control (<8) .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Poor Control (>9) .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Adherence .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Therapy .",
    "Health Plan Name .",
    "Product ."
  *
  **/
  const toDeleteKeys = [
    "Race / Ethnicity",
    "Language",
    "Incentive Program",
    "Last EPSDT Visit Date",
    "Missed EPSDT Visits",
    "Care Score",
    "Health Plan Name .",
    "Product .",
    "BPDB : Blood Pressure Control for Patients With Diabetes Non-Medicare  .",
    "CDCRB : Comprehensive Diabetes Care Non-Medicare Retired - Non-Medicare HbA1c Test .",
    "EEDB : Eye Exam for Patients with Diabetes Non-Medicare - Non-Medicare Eye Exam .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Control (<8) .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Poor Control (>9) .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Adherence .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Therapy .",
  ];

  const toConsolidateKeys = [
    "BPDB : Blood Pressure Control for Patients With Diabetes Non-Medicare  .",
    "CDCRB : Comprehensive Diabetes Care Non-Medicare Retired - Non-Medicare HbA1c Test .",
    "EEDB : Eye Exam for Patients with Diabetes Non-Medicare - Non-Medicare Eye Exam .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Control (<8) .",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Poor Control (>9) .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Adherence .",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Therapy .",
  ];

  const toConsolidateMark = {
    "-": "Closed",
    X: "Open",
  };

  // const toConsolidateKeysMap = {
  //   "BPDB : Blood Pressure Control for Patients With Diabetes Non-Medicare  .":
  //     "BP control (<140/90 mm Hg)",
  //   "CDCRB : Comprehensive Diabetes Care Non-Medicare Retired - Non-Medicare HbA1c Test .":
  //     "Haemoglobin A1c (HbA1c) testing",
  //   "EEDB : Eye Exam for Patients with Diabetes Non-Medicare - Non-Medicare Eye Exam .":
  //     "Eye exam (retinal) performed",
  //   "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Control (<8) .":
  //     "HbA1c control (<8.0%)",
  //   "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Poor Control (>9) .":
  //     "HbA1c poor control (>9.0%)",
  //   "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Adherence .":
  //     "Statin Therapy for Patients With Diabetes Adherence",
  //   "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Therapy .":
  //     "Statin Therapy for Patients With Diabetes Therapy",
  // };

  toDeleteKeys.forEach((dKey) => {
    const dIdx = mHeaders.indexOf(dKey);
    mHeaders.splice(dIdx, 1);
  });

  const toReFormate = ["Phone"];

  let newData = [];
  for (let i = 0; i < mJsonData.length; i++) {
    let modObj = structuredClone(mJsonData[i]);
    if (!modObj["Phone"]) {
      console.log("NO PHONE");
      continue;
    }
    // delete all the consolidating keys
    for (let j = 0; j < toConsolidateKeys.length; j++) {
      const cKey = toConsolidateKeys[j];
      delete modObj[cKey];
    }

    for (let k = 0; k < toConsolidateKeys.length; k++) {
      const cKey = toConsolidateKeys[k];
      modObj = structuredClone(modObj);
      modObj["Care Opportunity"] = cKey;
      modObj["Care Opportunity Status"] =
        toConsolidateMark[mJsonData[i][cKey]] ?? null;
      newData.push(modObj);
    }
  }

  newData = newData.map((nObj) => {
    toReFormate.forEach((fKey) => {
      nObj[fKey] = formatPhoneNumber(nObj[fKey], false);
    });
    return nObj;
  });

  mHeaders.push("Care Opportunity");
  mHeaders.push("Care Opportunity Status");

  return [mHeaders, newData];
}

function formatPhoneNumber(phoneNumberString, randomMask = false) {
  if (randomMask)
    return Math.floor(1000000000 + Math.random() * 9000000000) + "";
  const cleaned = ("" + phoneNumberString).replace(/\D/g, "");
  return cleaned;
}

function downloadFile(content, fileName, mimeType, container) {
  const a = document.createElement("a");
  mimeType = mimeType || "application/octet-stream";
  a.className = "grid-item";
  if (navigator.msSaveBlob) {
    navigator.msSaveBlob(
      new Blob([content], {
        type: mimeType,
      }),
      fileName
    );
  } else if (URL && "download" in a) {
    a.href = URL.createObjectURL(
      new Blob([content], {
        type: mimeType,
      })
    );
    a.setAttribute("download", fileName);
    container.appendChild(a);
    a.click();
    container.removeChild(a);
  } else {
    location.href =
      "data:application/octet-stream," + encodeURIComponent(content); // only this mime type is supported
  }
}

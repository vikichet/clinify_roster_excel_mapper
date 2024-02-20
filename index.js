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

fileInput.addEventListener("change", (e) => {
  const reader = new FileReader();
  reader.readAsArrayBuffer(e.target.files[0]);

  reader.onload = function (e) {
    const data = new Uint8Array(reader.result);
    const workbook = XLSX.read(data, { type: "array" });
    const ws = workbook.Sheets.Sheet1;
    const headers = getHeaderRow(ws);
    const jsonData = XLSX.utils.sheet_to_json(ws);

    //-- CUSTOM MAPPING IF NEEDED --//
    const [h, j] = CUSTOM_MAPPING(headers, jsonData);
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
  console.log({ headers });
  console.log("INITIALIZING");

  const mainContainer = document.querySelector("main");

  if (mainContainer.children.length > 0) mainContainer.innerHTML = "";

  const form = document.createElement("form");

  form.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    setMappingStateFn(Object.fromEntries(formData));
    reMapJsonData(jsonData);
  };

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Parse";

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

    label.style.marginLeft = "10px";
    select.style.marginLeft = "10px";
    select.style.marginBottom = "10px";
    select.style.maxWidth = "100px";
    const br = document.createElement("br");

    form.appendChild(label);
    form.appendChild(select);
    form.appendChild(br);
  });
  form.appendChild(submitButton);
  mainContainer.appendChild(form);
}

function reMapJsonData(jsonData = []) {
  const mappedData = [];
  jsonData.forEach((data) => {
    let mappedObj = {};

    MAPPING_FILEDS.forEach((key) => {
      mappedObj[key] = data[getMappingStateFn()[key]];
    });

    mappedData.push(mappedObj);
  });

  console.log({ mappedData });
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

  const toConsolidateKeysMap = {
    "BPDB : Blood Pressure Control for Patients With Diabetes Non-Medicare  .":
      "BP control (<140/90 mm Hg)",
    "CDCRB : Comprehensive Diabetes Care Non-Medicare Retired - Non-Medicare HbA1c Test .":
      "Haemoglobin A1c (HbA1c) testing",
    "EEDB : Eye Exam for Patients with Diabetes Non-Medicare - Non-Medicare Eye Exam .":
      "Eye exam (retinal) performed",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Control (<8) .":
      "HbA1c control (<8.0%)",
    "HBDB : Hemoglobin A1c Control for Patients With Diabetes Non-Medicare - Non-Medicare HbA1c Poor Control (>9) .":
      "HbA1c poor control (>9.0%)",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Adherence .":
      "Statin Therapy for Patients With Diabetes Adherence",
    "SPD : Statin Therapy for Patients With Diabetes - Non-Medicare Statin Therapy .":
      "Statin Therapy for Patients With Diabetes Therapy",
  };

  toDeleteKeys.forEach((dKey) => {
    const dIdx = mHeaders.indexOf(dKey);
    mHeaders.splice(dIdx, 1);
  });

  let newData = [];

  mJsonData.forEach((jData) => {
    let modObj = { ...jData };

    toConsolidateKeys.forEach((cKey) => {
      delete modObj[cKey];
      modObj["Care Opportunity"] = toConsolidateKeysMap[cKey] ?? null;
      modObj["Care Opportunity Status"] =
        toConsolidateMark[jData[cKey]] ?? null;
    });

    newData.push(modObj);
  });

  console.log(newData);

  return [mHeaders, mJsonData];
}

// let a = {
//   "Foot Examination": null,
//   "HbA1c control (<8.0%)": null,
//   "BP control (<140/90 mm Hg)": null,
//   "HbA1c poor control (>9.0%)": null,
//   "Eye exam (retinal) performed": null,
//   "Breast Cancer Screening (BCS)": null,
//   "Haemoglobin A1c (HbA1c) testing": null,
//   "Controlling High Blood Pressure (CBP)": null,
//   "Statin Therapy for Patients With Diabetes Adherence": null,
//   "Statin Therapy for Patients With Diabetes Therapy": null,
// };

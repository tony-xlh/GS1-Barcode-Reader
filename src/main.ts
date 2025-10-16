import { BarcodeResultItem, CodeParser, CodeParserModule, CoreModule } from "dynamsoft-barcode-reader-bundle";
import { LicenseManager } from "dynamsoft-barcode-reader-bundle";
import { CameraView, CameraEnhancer } from "dynamsoft-barcode-reader-bundle";
import { CaptureVisionRouter } from "dynamsoft-barcode-reader-bundle";
import "./style.css";
// Configures the paths where the .wasm files and other necessary resources for modules are located.
CoreModule.engineResourcePaths.rootDirectory = "https://cdn.jsdelivr.net/npm/";

/** LICENSE ALERT - README
 * To use the library, you need to first specify a license key using the API "initLicense()" as shown below.
 */

LicenseManager.initLicense("DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSJ9");

/**
 * You can visit https://www.dynamsoft.com/customer/license/trialLicense?utm_source=samples&product=dbr&package=js to get your own trial license good for 30 days.
 * Note that if you downloaded this sample from Dynamsoft while logged in, the above license key may already be your own 30-day trial license.
 * For more information, see https://www.dynamsoft.com/barcode-reader/docs/web/programming/javascript/user-guide/index.html?ver=10.4.2001&cVer=true#specify-the-license&utm_source=samples or contact support@dynamsoft.com.
 * LICENSE ALERT - THE END
 */

// Optional. Used to load wasm resources in advance, reducing latency between video playing and barcode decoding.
CoreModule.loadWasm();
// Defined globally for easy debugging.
CodeParserModule.loadSpec("GS1_AI");
let enhancer: CameraEnhancer;
let cvRouter: CaptureVisionRouter;
let interval:any;
let decoding = false;
let parseBarcode = (window as any)["parseBarcode"];
let parser:CodeParser;
let lastBarcodeResults:BarcodeResultItem[]|null = null;
init();

document.getElementById("parserSelect")?.addEventListener("change",function(){
  if (lastBarcodeResults) {
    listResults(lastBarcodeResults);
  }
});

async function init(){
  document.getElementById("status")!.innerText = "Loading...";
  parser = await CodeParser.createInstance();
  cvRouter = await CaptureVisionRouter.createInstance();
  const cameraView = await CameraView.createInstance();
  enhancer = await CameraEnhancer.createInstance(cameraView);
  cameraView.setUIElement(document.getElementById("scanner") as HTMLDivElement);
  enhancer.on("played",function(){
    startDecodingLoop();
  });
  document.getElementById("status")!.innerText = "Ready.";
}

function loadImage(dataURL:string){
  let img = document.getElementById("selectedImg") as HTMLImageElement;
  img.onload = async function(){
    let result = await cvRouter.capture(img,"ReadBarcodes_SpeedFirst");
    listResults(result.decodedBarcodesResult?.barcodeResultItems ?? []);
  }
  img.src = dataURL;
}

async function listResults(results:BarcodeResultItem[]){
  lastBarcodeResults = results;
  const resultsContainer = document.getElementById("results") as HTMLDivElement;
  resultsContainer.innerHTML = "";
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const title = document.createElement("h2");
    title.innerText = "Barcode "+(index+1)+":";
    resultsContainer.appendChild(title);
    const table = await buildBarcodeTable(result);
    resultsContainer.appendChild(table);
  }
}

async function buildBarcodeTable(result:BarcodeResultItem){
  const table = document.createElement("table");
  const items:{key:string,value:any}[] = [];
  items.push({key:"Format",value:result.formatString});
  items.push({key:"Text",value:result.text});
  items.push({key:"Bytes",value:result.bytes});
  try {
    let codeItems;
    codeItems = await parseGS1Barcode(result);
    for (let index = 0; index < codeItems.length; index++) {
      const item = codeItems[index];
      if (typeof(item.data) === "object" && "getYear" in item.data) {
        items.push({key:item.dataTitle,value:item.data.toDateString()});
      }else{
        items.push({key:item.dataTitle,value:item.data});
      }
    }
  } catch (error) {
    console.log(error);
  }
  const headRow = document.createElement("tr");
  const keyTitleCell = document.createElement("th");
  keyTitleCell.innerText = "Key";
  keyTitleCell.style.minWidth = "30vw";
  const valueTitleCell = document.createElement("th");
  valueTitleCell.innerText = "Value";
  headRow.appendChild(keyTitleCell);
  headRow.appendChild(valueTitleCell)
  table.appendChild(headRow);
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const dataRow = document.createElement("tr");
    const keyCell = document.createElement("td");
    keyCell.innerText = item.key;
    const valueCell = document.createElement("td");
    valueCell.innerText = item.value;
    dataRow.appendChild(keyCell);
    dataRow.appendChild(valueCell);
    table.appendChild(dataRow);
  }
  return table;
}

function parseGS1Barcode(result:BarcodeResultItem){
  let selectedEngine = (document.getElementById("parserSelect") as HTMLSelectElement).value;
  if (selectedEngine === "dcp") {
    return parseWithDCP(result);
  }else{
    return parseWithThirdParty(result);
  }
}

async function parseWithDCP(result:BarcodeResultItem){
  let text = result.text;
  let parsedItem = await parser.parse(text);
  const data = JSON.parse(parsedItem.jsonString);
  const items:any[] = [];

  if (data.ResultInfo) {
      (data.ResultInfo as any[]).forEach(item => {
          let ai = item.FieldName || "";
          let description = "";
          let value = "";

          const childFields = item.ChildFields?.[0] || [];
          (childFields as any[]).forEach(field => {
              if (field.FieldName.endsWith("AI")) {
                  ai = field.RawValue || ai;
                  description = field.Value || "";
              } else if (field.FieldName.endsWith("Data")) {
                  value = field.Value || "";
              }
              console.log(field);
          });
          
          items.push({dataTitle:description,data:value});
      });
  }
  return items;
}

async function parseWithThirdParty(result:BarcodeResultItem){
  let text = result.text;
  text = text.replace(/{GS}/g,"|");
  text = text.replace(//g,"|");
  let segments = text.split("|");
  if (result.formatString === "GS1 Composite Code" || (result.formatString.indexOf("GS1 Databar") != -1 &&  result.formatString.indexOf("Expanded") == -1)) {
    segments[0] = "01" + segments[0]; //add application identifier
  }
  console.log(segments);
  let parsedCodeItems:any[] = [];
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const parsedResult = parseBarcode(segment);
    parsedCodeItems = parsedCodeItems.concat(parsedResult["parsedCodeItems"]);
  }
  return parsedCodeItems;
}

function startScan(){
  if (!cvRouter || !enhancer) {
    alert("Please wait for the initialization of Dynamsoft Barcode Reader.");
    return;
  }
  enhancer.open();
}

function stopScan(){
  stopDecodingLoop();
  enhancer.close();
}

function startDecodingLoop(){
  stopDecodingLoop();
  interval = setInterval(captureAndDecode,50);
}

function stopDecodingLoop(){
  clearInterval(interval);
  decoding = false;
}

async function captureAndDecode(){
  if (decoding === true) {
    return;
  }
  if (cvRouter && enhancer) {
    if (enhancer.isOpen() === false) {
      return;
    }
    decoding = true;
    let frame = enhancer.fetchImage();
    let result = await cvRouter.capture(frame,"ReadBarcodes_SpeedFirst");  
    let results = result.decodedBarcodesResult?.barcodeResultItems ?? [];
    if (results.length > 0) {
      let img = document.getElementById("selectedImg") as HTMLImageElement;
      img.onload = function(){};
      img.src = frame.toCanvas().toDataURL();      
      listResults(results);
      stopScan();
    }
    decoding = false;
  }
}

document.getElementById("decodeImageBtn")?.addEventListener("click",async function(){
  if (cvRouter) {
    document.getElementById("imageFile")?.click();
  }else{
    alert("Please wait for the initialization of Dynamsoft Barcode Reader.");
  }
});

document.getElementById("liveScanBtn")?.addEventListener("click",function(){
  startScan();
});

document.getElementById("closeBtn")?.addEventListener("click",function(){
  stopScan();
});

document.getElementById("imageFile")?.addEventListener("change",function(){
  let fileInput = document.getElementById("imageFile") as HTMLInputElement;
  if (fileInput.files && fileInput.files.length>0) {
    let file = fileInput.files[0];
    let fileReader = new FileReader();
    fileReader.onload = function(e){
      loadImage(e.target?.result as string);
    };
    fileReader.onerror = function () {
      console.warn('oops, something went wrong.');
    };
    fileReader.readAsDataURL(file);
  }
});

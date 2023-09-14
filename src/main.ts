import { BarcodeReader, TextResult } from "dynamsoft-javascript-barcode";
import { CameraEnhancer } from "dynamsoft-camera-enhancer";
import "./style.css";

BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.21/dist/";
CameraEnhancer.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@3.3.5/dist/";
let reader:BarcodeReader;
let enhancer:CameraEnhancer;
let interval:any;
let decoding = false;
let parseBarcode = (window as any)["parseBarcode"];
init();

async function init(){
  reader = await BarcodeReader.createInstance();
  enhancer = await CameraEnhancer.createInstance();
  await enhancer.setUIElement(document.getElementById("scanner") as HTMLDivElement);
  enhancer.setVideoFit("cover");
  enhancer.on("played",function(){
    startDecodingLoop();
  });
}

function loadImage(dataURL:string){
  let img = document.getElementById("selectedImg") as HTMLImageElement;
  img.onload = async function(){
    let results = await reader.decode(img);
    listResults(results);
  }
  img.src = dataURL;
}

function listResults(results:TextResult[]){
  const resultsContainer = document.getElementById("results") as HTMLDivElement;
  resultsContainer.innerHTML = "";
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    const title = document.createElement("h2");
    title.innerText = "Barcode "+(index+1)+":";
    resultsContainer.appendChild(title);
    resultsContainer.appendChild(buildBarcodeTable(result));
  }
}

function buildBarcodeTable(result:TextResult){
  const table = document.createElement("table");
  const items:{key:string,value:any}[] = [];
  items.push({key:"Format",value:result.barcodeFormatString});
  items.push({key:"Text",value:result.barcodeText});
  items.push({key:"Bytes",value:result.barcodeBytes});
  try {
    let codeItems;
    codeItems = parseGS1Barcode(result);
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

function parseGS1Barcode(result:TextResult){
  let text = result.barcodeText;
  text = text.replace(/{GS}/g,"|");
  text = text.replace(//g,"|");
  let segments = text.split("|");
  if (result.barcodeFormatString === "GS1 Composite Code" || (result.barcodeFormatString.indexOf("GS1 Databar") != -1 &&  result.barcodeFormatString.indexOf("Expanded") == -1)) {
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
  if (!reader || !enhancer) {
    alert("Please wait for the initialization of Dynamsoft Barcode Reader.");
    return;
  }
  enhancer.open(true);
}

function stopScan(){
  stopDecodingLoop();
  enhancer.close(true);
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
  if (reader && enhancer) {
    if (enhancer.isOpen() === false) {
      return;
    }
    decoding = true;
    let frame = enhancer.getFrame();
    let results = await reader.decode(frame);  
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
  if (reader) {
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

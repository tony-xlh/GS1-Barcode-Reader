import { BarcodeReader, TextResult } from "dynamsoft-javascript-barcode";
import "./style.css";

BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.21/dist/";

let reader:BarcodeReader;
let parseBarcode = (window as any)["parseBarcode"];
init();

async function init(){
  reader = await BarcodeReader.createInstance();
}

function loadImage(dataURL:string){
  let img = document.getElementById("selectedImg") as HTMLImageElement;
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
    const codeItems = parseGS1Barcode(result.barcodeBytes);
    for (let index = 0; index < codeItems.length; index++) {
      const item = codeItems[index];
      items.push({key:item.dataTitle,value:item.data});
    }
  } catch (error) {
    console.log(error);
  }
  const headRow = document.createElement("tr");
  const keyTitleCell = document.createElement("th");
  keyTitleCell.innerText = "Key";
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

function parseGS1Barcode(bytes:number[]){
  let segments = segmentsSplittedByFNC1(bytes);
  console.log(segments);
  let parsedCodeItems:any[] = [];
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const parsedResult = parseBarcode(segment);
    parsedCodeItems = parsedCodeItems.concat(parsedResult["parsedCodeItems"]);
  }
  return parsedCodeItems;
}

function segmentsSplittedByFNC1(bytes:number[]){
  let content = "";
  let segments:string[] = [];
  for (let index = 0; index < bytes.length; index++) {
    const byte = bytes[index];
    if (byte === 29) {
      if (content) {
        segments.push(content);
      }
      content = "";
    }else{
      content = content + String.fromCharCode(byte);
    }
  }
  if (content) {
    segments.push(content);
  }
  return segments;
}

document.getElementById("decodeBtn")?.addEventListener("click",async function(){
  let img = document.getElementById("selectedImg") as HTMLImageElement;
  let results = await reader.decode(img);
  listResults(results);
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

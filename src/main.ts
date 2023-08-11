import { BarcodeReader, TextResult } from "dynamsoft-javascript-barcode";
import "./style.css";

BarcodeReader.license = "DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ==";
BarcodeReader.engineResourcePath = "https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.21/dist/";

let reader:BarcodeReader;

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
    const resultContainer = document.createElement("div");
    let content = "";
    content = "Format:" + result.barcodeFormatString + "\n";
    content = content + "Text:" + result.barcodeText + "\n";
    content = content + "Bytes:" + result.barcodeBytes;
    resultContainer.innerText = content;
    resultsContainer.appendChild(resultContainer);
  }
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

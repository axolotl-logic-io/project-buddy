// A one-pixel PNG; real bytes exercise storage and the model boundary.
import encodedPng from "./pixel.base64?raw";

const PNG_BASE64 = encodedPng.trim();
function pngBytes(): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(PNG_BASE64), (char) => char.charCodeAt(0));
}

export { PNG_BASE64, pngBytes };

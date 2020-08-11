export function supportsOffscreenCanvas(): boolean {
  let canvasObj = document.createElement("canvas");
  return typeof canvasObj.transferControlToOffscreen === "function";
}

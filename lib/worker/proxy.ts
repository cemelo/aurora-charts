export class WorkerProxy implements ProxyHandler<Worker> {
  get(target: Worker, p: PropertyKey, receiver: any): any {
    return function (...args) {
      target.postMessage({ callee: p, args });
    }
  }
}


'use client';

import { FirestorePermissionError } from './errors';

type Listener = (error: FirestorePermissionError) => void;

class ErrorEmitter {
  private listeners: Listener[] = [];

  emit(event: 'permission-error', error: FirestorePermissionError): boolean {
    if (event !== 'permission-error') return false;
    this.listeners.forEach(l => l(error));
    return true;
  }

  on(event: 'permission-error', listener: Listener): this {
    if (event !== 'permission-error') return this;
    this.listeners.push(listener);
    return this;
  }

  removeListener(event: 'permission-error', listener: Listener): this {
    if (event !== 'permission-error') return this;
    this.listeners = this.listeners.filter(l => l !== listener);
    return this;
  }
}

export const errorEmitter = new ErrorEmitter();

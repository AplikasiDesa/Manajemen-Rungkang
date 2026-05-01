'use client';

/**
 * Barrel file untuk Firebase. 
 * Mengekspor hooks dan utilitas tanpa menyertakan inisialisasi langsung 
 * untuk menghindari circular dependencies.
 */
export * from './init';
export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

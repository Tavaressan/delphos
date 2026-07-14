import React from 'react';
import { FileUploadArea } from 'enterprise-rag-frontend';

const noop = () => {};

export function Default() {
  return (
    <div style={{ maxWidth: 480 }}>
      <FileUploadArea onFileSelect={noop} />
    </div>
  );
}

export function Loading() {
  return (
    <div style={{ maxWidth: 480 }}>
      <FileUploadArea onFileSelect={noop} isLoading />
    </div>
  );
}

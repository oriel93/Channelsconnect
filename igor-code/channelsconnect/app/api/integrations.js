// Compatibility layer for integrations
// These were removed as they're base44-specific features

export const InvokeLLM = () => {
  console.warn('InvokeLLM is not available - base44 specific feature');
  return Promise.resolve({ message: 'Feature not implemented' });
};

export const SendEmail = () => {
  console.warn('SendEmail is not available - base44 specific feature');
  return Promise.resolve({ message: 'Feature not implemented' });
};

export const UploadFile = () => {
  console.warn('UploadFile is not available - base44 specific feature');
  return Promise.resolve({ message: 'Feature not implemented' });
};

export const Core = {
  InvokeLLM,
  SendEmail,
  UploadFile,
};


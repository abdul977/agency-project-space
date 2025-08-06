import React from 'react';
import FileUploadIcon from './FileUploadIcon';

const FileUploadTest: React.FC = () => {
  const handleAttachmentsChange = (attachments: any[]) => {
    console.log('Attachments changed:', attachments);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">File Upload Test</h3>
      <div className="flex items-center gap-4">
        <span>Test Input Field:</span>
        <FileUploadIcon
          inputId="test-input-123"
          attachments={[]}
          onAttachmentsChange={handleAttachmentsChange}
        />
      </div>
    </div>
  );
};

export default FileUploadTest;

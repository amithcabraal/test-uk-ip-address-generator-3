import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface IPRange {
  start: string;
  end: string;
  count: number;
}

export const IPRangeProcessor = () => {
  const [ipRanges, setIpRanges] = useState<IPRange[]>([]);
  const [numAddresses, setNumAddresses] = useState<number>(10);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        const ranges = content.data.map((range: string[]) => ({
          start: range[0],
          end: range[1],
          count: parseInt(range[2].replace(/,/g, ''), 10)
        }));
        setIpRanges(ranges);
      } catch (error) {
        alert('Error parsing file. Please ensure it\'s a valid JSON file.');
      }
    };

    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false
  });

  const ipToLong = (ip: string): number => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const longToIp = (long: number): string => {
    return [
      (long >>> 24) & 255,
      (long >>> 16) & 255,
      (long >>> 8) & 255,
      long & 255
    ].join('.');
  };

  const generateRandomIP = (start: string, end: string): string => {
    const startLong = ipToLong(start);
    const endLong = ipToLong(end);
    const randomLong = Math.floor(Math.random() * (endLong - startLong + 1)) + startLong;
    return longToIp(randomLong);
  };

  const generateAndDownloadIPs = () => {
    if (ipRanges.length === 0) {
      alert('Please upload IP ranges first');
      return;
    }

    setLoading(true);
    const generatedSet = new Set<string>();
    const totalRanges = ipRanges.length;
    
    while (generatedSet.size < numAddresses) {
      const rangeIndex = Math.floor(Math.random() * totalRanges);
      const range = ipRanges[rangeIndex];
      const ip = generateRandomIP(range.start, range.end);
      generatedSet.add(ip);
    }

    // Create and download file
    const content = Array.from(generatedSet).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_ips.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
          ${ipRanges.length > 0 ? 'border-green-500' : ''}`}
      >
        <input {...getInputProps()} />
        {ipRanges.length > 0 ? (
          <div>
            <p className="text-green-600 dark:text-green-400 font-medium">
              ✓ Loaded {ipRanges.length} IP ranges
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Drop a new file to replace
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-300">
              {isDragActive
                ? 'Drop the IP ranges file here'
                : 'Drag and drop IP ranges file here, or click to select'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              JSON file format required
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Number of IP addresses to generate
        </label>
        <input
          type="number"
          min="1"
          value={numAddresses}
          onChange={(e) => setNumAddresses(Math.max(1, parseInt(e.target.value) || 1))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <button
        onClick={generateAndDownloadIPs}
        disabled={loading || ipRanges.length === 0}
        className={`mt-4 w-full px-4 py-2 rounded-md text-white font-medium
          ${loading || ipRanges.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
          }
        `}
      >
        {loading ? 'Generating...' : 'Generate and Download IPs'}
      </button>
    </div>
  );
};
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface IPRange {
  start: string;
  end: string;
  count: number;
  country?: string;
  countryCode?: string;
}

interface CSVRow {
  startLong: string;
  endLong: string;
  countryCode: string;
  countryName: string;
}

export const IPRangeProcessor = () => {
  const [ipRanges, setIpRanges] = useState<IPRange[]>([]);
  const [allRanges, setAllRanges] = useState<IPRange[]>([]);
  const [numAddresses, setNumAddresses] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState<'json' | 'csv' | null>(null);
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (fileName.endsWith('.json')) {
          handleJSONFile(content);
        } else if (fileName.endsWith('.csv')) {
          handleCSVFile(content);
        }
      } catch (error) {
        alert('Error parsing file. Please ensure it\'s a valid JSON or CSV file.');
      }
    };

    reader.readAsText(file);
  }, []);

  const handleJSONFile = (content: string) => {
    const data = JSON.parse(content);
    const ranges = data.data.map((range: string[]) => ({
      start: range[0],
      end: range[1],
      count: parseInt(range[2].replace(/,/g, ''), 10)
    }));
    setIpRanges(ranges);
    setAllRanges(ranges);
    setFileType('json');
    setAvailableCountries([]);
    setSelectedCountry('');
  };

  const handleCSVFile = (content: string) => {
    const lines = content.trim().split('\n');
    const csvData: CSVRow[] = [];
    const countriesMap = new Map<string, string>();

    lines.forEach(line => {
      // Remove quotes and split by comma
      const cleanLine = line.replace(/"/g, '');
      const parts = cleanLine.split(',');
      
      if (parts.length >= 4) {
        const [startLong, endLong, countryCode, countryName] = parts;
        csvData.push({
          startLong: startLong.trim(),
          endLong: endLong.trim(),
          countryCode: countryCode.trim(),
          countryName: countryName.trim()
        });
        countriesMap.set(countryCode.trim(), countryName.trim());
      }
    });

    // Convert to IP ranges
    const ranges = csvData.map(row => {
      const startIP = longToIp(parseInt(row.startLong));
      const endIP = longToIp(parseInt(row.endLong));
      const count = parseInt(row.endLong) - parseInt(row.startLong) + 1;
      
      return {
        start: startIP,
        end: endIP,
        count: count,
        country: row.countryName,
        countryCode: row.countryCode
      };
    });

    // Set up countries dropdown
    const countries = Array.from(countriesMap.entries()).map(([code, name]) => ({
      code,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));

    setAllRanges(ranges);
    setAvailableCountries(countries);
    setFileType('csv');
    setSelectedCountry('');
    setIpRanges([]); // Clear until country is selected
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    if (countryCode === '') {
      setIpRanges([]);
    } else {
      const filteredRanges = allRanges.filter(range => range.countryCode === countryCode);
      setIpRanges(filteredRanges);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv']
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
      if (fileType === 'csv' && selectedCountry === '') {
        alert('Please select a country first');
      } else {
        alert('Please upload IP ranges first');
      }
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
    a.download = fileType === 'csv' && selectedCountry 
      ? `generated_ips_${selectedCountry.toLowerCase()}.txt`
      : 'generated_ips.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLoading(false);
  };

  const getStatusMessage = () => {
    if (fileType === 'json' && ipRanges.length > 0) {
      return `✓ Loaded ${ipRanges.length} IP ranges from JSON file`;
    } else if (fileType === 'csv') {
      if (selectedCountry === '') {
        return `✓ Loaded CSV file with ${availableCountries.length} countries. Please select a country.`;
      } else {
        const selectedCountryName = availableCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;
        return `✓ Loaded ${ipRanges.length} IP ranges for ${selectedCountryName}`;
      }
    }
    return null;
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
          ${(ipRanges.length > 0 || fileType === 'csv') ? 'border-green-500' : ''}`}
      >
        <input {...getInputProps()} />
        {fileType ? (
          <div>
            <p className="text-green-600 dark:text-green-400 font-medium">
              {getStatusMessage()}
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
              JSON or CSV file format supported
            </p>
          </div>
        )}
      </div>

      {fileType === 'csv' && availableCountries.length > 0 && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">-- Select a country --</option>
            {availableCountries.map(country => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>
      )}

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
        className={`mt-4 w-full px-4 py-2 rounded-md text-white font-medium transition-colors
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
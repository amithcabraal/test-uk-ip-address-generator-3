import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface IPRange {
  start: string;
  end: string;
  count: number;
  country?: string;
  countryCode?: string;
  geonameId?: string;
}

interface CSVRow {
  startLong: string;
  endLong: string;
  countryCode: string;
  countryName: string;
}

interface MaxMindLocation {
  geonameId: string;
  localeCode: string;
  continentCode: string;
  continentName: string;
  countryIsoCode: string;
  countryName: string;
  isInEuropeanUnion: string;
}

interface MaxMindBlock {
  network: string;
  geonameId: string;
  registeredCountryGeonameId: string;
  representedCountryGeonameId: string;
  isAnonymousProxy: string;
  isSatelliteProvider: string;
  isAnycast: string;
}

interface IPLookupResult {
  ip: string;
  countryCode: string;
  countryName: string;
  found: boolean;
}

export const IPRangeProcessor = () => {
  const [ipRanges, setIpRanges] = useState<IPRange[]>([]);
  const [allRanges, setAllRanges] = useState<IPRange[]>([]);
  const [numAddresses, setNumAddresses] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState<string>('');
  const [fileType, setFileType] = useState<'json' | 'csv' | 'maxmind' | null>(null);
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [maxmindLocations, setMaxmindLocations] = useState<Map<string, MaxMindLocation>>(new Map());
  const [maxmindBlocks, setMaxmindBlocks] = useState<MaxMindBlock[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{locations?: boolean, blocks?: boolean}>({});
  
  // New state for IP lookup feature
  const [mode, setMode] = useState<'generate' | 'lookup'>('generate');
  const [ipLookupText, setIpLookupText] = useState<string>('');
  const [lookupResults, setLookupResults] = useState<IPLookupResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setProcessing(true);
    
    const processFile = async (file: File, index: number) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        const fileName = file.name.toLowerCase();
        
        setProcessingFile(`Processing ${file.name}...`);

        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            
            if (fileName.endsWith('.json')) {
              handleJSONFile(content, file.name);
            } else if (fileName.includes('geolite2-country-locations') || fileName.includes('locations')) {
              handleMaxMindLocationsFile(content, fileName);
            } else if (fileName.includes('geolite2-country-blocks') || fileName.includes('blocks')) {
              handleMaxMindBlocksFile(content, fileName);
            } else if (fileName.endsWith('.csv')) {
              handleCSVFile(content, file.name);
            }
            resolve();
          } catch (error) {
            reject(new Error(`Error parsing file ${file.name}. Please ensure it's a valid file format.`));
          }
        };

        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
        reader.readAsText(file);
      });
    };

    // Process files sequentially
    const processAllFiles = async () => {
      try {
        for (let i = 0; i < acceptedFiles.length; i++) {
          await processFile(acceptedFiles[i], i);
          // Small delay to show processing state
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        alert(error instanceof Error ? error.message : 'An error occurred while processing files');
      } finally {
        setProcessing(false);
        setProcessingFile('');
      }
    };

    processAllFiles();
  }, [maxmindLocations, maxmindBlocks]);

  const handleJSONFile = (content: string, fileName: string) => {
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
    resetMaxMindData();
  };

  const handleCSVFile = (content: string, fileName: string) => {
    const lines = content.trim().split('\n');
    const csvData: CSVRow[] = [];
    const countriesMap = new Map<string, string>();

    lines.forEach(line => {
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

    const countries = Array.from(countriesMap.entries()).map(([code, name]) => ({
      code,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));

    setAllRanges(ranges);
    setAvailableCountries(countries);
    setFileType('csv');
    setSelectedCountry('');
    setIpRanges([]);
    resetMaxMindData();
  };

  const handleMaxMindLocationsFile = (content: string, fileName: string) => {
    const lines = content.trim().split('\n');
    const locationsMap = new Map<string, MaxMindLocation>();
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const parts = parseCSVLine(line);
      if (parts.length >= 6) {
        const location: MaxMindLocation = {
          geonameId: parts[0],
          localeCode: parts[1],
          continentCode: parts[2],
          continentName: parts[3],
          countryIsoCode: parts[4],
          countryName: parts[5],
          isInEuropeanUnion: parts[6] || '0'
        };
        locationsMap.set(location.geonameId, location);
      }
    });

    setMaxmindLocations(locationsMap);
    setUploadedFiles(prev => ({ ...prev, locations: true }));
    
    // If we already have blocks, process the combined data
    if (maxmindBlocks.length > 0) {
      processMaxMindData(locationsMap, maxmindBlocks);
    }
  };

  const handleMaxMindBlocksFile = (content: string, fileName: string) => {
    const lines = content.trim().split('\n');
    const blocks: MaxMindBlock[] = [];
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    dataLines.forEach(line => {
      const parts = parseCSVLine(line);
      if (parts.length >= 3) {
        const block: MaxMindBlock = {
          network: parts[0],
          geonameId: parts[1],
          registeredCountryGeonameId: parts[2],
          representedCountryGeonameId: parts[3] || '',
          isAnonymousProxy: parts[4] || '0',
          isSatelliteProvider: parts[5] || '0',
          isAnycast: parts[6] || '0'
        };
        blocks.push(block);
      }
    });

    setMaxmindBlocks(blocks);
    setUploadedFiles(prev => ({ ...prev, blocks: true }));
    
    // If we already have locations, process the combined data
    if (maxmindLocations.size > 0) {
      processMaxMindData(maxmindLocations, blocks);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const processMaxMindData = (locations: Map<string, MaxMindLocation>, blocks: MaxMindBlock[]) => {
    const ranges: IPRange[] = [];
    const countriesMap = new Map<string, string>();

    blocks.forEach(block => {
      // Use geonameId first, then fall back to registeredCountryGeonameId
      const geonameId = block.geonameId || block.registeredCountryGeonameId;
      const location = locations.get(geonameId);
      
      if (location && location.countryIsoCode) {
        const [network, cidr] = block.network.split('/');
        const cidrNum = parseInt(cidr);
        const networkLong = ipToLong(network);
        const hostBits = 32 - cidrNum;
        const numHosts = Math.pow(2, hostBits);
        const startLong = networkLong;
        const endLong = startLong + numHosts - 1;
        
        const range: IPRange = {
          start: longToIp(startLong),
          end: longToIp(endLong),
          count: numHosts,
          country: location.countryName,
          countryCode: location.countryIsoCode,
          geonameId: geonameId
        };
        
        ranges.push(range);
        countriesMap.set(location.countryIsoCode, location.countryName);
      }
    });

    const countries = Array.from(countriesMap.entries()).map(([code, name]) => ({
      code,
      name
    })).sort((a, b) => a.name.localeCompare(b.name));

    setAllRanges(ranges);
    setAvailableCountries(countries);
    setFileType('maxmind');
    setSelectedCountry('');
    setIpRanges([]);
  };

  const resetMaxMindData = () => {
    setMaxmindLocations(new Map());
    setMaxmindBlocks([]);
    setUploadedFiles({});
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
    multiple: true
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

  const lookupIPCountry = (ip: string): IPLookupResult => {
    const ipLong = ipToLong(ip);
    
    // Search through all ranges to find a match
    for (const range of allRanges) {
      const startLong = ipToLong(range.start);
      const endLong = ipToLong(range.end);
      
      if (ipLong >= startLong && ipLong <= endLong) {
        return {
          ip,
          countryCode: range.countryCode || 'Unknown',
          countryName: range.country || 'Unknown',
          found: true
        };
      }
    }
    
    return {
      ip,
      countryCode: 'Not Found',
      countryName: 'Not Found',
      found: false
    };
  };

  const parseIPAddresses = (text: string): string[] => {
    // Remove quotes and split by newlines, spaces, or commas
    const cleaned = text.replace(/"/g, '');
    const ips = cleaned.split(/[\n\s,]+/).filter(ip => ip.trim() !== '');
    
    // Validate IP addresses
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ips.filter(ip => ipRegex.test(ip.trim())).map(ip => ip.trim());
  };

  const performIPLookup = () => {
    if (!ipLookupText.trim()) {
      alert('Please enter IP addresses to lookup');
      return;
    }

    if (allRanges.length === 0) {
      alert('Please upload country data first');
      return;
    }

    setLookupLoading(true);
    
    const ips = parseIPAddresses(ipLookupText);
    if (ips.length === 0) {
      alert('No valid IP addresses found. Please check your input format.');
      setLookupLoading(false);
      return;
    }

    const results = ips.map(ip => lookupIPCountry(ip));
    setLookupResults(results);
    setLookupLoading(false);
  };

  const downloadLookupResults = () => {
    if (lookupResults.length === 0) return;

    const csvContent = [
      'IP Address,Country Code,Country Name,Found',
      ...lookupResults.map(result => 
        `${result.ip},${result.countryCode},${result.countryName},${result.found ? 'Yes' : 'No'}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ip_lookup_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateAndDownloadIPs = () => {
    if (ipRanges.length === 0) {
      if ((fileType === 'csv' || fileType === 'maxmind') && selectedCountry === '') {
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

    const content = Array.from(generatedSet).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileType === 'csv' || fileType === 'maxmind') && selectedCountry 
      ? `generated_ips_${selectedCountry.toLowerCase()}.txt`
      : 'generated_ips.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setLoading(false);
  };

  const getStatusMessage = () => {
    if (processing) {
      return `🔄 ${processingFile}`;
    }
    
    if (fileType === 'json' && ipRanges.length > 0) {
      return `✅ Loaded ${ipRanges.length} IP ranges from JSON file`;
    } else if (fileType === 'csv') {
      if (selectedCountry === '') {
        return `✅ Loaded CSV file with ${availableCountries.length} countries. Please select a country.`;
      } else {
        const selectedCountryName = availableCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;
        return `✅ Loaded ${ipRanges.length} IP ranges for ${selectedCountryName}`;
      }
    } else if (fileType === 'maxmind') {
      const { locations, blocks } = uploadedFiles;
      if (!locations || !blocks) {
        const missing = [];
        if (!locations) missing.push('GeoLite2-Country-Locations-en.csv');
        if (!blocks) missing.push('GeoLite2-Country-Blocks-IPv4.csv');
        return `⚠️ MaxMind format detected. Please upload: ${missing.join(' and ')}`;
      } else if (selectedCountry === '') {
        return `✅ Loaded MaxMind data with ${availableCountries.length} countries. Please select a country.`;
      } else {
        const selectedCountryName = availableCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;
        return `✅ Loaded ${ipRanges.length} IP ranges for ${selectedCountryName} (MaxMind)`;
      }
    }
    return null;
  };

  const getUploadInstructions = () => {
    if (processing) {
      return processingFile;
    }
    
    if (fileType === 'maxmind') {
      const { locations, blocks } = uploadedFiles;
      if (!locations && !blocks) {
        return 'Drop MaxMind GeoLite2 files here (Locations and Blocks CSV files)';
      } else if (!locations) {
        return 'Drop GeoLite2-Country-Locations-en.csv file here';
      } else if (!blocks) {
        return 'Drop GeoLite2-Country-Blocks-IPv4.csv file here';
      }
    }
    return isDragActive
      ? 'Drop the IP ranges file(s) here'
      : 'Drag and drop IP ranges file(s) here, or click to select';
  };

  const getUploadAreaClasses = () => {
    let classes = `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 `;
    
    if (processing) {
      classes += 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse ';
    } else if (isDragActive) {
      classes += 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ';
    } else if (fileType) {
      classes += 'border-green-500 bg-green-50 dark:bg-green-900/20 ';
    } else {
      classes += 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 ';
    }
    
    return classes;
  };

  const hasCountryData = () => {
    return (fileType === 'csv' || fileType === 'maxmind') && allRanges.length > 0;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-4 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <button
            onClick={() => setMode('generate')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'generate'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Generate IP Addresses
          </button>
          <button
            onClick={() => setMode('lookup')}
            disabled={!hasCountryData()}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'lookup' && hasCountryData()
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : hasCountryData()
                ? 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            Lookup IP Countries
            {!hasCountryData() && (
              <span className="ml-1 text-xs">(requires country data)</span>
            )}
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={getUploadAreaClasses()}
      >
        <input {...getInputProps()} />
        {fileType || processing ? (
          <div>
            {processing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                  {getStatusMessage()}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-green-600 dark:text-green-400 font-medium">
                  {getStatusMessage()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {fileType === 'maxmind' && (!uploadedFiles.locations || !uploadedFiles.blocks)
                    ? getUploadInstructions()
                    : 'Drop new file(s) to replace'
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {getUploadInstructions()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supports: JSON, CSV, or MaxMind GeoLite2 format
            </p>
          </div>
        )}
      </div>

      {mode === 'generate' ? (
        <>
          {/* Country Selection for Generate Mode */}
          {(fileType === 'csv' || fileType === 'maxmind') && availableCountries.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={processing}
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

          {/* Number of Addresses Input */}
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
              disabled={processing}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateAndDownloadIPs}
            disabled={loading || processing || ipRanges.length === 0}
            className={`mt-4 w-full px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2
              ${loading || processing || ipRanges.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg transform hover:scale-[1.02]'
              }
            `}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <span>Generate and Download IPs</span>
            )}
          </button>
        </>
      ) : (
        <>
          {/* IP Lookup Mode */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IP Addresses to Lookup
            </label>
            <textarea
              value={ipLookupText}
              onChange={(e) => setIpLookupText(e.target.value)}
              placeholder="Enter IP addresses separated by newlines, spaces, or commas.&#10;Examples:&#10;192.168.1.1&#10;10.0.0.1, 172.16.0.1&#10;&quot;8.8.8.8&quot; &quot;8.8.4.4&quot;"
              className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-vertical"
              disabled={processing || !hasCountryData()}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Supports newline, space, or comma separated IP addresses with optional quotes
            </p>
          </div>

          {/* Lookup Button */}
          <button
            onClick={performIPLookup}
            disabled={lookupLoading || processing || !hasCountryData() || !ipLookupText.trim()}
            className={`mt-4 w-full px-4 py-2 rounded-md text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2
              ${lookupLoading || processing || !hasCountryData() || !ipLookupText.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 hover:shadow-lg transform hover:scale-[1.02]'
              }
            `}
          >
            {lookupLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Looking up...</span>
              </>
            ) : (
              <span>Lookup IP Countries</span>
            )}
          </button>

          {/* Lookup Results */}
          {lookupResults.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Lookup Results ({lookupResults.length} IPs)
                </h3>
                <button
                  onClick={downloadLookupResults}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Download CSV
                </button>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Country Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Country Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {lookupResults.map((result, index) => (
                        <tr key={index} className={result.found ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                            {result.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {result.countryCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {result.countryName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {result.found ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Found
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                Not Found
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Found: {lookupResults.filter(r => r.found).length} | 
                  Not Found: {lookupResults.filter(r => !r.found).length}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
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

export const IPRangeProcessor = () => {
  const [ipRanges, setIpRanges] = useState<IPRange[]>([]);
  const [allRanges, setAllRanges] = useState<IPRange[]>([]);
  const [numAddresses, setNumAddresses] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [fileType, setFileType] = useState<'json' | 'csv' | 'maxmind' | null>(null);
  const [availableCountries, setAvailableCountries] = useState<Array<{code: string, name: string}>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [maxmindLocations, setMaxmindLocations] = useState<Map<string, MaxMindLocation>>(new Map());
  const [maxmindBlocks, setMaxmindBlocks] = useState<MaxMindBlock[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<{locations?: boolean, blocks?: boolean}>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      const fileName = file.name.toLowerCase();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          if (fileName.endsWith('.json')) {
            handleJSONFile(content);
          } else if (fileName.includes('geolite2-country-locations') || fileName.includes('locations')) {
            handleMaxMindLocationsFile(content, fileName);
          } else if (fileName.includes('geolite2-country-blocks') || fileName.includes('blocks')) {
            handleMaxMindBlocksFile(content, fileName);
          } else if (fileName.endsWith('.csv')) {
            handleCSVFile(content);
          }
        } catch (error) {
          alert(`Error parsing file ${file.name}. Please ensure it's a valid file format.`);
        }
      };

      reader.readAsText(file);
    });
  }, [maxmindLocations, maxmindBlocks]);

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
    resetMaxMindData();
  };

  const handleCSVFile = (content: string) => {
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
    if (fileType === 'json' && ipRanges.length > 0) {
      return `✓ Loaded ${ipRanges.length} IP ranges from JSON file`;
    } else if (fileType === 'csv') {
      if (selectedCountry === '') {
        return `✓ Loaded CSV file with ${availableCountries.length} countries. Please select a country.`;
      } else {
        const selectedCountryName = availableCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;
        return `✓ Loaded ${ipRanges.length} IP ranges for ${selectedCountryName}`;
      }
    } else if (fileType === 'maxmind') {
      const { locations, blocks } = uploadedFiles;
      if (!locations || !blocks) {
        const missing = [];
        if (!locations) missing.push('GeoLite2-Country-Locations-en.csv');
        if (!blocks) missing.push('GeoLite2-Country-Blocks-IPv4.csv');
        return `⚠️ MaxMind format detected. Please upload: ${missing.join(' and ')}`;
      } else if (selectedCountry === '') {
        return `✓ Loaded MaxMind data with ${availableCountries.length} countries. Please select a country.`;
      } else {
        const selectedCountryName = availableCountries.find(c => c.code === selectedCountry)?.name || selectedCountry;
        return `✓ Loaded ${ipRanges.length} IP ranges for ${selectedCountryName} (MaxMind)`;
      }
    }
    return null;
  };

  const getUploadInstructions = () => {
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600'
          }
          ${(ipRanges.length > 0 || fileType) ? 'border-green-500' : ''}`}
      >
        <input {...getInputProps()} />
        {fileType ? (
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
        ) : (
          <div>
            <p className="text-gray-600 dark:text-gray-300">
              {getUploadInstructions()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Supports: JSON, CSV, or MaxMind GeoLite2 format
            </p>
          </div>
        )}
      </div>

      {(fileType === 'csv' || fileType === 'maxmind') && availableCountries.length > 0 && (
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